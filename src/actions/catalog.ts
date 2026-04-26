"use server";

import { InventoryLedgerType, ProductStatus } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  categoryFormSchema,
  normalizeCategoryInput,
  normalizeProductInput,
  productFormSchema
} from "@/features/catalog/schemas";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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

  const productInput = normalizeProductInput(parsedInput.data);

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

  const productInput = normalizeProductInput(parsedInput.data);

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

function formValuesToProductInput(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    brand: formData.get("brand"),
    tags: formData.get("tags"),
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
