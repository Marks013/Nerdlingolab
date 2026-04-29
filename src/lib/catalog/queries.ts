import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  type Category,
  type Product,
  type ProductVariant
} from "@/generated/prisma/client";
import type {
  ProductInclude,
  ProductOrderByWithRelationInput,
  ProductWhereInput
} from "@/generated/prisma/models/Product";

import {
  fallbackCategories,
  fallbackProducts,
  shouldUseCatalogFallback
} from "@/lib/catalog/fallback";
import { prisma } from "@/lib/prisma";

export const publicProductSorts = ["recentes", "menor-valor", "maior-valor", "nome"] as const;

export type PublicProductSort = (typeof publicProductSorts)[number];

export interface PublicProductFilters {
  categorySlug?: string;
  maxPriceCents?: number;
  minPriceCents?: number;
  query?: string;
  sort?: PublicProductSort;
  tags?: string[];
}

export interface AdminProductFilters {
  categoryId?: string;
  query?: string;
  status?: ProductStatus;
}

export type ProductListItem = Product & {
  category: Category | null;
  variants: ProductVariant[];
};

export type CategoryProductListItem = Product & {
  variants: ProductVariant[];
};

export type AdminCategoryManagerItem = Category & {
  _count: {
    children: number;
    products: number;
  };
  products: CategoryProductListItem[];
};

export async function getAdminCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }]
  });
}

export async function getAdminCategoryManagerData(): Promise<AdminCategoryManagerItem[]> {
  return prisma.category.findMany({
    include: {
      _count: {
        select: {
          children: true,
          products: true
        }
      },
      products: {
        include: {
          variants: true
        },
        orderBy: { title: "asc" },
        take: 30
      }
    },
    orderBy: [{ position: "asc" }, { name: "asc" }]
  });
}

export async function getAdminProducts(filters: AdminProductFilters = {}): Promise<ProductListItem[]> {
  return prisma.product.findMany({
    include: {
      category: true,
      variants: true
    },
    where: getAdminProductWhere(filters),
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
  try {
    return await prisma.category.findMany({
      where: {
        isActive: true,
        products: {
          some: getPublicProductWhere()
        }
      },
      orderBy: [{ position: "asc" }, { name: "asc" }]
    });
  } catch (error) {
    if (shouldUseCatalogFallback(error)) {
      return fallbackCategories;
    }

    throw error;
  }
}

export async function getPublicProducts(filters: PublicProductFilters = {}): Promise<ProductListItem[]> {
  try {
    return await prisma.product.findMany({
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
  } catch (error) {
    if (shouldUseCatalogFallback(error)) {
      return filterFallbackProducts(filters);
    }

    throw error;
  }
}

export async function getPublicBestSellingProducts(take = 6): Promise<ProductListItem[]> {
  try {
    const rankedItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      orderBy: {
        _sum: {
          quantity: "desc"
        }
      },
      where: {
        order: {
          paymentStatus: PaymentStatus.APPROVED,
          status: {
            in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
          }
        },
        product: getPublicProductWhere()
      },
      _sum: {
        quantity: true
      },
      take
    });
    const productIds = rankedItems.map((item) => item.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...getPublicProductWhere()
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    return productIds
      .map((productId) => productById.get(productId))
      .filter((product): product is ProductListItem => Boolean(product));
  } catch (error) {
    if (shouldUseCatalogFallback(error)) {
      return [];
    }

    throw error;
  }
}

export async function getPublicNewProducts(take = 6, now = new Date()): Promise<ProductListItem[]> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    return await prisma.product.findMany({
      where: {
        AND: [
          getPublicProductWhere(),
          {
            createdAt: {
              gte: thirtyDaysAgo,
              lte: now
            }
          }
        ]
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ createdAt: "desc" }, { publishedAt: "desc" }, { title: "asc" }],
      take
    });
  } catch (error) {
    if (shouldUseCatalogFallback(error)) {
      return filterFallbackProducts({ sort: "recentes" }).slice(0, take);
    }

    throw error;
  }
}

export async function getPublicProductBySlug(slug: string): Promise<ProductListItem | null> {
  try {
    return await prisma.product.findFirst({
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
  } catch (error) {
    if (shouldUseCatalogFallback(error)) {
      return fallbackProducts.find((product) => product.slug === slug) ?? fallbackProducts[0] ?? null;
    }

    throw error;
  }
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
  const baseWhere: ProductWhereInput = {
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
  } satisfies ProductInclude;

  let sameCategoryProducts: ProductListItem[];

  try {
    sameCategoryProducts = categoryId
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
  } catch (error) {
    if (shouldUseCatalogFallback(error)) {
      return fallbackProducts.filter((product) => product.id !== productId).slice(0, take);
    }

    throw error;
  }

  if (sameCategoryProducts.length >= take) {
    return sameCategoryProducts;
  }

  const additionalProducts = await prisma.product.findMany({
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

  return [...sameCategoryProducts, ...additionalProducts];
}

function getPublicProductWhere(filters: PublicProductFilters = {}): ProductWhereInput {
  const query = filters.query?.trim();
  const conditions: ProductWhereInput[] = [
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

  if (filters.tags?.length) {
    conditions.push({
      tags: {
        hasEvery: filters.tags
      }
    });
  }

  if (filters.minPriceCents !== undefined || filters.maxPriceCents !== undefined) {
    conditions.push({
      variants: {
        some: {
          isActive: true,
          priceCents: {
            gte: filters.minPriceCents,
            lte: filters.maxPriceCents
          }
        }
      }
    });
  }

  return { AND: conditions };
}

function getAdminProductWhere(filters: AdminProductFilters): ProductWhereInput {
  const conditions: ProductWhereInput[] = [];
  const query = filters.query?.trim();

  if (filters.status) {
    conditions.push({ status: filters.status });
  }

  if (filters.categoryId) {
    conditions.push({ categoryId: filters.categoryId });
  }

  if (query) {
    conditions.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
        {
          mediaUsages: {
            some: {
              asset: {
                OR: [
                  { fileName: { contains: query, mode: "insensitive" } },
                  { objectKey: { contains: query, mode: "insensitive" } },
                  { originalUrl: { contains: query, mode: "insensitive" } },
                  { url: { contains: query, mode: "insensitive" } }
                ]
              }
            }
          }
        },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: query, mode: "insensitive" } },
                { title: { contains: query, mode: "insensitive" } }
              ]
            }
          }
        }
      ]
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function getPublicProductOrderBy(sort: PublicProductSort = "recentes"): ProductOrderByWithRelationInput[] {
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

function filterFallbackProducts(filters: PublicProductFilters): ProductListItem[] {
  const query = filters.query?.toLowerCase();

  return fallbackProducts
    .filter((product) => {
      const matchesQuery = query
        ? [product.title, product.shortDescription, product.description, product.brand]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(query))
        : true;
      const matchesCategory = filters.categorySlug
        ? product.category?.slug === filters.categorySlug
        : true;
      const matchesMinPrice = filters.minPriceCents !== undefined
        ? product.priceCents >= filters.minPriceCents
        : true;
      const matchesMaxPrice = filters.maxPriceCents !== undefined
        ? product.priceCents <= filters.maxPriceCents
        : true;

      return matchesQuery && matchesCategory && matchesMinPrice && matchesMaxPrice;
    })
    .sort((a, b) => {
      if (filters.sort === "menor-valor") {
        return a.priceCents - b.priceCents;
      }

      if (filters.sort === "maior-valor") {
        return b.priceCents - a.priceCents;
      }

      if (filters.sort === "nome") {
        return a.title.localeCompare(b.title);
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}
