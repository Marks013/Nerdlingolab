"use server";

import { InventoryLedgerType, ProductStatus } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { execFile } from "node:child_process";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { promisify } from "node:util";
import { z } from "zod";

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
const restockVariantSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Informe uma quantidade maior que zero.").max(100_000),
  reason: z.string().trim().max(180).optional(),
  variantId: z.string().min(1)
});

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
          categories: {
            create: productInput.categoryIdsArray.map((categoryId) => ({
              categoryId
            }))
          },
          variants: {
            create: productInput.variantsArray.map((variant) => ({
              barcode: variant.barcode,
              compareAtPriceCents: variant.compareAtPriceCents,
              heightCm: variant.heightCm,
              isActive: variant.isActive,
              lengthCm: variant.lengthCm,
              optionValues: variant.optionValues,
              priceCents: variant.priceCents,
              shippingLeadTimeDays: variant.shippingLeadTimeDays,
              sku: variant.sku,
              stockQuantity: variant.stockQuantity,
              trackInventory: variant.trackInventory,
              title: variant.title,
              weightGrams: variant.weightGrams,
              widthCm: variant.widthCm
            }))
          }
        },
        include: {
          variants: true
        }
      });

      for (const variant of product.variants) {
        if (!variant.trackInventory || variant.stockQuantity <= 0) {
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
      urls: collectProductMediaUrls(productInput)
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
          categoryId: productInput.categoryId ?? null,
          categories: {
            deleteMany: {},
            create: productInput.categoryIdsArray.map((categoryId) => ({
              categoryId
            }))
          }
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
              heightCm: variant.heightCm ?? null,
              isActive: variant.isActive,
              lengthCm: variant.lengthCm ?? null,
              optionValues: variant.optionValues,
              priceCents: variant.priceCents,
              shippingLeadTimeDays: variant.shippingLeadTimeDays ?? null,
              stockQuantity: variant.stockQuantity,
              trackInventory: variant.trackInventory,
              title: variant.title,
              weightGrams: variant.weightGrams ?? null,
              widthCm: variant.widthCm ?? null
            }
          });
          continue;
        }

        await tx.productVariant.create({
          data: {
            barcode: variant.barcode,
            compareAtPriceCents: variant.compareAtPriceCents,
            heightCm: variant.heightCm,
            isActive: variant.isActive,
            lengthCm: variant.lengthCm,
            optionValues: variant.optionValues,
            priceCents: variant.priceCents,
            productId,
            shippingLeadTimeDays: variant.shippingLeadTimeDays,
            sku: variant.sku,
            stockQuantity: variant.stockQuantity,
            trackInventory: variant.trackInventory,
            title: variant.title,
            weightGrams: variant.weightGrams,
            widthCm: variant.widthCm
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
      urls: collectProductMediaUrls(productInput)
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível atualizar o produto.");
  }

  revalidateCatalogPaths();
  revalidatePath(`/admin/produtos/${productId}/editar`);
}

export async function restockProductVariant(formData: FormData): Promise<void> {
  await requireAdmin();

  const variantId = z.string().min(1).parse(formData.get("restockVariantId"));
  const parsed = restockVariantSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get(`restockQuantity:${variantId}`),
    reason: formData.get(`restockReason:${variantId}`),
    variantId
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Abastecimento invalido.");
  }

  const reason = parsed.data.reason || "Abastecimento manual de estoque";

  try {
    await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        select: {
          id: true,
          productId: true,
          stockQuantity: true,
          title: true,
          trackInventory: true
        },
        where: {
          id: parsed.data.variantId,
          productId: parsed.data.productId
        }
      });

      if (!variant) {
        throw new Error("Variação não encontrada para abastecer.");
      }

      if (!variant.trackInventory) {
        throw new Error("Ative o controle de estoque desta variação antes de abastecer.");
      }

      const updatedVariant = await tx.productVariant.update({
        data: {
          stockQuantity: {
            increment: parsed.data.quantity
          }
        },
        where: { id: variant.id }
      });

      await tx.inventoryLedger.create({
        data: {
          productId: variant.productId,
          variantId: variant.id,
          type: InventoryLedgerType.ADJUSTMENT,
          quantityDelta: parsed.data.quantity,
          quantityAfter: updatedVariant.stockQuantity,
          reason
        }
      });
    });
  } catch (error) {
    Sentry.captureException(error);
    throw error instanceof Error ? error : new Error("Não foi possível abastecer a variação.");
  }

  revalidateCatalogPaths();
  revalidatePath(`/admin/produtos/${parsed.data.productId}/editar`);
  redirect(`/admin/produtos/${parsed.data.productId}/editar?notice=${encodeURIComponent(`Estoque abastecido: +${parsed.data.quantity} unidade(s).`)}`);
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

