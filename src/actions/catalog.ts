"use server";

import { InventoryLedgerType, ProductStatus } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { execFile } from "node:child_process";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { promisify } from "node:util";

import {
  categoryFormSchema,
  normalizeCategoryInput,
  normalizeProductInput,
  productFormSchema
} from "@/features/catalog/schemas";
import { requireAdmin } from "@/lib/admin";
import { internalizeExternalMediaUrls } from "@/lib/media/import-external";
import { deleteUnusedMediaAssets, syncMediaUsages } from "@/lib/media/assets";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

export async function createCategory(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedInput = categoryFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    isActive: formData.get("isActive") === "on"
  });

  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Categoria invalida.");
  }

  const categoryInput = normalizeCategoryInput(parsedInput.data);

  try {
    await prisma.category.create({
      data: categoryInput
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível criar a categoria.");
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/produtos");
}

export async function createProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedInput = productFormSchema.safeParse(formValuesToProductInput(formData));

  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Produto invalido.");
  }

  const productInput = await internalizeProductInputImages(normalizeProductInput(parsedInput.data));

  let createdProductId = "";

  try {
    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title: productInput.title,
          slug: productInput.slug,
          description: productInput.description,
          shortDescription: productInput.shortDescription,
          status: productInput.status,
          brand: productInput.brand,
          tags: productInput.tagsArray,
          images: productInput.imagesArray,
          metafields: productInput.metafieldsObject,
          priceCents: productInput.priceCents,
          compareAtPriceCents: productInput.compareAtPriceCents,
          publishedAt: productInput.status === ProductStatus.ACTIVE ? new Date() : null,
          categoryId: productInput.categoryId,
          variants: {
            create: productInput.variantsArray.map((variant) => ({
              barcode: variant.barcode,
              compareAtPriceCents: variant.compareAtPriceCents,
              isActive: variant.isActive,
              optionValues: variant.optionValues,
              priceCents: variant.priceCents,
              sku: variant.sku,
              stockQuantity: variant.stockQuantity,
              title: variant.title,
              weightGrams: variant.weightGrams
            }))
          }
        },
        include: {
          variants: true
        }
      });

      for (const variant of product.variants) {
        if (variant.stockQuantity <= 0) {
          continue;
        }

        await tx.inventoryLedger.create({
          data: {
            productId: product.id,
            variantId: variant.id,
            type: InventoryLedgerType.INITIAL,
            quantityDelta: variant.stockQuantity,
            quantityAfter: variant.stockQuantity,
            reason: `Cadastro inicial de estoque (${variant.title})`
          }
        });
      }

      return product;
    });

    createdProductId = createdProduct.id;
    await syncMediaUsages({
      fieldName: "images",
      ownerId: createdProduct.id,
      ownerType: "PRODUCT",
      productId: createdProduct.id,
      urls: productInput.imagesArray
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível criar o produto.");
  }

  revalidateCatalogPaths();
  redirect(`/admin/produtos/${createdProductId}/editar`);
}

