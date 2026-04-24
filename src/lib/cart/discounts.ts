import { CouponType, type Coupon } from "@prisma/client";

import type { CartValidationResponse } from "@/features/cart/types";
import { prisma } from "@/lib/prisma";

export async function validateCoupon({
  couponCode,
  subtotalCents,
  userId
}: {
  couponCode?: string;
  subtotalCents: number;
  userId?: string;
}): Promise<{ coupon: Coupon | null; discountCents: number; message: string | null }> {
  const normalizedCouponCode = couponCode?.trim().toUpperCase();

  if (!normalizedCouponCode) {
    return { coupon: null, discountCents: 0, message: null };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCouponCode }
  });

  if (!coupon || !coupon.isActive) {
    return { coupon: null, discountCents: 0, message: "Cupom invalido ou inativo." };
  }

  const invalidMessage = await getCouponInvalidMessage({ coupon, subtotalCents, userId });

  if (invalidMessage) {
    return { coupon: null, discountCents: 0, message: invalidMessage };
  }

  return {
    coupon,
    discountCents: calculateCouponDiscount(coupon, subtotalCents),
    message: "Cupom aplicado."
  };
}

export async function validateLoyaltyRedemption({
  userId,
  requestedPoints,
  subtotalAfterCouponCents
}: {
  userId?: string;
  requestedPoints: number;
  subtotalAfterCouponCents: number;
}): Promise<CartValidationResponse["loyalty"]> {
  if (!userId) {
    return {
      availablePoints: 0,
      requestedPoints,
      redeemedPoints: 0,
      discountCents: 0,
      isAvailable: false
    };
  }

  const loyaltyPoints = await prisma.loyaltyPoints.findUnique({
    where: { userId }
  });
  const availablePoints = loyaltyPoints?.balance ?? 0;
  const safeRequestedPoints = Math.max(0, Math.floor(requestedPoints));
  const maxRedeemablePoints = Math.min(availablePoints, subtotalAfterCouponCents);
  const redeemedPoints = Math.min(safeRequestedPoints, maxRedeemablePoints);

  return {
    availablePoints,
    requestedPoints: safeRequestedPoints,
    redeemedPoints,
    discountCents: redeemedPoints,
    isAvailable: true
  };
}

async function getCouponInvalidMessage({
  coupon,
  subtotalCents,
  userId
}: {
  coupon: Coupon;
  subtotalCents: number;
  userId?: string;
}): Promise<string | null> {
  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    return "Cupom ainda não está disponível.";
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return "Cupom expirado.";
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return "Limite de uso do cupom atingido.";
  }

  if (coupon.minSubtotalCents && subtotalCents < coupon.minSubtotalCents) {
    return "Subtotal mínimo do cupom não atingido.";
  }

  return validateCouponCustomerLimit({ coupon, userId });
}

async function validateCouponCustomerLimit({
  coupon,
  userId
}: {
  coupon: Coupon;
  userId?: string;
}): Promise<string | null> {
  if (!coupon.perCustomerLimit || !userId) {
    return null;
  }

  const customerRedemptionCount = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      userId
    }
  });

  return customerRedemptionCount >= coupon.perCustomerLimit
    ? "Cupom ja utilizado por este cliente."
    : null;
}

function calculateCouponDiscount(coupon: Coupon, subtotalCents: number): number {
  if (coupon.type === CouponType.FREE_SHIPPING) {
    return 0;
  }

  const rawDiscount =
    coupon.type === CouponType.PERCENTAGE
      ? Math.floor((subtotalCents * coupon.value) / 100)
      : coupon.value;
  const cappedDiscount = coupon.maxDiscountCents
    ? Math.min(rawDiscount, coupon.maxDiscountCents)
    : rawDiscount;

  return Math.min(subtotalCents, Math.max(0, cappedDiscount));
}
