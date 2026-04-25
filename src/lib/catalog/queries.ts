import { ProductStatus, type Category, type Prisma, type Product, type ProductVariant } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const publicProductSorts = ["recentes", "menor-valor", "maior-valor", "nome"] as const;

export type PublicProductSort = (typeof publicProductSorts)[number];

export interface PublicProductFilters {
  categorySlug?: string;
  query?: string;
  sort?: PublicProductSort;
}

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

export async function getPublicCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    where: {
      isActive: true,
      products: {
        some: getPublicProductWhere()
      }
    },
    orderBy: [{ position: "asc" }, { name: "asc" }]
  });
}

export async function getPublicProducts(filters: PublicProductFilters = {}): Promise<ProductListItem[]> {
  return prisma.product.findMany({
    where: getPublicProductWhere(filters),
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: getPublicProductOrderBy(filters.sort)
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

export async function getPublicProductRecommendations({
  categoryId,
  productId,
  take = 4
}: {
  categoryId: string | null;
  productId: string;
  take?: number;
}): Promise<ProductListItem[]> {
  const baseWhere: Prisma.ProductWhereInput = {
    AND: [
      getPublicProductWhere(),
      {
        id: {
          not: productId
        }
      }
    ]
  };
  const include = {
    category: true,
    variants: {
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    }
  } satisfies Prisma.ProductInclude;

  const sameCategoryProducts = categoryId
    ? await prisma.product.findMany({
        where: {
          AND: [
            baseWhere,
            {
              categoryId
            }
          ]
        },
        include,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take
      })
    : [];

  if (sameCategoryProducts.length >= take) {
    return sameCategoryProducts;
  }

  const fallbackProducts = await prisma.product.findMany({
    where: {
      AND: [
        baseWhere,
        {
          id: {
            notIn: [productId, ...sameCategoryProducts.map((product) => product.id)]
          }
        }
      ]
    },
    include,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: take - sameCategoryProducts.length
  });

  return [...sameCategoryProducts, ...fallbackProducts];
}

function getPublicProductWhere(filters: PublicProductFilters = {}): Prisma.ProductWhereInput {
  const query = filters.query?.trim();
  const conditions: Prisma.ProductWhereInput[] = [
    {
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
    {
      OR: [{ categoryId: null }, { category: { isActive: true } }]
    }
  ];

  if (filters.categorySlug) {
    conditions.push({
      category: {
        isActive: true,
        slug: filters.categorySlug
      }
    });
  }

  if (query) {
    conditions.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } }
      ]
    });
  }

  return { AND: conditions };
}

function getPublicProductOrderBy(sort: PublicProductSort = "recentes"): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "menor-valor") {
    return [{ priceCents: "asc" }, { title: "asc" }];
  }

  if (sort === "maior-valor") {
    return [{ priceCents: "desc" }, { title: "asc" }];
  }

  if (sort === "nome") {
    return [{ title: "asc" }];
  }

  return [{ publishedAt: "desc" }, { createdAt: "desc" }];
}