export async function updateProduct(productId: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedInput = productFormSchema.safeParse(formValuesToProductInput(formData));

  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Produto invalido.");
  }

  const productInput = await internalizeProductInputImages(normalizeProductInput(parsedInput.data));

  try {
    await prisma.$transaction(async (tx) => {
      const currentVariants = await tx.productVariant.findMany({
        where: { productId },
        orderBy: { createdAt: "asc" }
      });
      const currentVariantBySku = new Map(currentVariants.map((variant) => [variant.sku, variant]));
      const incomingSkus = new Set(productInput.variantsArray.map((variant) => variant.sku));

      await tx.product.update({
        where: { id: productId },
        data: {
          title: productInput.title,
          slug: productInput.slug,
          description: productInput.description,
          shortDescription: productInput.shortDescription,
          status: productInput.status,
          brand: productInput.brand,
          tags: productInput.tagsArray,
          images: productInput.imagesArray,
          metafields: productInput.metafieldsObject,
          priceCents: productInput.priceCents,
          compareAtPriceCents: productInput.compareAtPriceCents ?? null,
          publishedAt: productInput.status === ProductStatus.ACTIVE ? new Date() : null,
          categoryId: productInput.categoryId ?? null
        }
      });

      for (const variant of productInput.variantsArray) {
        const currentVariant = currentVariantBySku.get(variant.sku);

        if (currentVariant) {
          await tx.productVariant.update({
            where: { id: currentVariant.id },
            data: {
              barcode: variant.barcode ?? null,
              compareAtPriceCents: variant.compareAtPriceCents ?? null,
              isActive: variant.isActive,
              optionValues: variant.optionValues,
              priceCents: variant.priceCents,
              stockQuantity: variant.stockQuantity,
              title: variant.title,
              weightGrams: variant.weightGrams ?? null
            }
          });
          continue;
        }

        await tx.productVariant.create({
          data: {
            barcode: variant.barcode,
            compareAtPriceCents: variant.compareAtPriceCents,
            isActive: variant.isActive,
            optionValues: variant.optionValues,
            priceCents: variant.priceCents,
            productId,
            sku: variant.sku,
            stockQuantity: variant.stockQuantity,
            title: variant.title,
            weightGrams: variant.weightGrams
          }
        });
      }

      const variantsToDisable = currentVariants.filter((variant) => !incomingSkus.has(variant.sku));

      if (variantsToDisable.length > 0) {
        await tx.productVariant.updateMany({
          where: {
            id: {
              in: variantsToDisable.map((variant) => variant.id)
            }
          },
          data: {
            isActive: false
          }
        });
      }

    });

    await syncMediaUsages({
      fieldName: "images",
      ownerId: productId,
      ownerType: "PRODUCT",
      productId,
      urls: productInput.imagesArray
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível atualizar o produto.");
  }

  revalidateCatalogPaths();
  revalidatePath(`/admin/produtos/${productId}/editar`);
}

export async function archiveProduct(productId: string): Promise<void> {
  await requireAdmin();

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.ARCHIVED,
        publishedAt: null
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível arquivar o produto.");
  }

  revalidateCatalogPaths();
}

export async function deleteProduct(productId: string): Promise<void> {
  await requireAdmin();

  try {
    const product = await prisma.product.findUnique({
      select: {
        _count: {
          select: { orderItems: true }
        },
        mediaUsages: {
          select: { assetId: true }
        }
      },
      where: { id: productId }
    });

    if (!product) {
      return;
    }

    if (product._count.orderItems > 0) {
      await archiveProduct(productId);
      return;
    }

    const assetIds = product.mediaUsages.map((usage) => usage.assetId);

    await prisma.product.delete({ where: { id: productId } });
    await deleteUnusedMediaAssets(assetIds);
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível excluir o produto.");
  }

  revalidateCatalogPaths();
}

export async function syncShopifyProductsFromCsv(): Promise<void> {
  await requireAdmin();

  try {
    await execFileAsync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "import:shopify"], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024 * 8,
      timeout: 120_000
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível sincronizar o CSV da Shopify. Verifique DATABASE_URL e SHOPIFY_PRODUCTS_CSV.");
  }

  revalidateCatalogPaths();
  revalidatePath("/admin/produtos");
}

function formValuesToProductInput(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    brand: formData.get("brand"),
    tags: formData.get("tags"),
    metafields: formData.get("metafields"),
    imageUrls: formData.get("imageUrls"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    sku: formData.get("sku"),
    stockQuantity: formData.get("stockQuantity"),
    variants: formData.get("variants"),
    status: formData.get("status")
  };
}

function revalidateCatalogPaths(): void {
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}

async function internalizeProductInputImages<T extends { imagesArray: string[] }>(productInput: T): Promise<T> {
  return {
    ...productInput,
    imagesArray: await internalizeExternalMediaUrls(productInput.imagesArray, "PRODUCT")
  };
}
