import { CouponType, ProductStatus, type Coupon } from "@prisma/client";

import type { ProductListItem } from "@/lib/catalog/queries";
import { prisma } from "@/lib/prisma";

export type PublicOfferCoupon = Pick<
  Coupon,
  "code" | "type" | "value" | "minSubtotalCents" | "maxDiscountCents" | "expiresAt"
>;

export interface PublicOffers {
  coupons: PublicOfferCoupon[];
  products: ProductListItem[];
}

export async function getPublicOffers(): Promise<PublicOffers> {
  const now = new Date();
  const [coupons, products] = await Promise.all([
    prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }]
          }
        ]
      },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      select: {
        code: true,
        expiresAt: true,
        maxDiscountCents: true,
        minSubtotalCents: true,
        type: true,
        usageLimit: true,
        usedCount: true,
        value: true
      },
      take: 12
    }),
    prisma.product.findMany({
      where: {
        compareAtPriceCents: {
          not: null
        },
        status: ProductStatus.ACTIVE,
        variants: {
          some: {
            isActive: true,
            stockQuantity: {
              gt: 0
            }
          }
        },
        OR: [{ categoryId: null }, { category: { isActive: true } }]
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 4
    })
  ]);

  return {
    coupons: coupons
      .filter((coupon) => !coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
      .slice(0, 3),
    products: products.filter(
      (product) =>
        product.compareAtPriceCents !== null &&
        product.compareAtPriceCents > product.priceCents
    )
  };
}

export function formatPublicCouponBenefit(coupon: PublicOfferCoupon): string {
  if (coupon.type === CouponType.PERCENTAGE) {
    return `${coupon.value}% de desconto`;
  }

  if (coupon.type === CouponType.FIXED_AMOUNT) {
    return `${formatCouponCents(coupon.value)} de desconto`;
  }

  return "Frete grátis";
}

function formatCouponCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(cents / 100);
}
