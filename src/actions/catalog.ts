"use server";

import { InventoryLedgerType, ProductStatus } from "@prisma/client";
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
            create: {
              title: "Padrao",
              sku: productInput.sku,
              priceCents: productInput.priceCents,
              compareAtPriceCents: productInput.compareAtPriceCents,
              stockQuantity: productInput.stockQuantity,
              isActive: true
            }
          }
        },
        include: {
          variants: true
        }
      });

      if (productInput.stockQuantity > 0) {
        await tx.inventoryLedger.create({
          data: {
            productId: product.id,
            variantId: product.variants[0]?.id,
            type: InventoryLedgerType.INITIAL,
            quantityDelta: productInput.stockQuantity,
            quantityAfter: productInput.stockQuantity,
            reason: "Cadastro inicial de estoque"
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
      const currentVariant = await tx.productVariant.findFirst({
        where: { productId },
        orderBy: { createdAt: "asc" }
      });

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

      if (currentVariant) {
        await tx.productVariant.update({
          where: { id: currentVariant.id },
          data: {
            sku: productInput.sku,
            priceCents: productInput.priceCents,
            compareAtPriceCents: productInput.compareAtPriceCents ?? null,
            stockQuantity: productInput.stockQuantity
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
    status: formData.get("status")
  };
}

function revalidateCatalogPaths(): void {
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}