export async function assignProductToCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedInput = z.object({
    categoryId: z.string().min(1),
    productId: z.string().min(1)
  }).parse({
    categoryId: formData.get("categoryId"),
    productId: formData.get("productId")
  });

  const product = await prisma.product.findUnique({
    select: { categoryId: true },
    where: { id: parsedInput.productId }
  });

  await prisma.product.update({
    data: {
      categoryId: product?.categoryId ? undefined : parsedInput.categoryId,
      categories: {
        connectOrCreate: {
          create: { categoryId: parsedInput.categoryId },
          where: {
            productId_categoryId: {
              categoryId: parsedInput.categoryId,
              productId: parsedInput.productId
            }
          }
        }
      }
    },
    where: { id: parsedInput.productId }
  });

  revalidateCatalogPaths();
  revalidatePath("/admin/categorias");
}

export async function removeProductFromCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedInput = z.object({
    categoryId: z.string().min(1),
    productId: z.string().min(1)
  }).parse({
    categoryId: formData.get("categoryId"),
    productId: formData.get("productId")
  });

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      select: {
        categoryId: true,
        categories: {
          select: { categoryId: true },
          where: {
            categoryId: {
              not: parsedInput.categoryId
            }
          },
          take: 1
        }
      },
      where: { id: parsedInput.productId }
    });
    const nextPrimaryCategoryId = product?.categoryId === parsedInput.categoryId
      ? product.categories[0]?.categoryId ?? null
      : product?.categoryId;

    await tx.product.update({
      data: {
        categoryId: nextPrimaryCategoryId,
        categories: {
          deleteMany: {
            categoryId: parsedInput.categoryId
          }
        }
      },
      where: { id: parsedInput.productId }
    });
  });

  revalidateCatalogPaths();
  revalidatePath("/admin/categorias");
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

function formValuesToProductInput(formData: FormData): Record<string, unknown> {
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    categoryIds: formData.getAll("categoryIds").join(","),
    brand: formData.get("brand"),
    tags: formData.get("tags"),
    metafields: formData.get("metafields"),
    imageUrls: formData.get("imageUrls"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    sku: formData.get("sku"),
    stockQuantity: formData.get("stockQuantity"),
    trackInventory: formData.get("trackInventory") === "on",
    variants: formData.get("variants"),
    status: formData.get("status")
  };
}

function revalidateCatalogPaths(): void {
  revalidatePath("/admin/produtos");
  revalidatePath("/ofertas");
  revalidatePath("/produtos");
}

async function internalizeProductInputImages<T extends { imagesArray: string[] }>(productInput: T): Promise<T> {
  return {
    ...productInput,
    imagesArray: await internalizeExternalMediaUrls(productInput.imagesArray, "PRODUCT")
  };
}

function collectProductMediaUrls(productInput: {
  description: string;
  imagesArray: string[];
  variantsArray: Array<{ optionValues: Record<string, string> }>;
}): string[] {
  return Array.from(
    new Set([
      ...productInput.imagesArray,
      ...extractHtmlMediaUrls(productInput.description),
      ...productInput.variantsArray
        .map((variant) => variant.optionValues._imageUrl)
        .filter((url): url is string => Boolean(url))
    ])
  );
}

function extractHtmlMediaUrls(html: string): string[] {
  return Array.from(html.matchAll(/\s(?:src|href)=["']([^"']+)["']/gi))
    .map((match) => match[1]?.trim())
    .filter((url): url is string => Boolean(url) && !url.startsWith("data:") && !url.startsWith("javascript:"));
}
