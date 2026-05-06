import {
  CouponType,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  type Coupon
} from "@/generated/prisma/client";

import { WELCOME_COUPON_CODE } from "@/lib/account/welcome-coupon";
import {
  fallbackProducts,
  shouldUseCatalogFallback
} from "@/lib/catalog/fallback";
import type { ProductListItem } from "@/lib/catalog/queries";
import { prisma } from "@/lib/prisma";

export type PublicOfferCoupon = Pick<
  Coupon,
  | "assignedUserId"
  | "code"
  | "expiresAt"
  | "id"
  | "isPublic"
  | "maxDiscountCents"
  | "minSubtotalCents"
  | "perCustomerLimit"
  | "showOnOffers"
  | "type"
  | "value"
>;

export interface PublicOffers {
  coupons: PublicOfferCoupon[];
  products: ProductListItem[];
}

export interface PublicOffersOptions {
  couponLimit?: number;
  onlyHighlightedCoupons?: boolean;
  productLimit?: number;
  userId?: string;
}

export async function getPublicOffers({
  couponLimit = 3,
  onlyHighlightedCoupons = false,
  productLimit = 4,
  userId
}: PublicOffersOptions = {}): Promise<PublicOffers> {
  const now = new Date();
  let coupons: Array<PublicOfferCoupon & { usageLimit: number | null; usedCount: number }>;
  let products: ProductListItem[];

  try {
    [coupons, products] = await Promise.all([
      prisma.coupon.findMany({
        where: {
          isActive: true,
          isPublic: true,
          ...(onlyHighlightedCoupons ? { showOnOffers: true } : {}),
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [
            {
              OR: [{ expiresAt: null }, { expiresAt: { gte: now } }]
            }
          ]
        },
        orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
        select: {
          assignedUserId: true,
          code: true,
          expiresAt: true,
          id: true,
          isPublic: true,
          maxDiscountCents: true,
          minSubtotalCents: true,
          perCustomerLimit: true,
          showOnOffers: true,
          type: true,
          usageLimit: true,
          usedCount: true,
          value: true
        },
        take: Math.max(couponLimit * 4, 12)
      }),
      prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          variants: {
            some: {
              isActive: true,
              stockQuantity: {
                gt: 0
              }
            }
          },
          AND: [
            {
              OR: [
                { compareAtPriceCents: { not: null } },
                { tags: { hasSome: ["oferta", "ofertas", "promo", "promocao", "promoção"] } },
                {
                  category: {
                    OR: [
                      { name: { contains: "oferta", mode: "insensitive" } },
                      { slug: { in: ["oferta", "ofertas", "promocoes", "promoções"] } }
                    ]
                  }
                },
                {
                  categories: {
                    some: {
                      category: {
                        OR: [
                          { name: { contains: "oferta", mode: "insensitive" } },
                          { slug: { in: ["oferta", "ofertas", "promocoes", "promoções"] } }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          ],
          OR: [
            { categoryId: null },
            { category: { isActive: true } },
            {
              categories: {
                some: {
                  category: { isActive: true }
                }
              }
            }
          ]
        },
        include: {
          category: true,
          categories: {
            include: { category: true }
          },
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: productLimit
      })
    ]);
  } catch (error) {
    if (!shouldUseCatalogFallback(error)) {
      throw error;
    }

    coupons = [];
    products = fallbackProducts.slice(0, 4);
  }

  const activeCoupons = coupons.filter(
    (coupon) => !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
  );
  const eligibleCoupons = await filterEligiblePublicCoupons(activeCoupons, userId);

  return {
    coupons: eligibleCoupons.slice(0, couponLimit),
    products: products.filter(isPublicOfferProduct)
  };
}

function isPublicOfferProduct(product: ProductListItem): boolean {
  const hasPriceOffer = Boolean(
    product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents
  );

  return (
    hasPriceOffer ||
    isOfferCategory(product.category) ||
    product.categories.some((productCategory) => isOfferCategory(productCategory.category)) ||
    hasOfferTag(product.tags)
  );
}

function isOfferCategory(category: ProductListItem["category"]): boolean {
  if (!category) {
    return false;
  }

  const categoryName = normalizeOfferText(category.name);
  const categorySlug = normalizeOfferText(category.slug);

  return categoryName.includes("oferta") || ["oferta", "ofertas", "promocao", "promocoes"].includes(categorySlug);
}

function hasOfferTag(tags: string[]): boolean {
  return tags.some((tag) => {
    const normalizedTag = normalizeOfferText(tag);

    return ["oferta", "ofertas", "promo", "promocao", "promocoes"].includes(normalizedTag);
  });
}

function normalizeOfferText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

async function filterEligiblePublicCoupons<
  TCoupon extends PublicOfferCoupon & { usageLimit: number | null; usedCount: number }
>(coupons: TCoupon[], userId?: string): Promise<TCoupon[]> {
  if (coupons.length === 0) {
    return [];
  }

  const visibleToVisitor = coupons.filter(
    (coupon) => !coupon.assignedUserId || coupon.assignedUserId === userId
  );

  if (visibleToVisitor.length === 0) {
    return [];
  }

  if (!userId) {
    return visibleToVisitor.filter(
      (coupon) => !coupon.assignedUserId && coupon.code.toUpperCase() !== WELCOME_COUPON_CODE
    );
  }

  const [redemptions, previousPaidOrderCount] = await Promise.all([
    prisma.couponRedemption.findMany({
      where: {
        couponId: { in: visibleToVisitor.map((coupon) => coupon.id) },
        userId
      },
      select: { couponId: true }
    }),
    prisma.order.count({
      where: {
        userId,
        OR: [
          { paymentStatus: PaymentStatus.APPROVED },
          {
            status: {
              in: [
                OrderStatus.PAID,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED
              ]
            }
          }
        ]
      }
    })
  ]);
  const redemptionCountByCouponId = new Map<string, number>();

  for (const redemption of redemptions) {
    redemptionCountByCouponId.set(
      redemption.couponId,
      (redemptionCountByCouponId.get(redemption.couponId) ?? 0) + 1
    );
  }

  return visibleToVisitor.filter((coupon) => {
    if (coupon.code.toUpperCase() === WELCOME_COUPON_CODE && previousPaidOrderCount > 0) {
      return false;
    }

    if (!coupon.perCustomerLimit) {
      return true;
    }

    return (redemptionCountByCouponId.get(coupon.id) ?? 0) < coupon.perCustomerLimit;
  });
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
