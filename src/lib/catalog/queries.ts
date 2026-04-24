import { ProductStatus, type Category, type Product, type ProductVariant } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProductListItem = Product & {
  category: Category | null;
  variants: ProductVariant[];
};

export async function getAdminCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }]
  });
}

export async function getAdminProducts(): Promise<ProductListItem[]> {
  return prisma.product.findMany({
    include: {
      category: true,
      variants: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getAdminProductById(id: string): Promise<ProductListItem | null> {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: true
    }
  });
}

export async function getPublicProducts(): Promise<ProductListItem[]> {
  return prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      variants: {
        some: {
          isActive: true,
          stockQuantity: {
            gt: 0
          }
        }
      }
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { publishedAt: "desc" }
  });
}

export async function getPublicProductBySlug(slug: string): Promise<ProductListItem | null> {
  return prisma.product.findFirst({
    where: {
      slug,
      status: ProductStatus.ACTIVE
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}
