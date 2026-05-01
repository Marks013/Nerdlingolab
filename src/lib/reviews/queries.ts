import type {
  MediaAsset,
  Coupon,
  Order,
  Product,
  ProductReview,
  ProductReviewMedia,
  ProductVariant,
  User
} from "@/generated/prisma/client";
import { ProductReviewStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getProductReviewSettings } from "@/lib/reviews/settings";

export type PublishedProductReview = ProductReview & {
  media: (ProductReviewMedia & { asset: MediaAsset })[];
  user: Pick<User, "name" | "email" | "image">;
  variant: Pick<ProductVariant, "title" | "optionValues"> | null;
};

export type ProductReviewSummary = {
  averageRating: number;
  count: number;
};

export type AdminProductReview = ProductReview & {
  media: (ProductReviewMedia & { asset: MediaAsset })[];
  order: Pick<Order, "id" | "orderNumber" | "createdAt">;
  product: Pick<Product, "id" | "title" | "slug">;
  rewardCoupon: Pick<Coupon, "id" | "code" | "value"> | null;
  user: Pick<User, "id" | "name" | "email">;
  variant: Pick<ProductVariant, "title" | "optionValues"> | null;
};

export async function getPublishedProductReviews(productId: string): Promise<{
  reviews: PublishedProductReview[];
  summary: ProductReviewSummary;
}> {
  const [reviews, aggregate] = await Promise.all([
    prisma.productReview.findMany({
      include: {
        media: {
          include: {
            asset: true
          },
          orderBy: { sortOrder: "asc" }
        },
        user: {
          select: {
            email: true,
            image: true,
            name: true
          }
        },
        variant: {
          select: {
            optionValues: true,
            title: true
          }
        }
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      where: {
        productId,
        publicConsent: true,
        status: ProductReviewStatus.PUBLISHED
      }
    }),
    prisma.productReview.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
      where: {
        productId,
        publicConsent: true,
        status: ProductReviewStatus.PUBLISHED
      }
    })
  ]);

  return {
    reviews,
    summary: {
      averageRating: aggregate._avg.rating ?? 0,
      count: aggregate._count._all
    }
  };
}

export async function getAdminProductReviewDashboard(): Promise<{
  reviews: AdminProductReview[];
  settings: Awaited<ReturnType<typeof getProductReviewSettings>>;
}> {
  const [settings, reviews] = await Promise.all([
    getProductReviewSettings(),
    prisma.productReview.findMany({
      include: {
        media: {
          include: {
            asset: true
          },
          orderBy: { sortOrder: "asc" }
        },
        order: {
          select: {
            createdAt: true,
            id: true,
            orderNumber: true
          }
        },
        product: {
          select: {
            id: true,
            slug: true,
            title: true
          }
        },
        rewardCoupon: {
          select: {
            code: true,
            id: true,
            value: true
          }
        },
        user: {
          select: {
            email: true,
            id: true,
            name: true
          }
        },
        variant: {
          select: {
            optionValues: true,
            title: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    })
  ]);

  return {
    reviews,
    settings
  };
}
