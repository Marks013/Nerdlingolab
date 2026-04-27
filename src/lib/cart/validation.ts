import { ProductStatus } from "@/generated/prisma/client";

import { getPrimaryImageUrl } from "@/features/catalog/image-utils";
import type {
  CartValidationRequest,
  CartValidationRequestItem,
  CartValidationResponse,
  ValidatedCartItem
} from "@/features/cart/types";
import { validateCoupon, validateLoyaltyRedemption } from "@/lib/cart/discounts";
import { prisma } from "@/lib/prisma";
import { defaultFreeShippingThresholdCents, selectShippingOption } from "@/lib/shipping/quotes";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export async function validateCartItems(
  request: CartValidationRequest
): Promise<CartValidationResponse> {
  const normalizedItems = normalizeRequestedItems(request.items);

  if (normalizedItems.length === 0) {
    return buildEmptyCartResponse(request);
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      id: {
        in: normalizedItems.map((item) => item.variantId)
      },
      isActive: true,
      product: {
        status: ProductStatus.ACTIVE
      }
    },
    include: {
      product: true
    }
  });

  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const validatedItems: ValidatedCartItem[] = [];
  const removedItems: string[] = [];

  for (const requestedItem of normalizedItems) {
    const variant = variantById.get(requestedItem.variantId);
    const availableStock = variant ? Math.max(0, variant.stockQuantity - variant.reservedQuantity) : 0;

    if (!variant || availableStock <= 0) {
      removedItems.push(requestedItem.variantId);
      continue;
    }

    const quantity = Math.min(requestedItem.quantity, availableStock);
    const unitPriceCents = variant.priceCents;

    validatedItems.push({
      productId: variant.productId,
      variantId: variant.id,
      slug: variant.product.slug,
      title: variant.product.title,
      variantTitle: variant.title,
      imageUrl: getPrimaryImageUrl(variant.product.images),
      unitPriceCents,
      quantity,
      lineTotalCents: unitPriceCents * quantity,
      availableStock
    });
  }

  const subtotalCents = validatedItems.reduce((total, item) => total + item.lineTotalCents, 0);
  const itemCount = validatedItems.reduce((total, item) => total + item.quantity, 0);
  const couponPreview = await validateCoupon({
    couponCode: request.couponCode,
    subtotalCents,
    userId: request.userId
  });
  const loyaltyPreview = await validateLoyaltyRedemption({
    userId: request.userId,
    requestedPoints: request.loyaltyPointsToRedeem ?? 0,
    subtotalAfterCouponCents: Math.max(0, subtotalCents - couponPreview.discountCents)
  });
  const totalCents = Math.max(
    0,
    subtotalCents - couponPreview.discountCents - loyaltyPreview.discountCents
  );
  const theme = await getStorefrontTheme();
  const shippingQuote = selectShippingOption({
    freeShippingThresholdCents: theme.freeShippingThresholdCents,
    itemCount,
    postalCode: request.shippingPostalCode,
    selectedOptionId: request.shippingOptionId,
    subtotalCents
  });
  const shippingCents = shippingQuote.selectedOption?.priceCents ?? 0;

  return {
    items: validatedItems,
    removedItems,
    subtotalCents,
    couponDiscountCents: couponPreview.discountCents,
    loyaltyDiscountCents: loyaltyPreview.discountCents,
    shippingCents,
    freeShippingThresholdCents: theme.freeShippingThresholdCents,
    totalCents: totalCents + shippingCents,
    itemCount,
    appliedCoupon: couponPreview.coupon
      ? {
          id: couponPreview.coupon.id,
          code: couponPreview.coupon.code,
          discountCents: couponPreview.discountCents
        }
      : null,
    selectedShippingOption: shippingQuote.selectedOption,
    shippingOptions: shippingQuote.options,
    couponMessage: couponPreview.message,
    loyalty: loyaltyPreview
  };
}

function buildEmptyCartResponse(request: CartValidationRequest): CartValidationResponse {
  return {
    items: [],
    removedItems: [],
    subtotalCents: 0,
    couponDiscountCents: 0,
    loyaltyDiscountCents: 0,
    shippingCents: 0,
    freeShippingThresholdCents: defaultFreeShippingThresholdCents,
    totalCents: 0,
    itemCount: 0,
    appliedCoupon: null,
    selectedShippingOption: null,
    shippingOptions: [],
    couponMessage: request.couponCode ? "Adicione produtos antes de aplicar cupom." : null,
    loyalty: {
      availablePoints: 0,
      requestedPoints: request.loyaltyPointsToRedeem ?? 0,
      redeemedPoints: 0,
      discountCents: 0,
      isAvailable: false,
      maxRedeemablePoints: 0,
      minRedeemPoints: 0,
      redeemCentsPerPoint: 1,
      message: null
    }
  };
}

function normalizeRequestedItems(
  requestedItems: CartValidationRequestItem[]
): CartValidationRequestItem[] {
  const quantityByVariantId = new Map<string, number>();

  for (const item of requestedItems) {
    if (!item.variantId || item.quantity <= 0) {
      continue;
    }

    quantityByVariantId.set(
      item.variantId,
      (quantityByVariantId.get(item.variantId) ?? 0) + Math.floor(item.quantity)
    );
  }

  return Array.from(quantityByVariantId.entries()).map(([variantId, quantity]) => ({
    variantId,
    quantity
  }));
}
