import { CouponType, type Coupon } from "@/generated/prisma/client";

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
    return { coupon: null, discountCents: 0, message: "Cupom inválido ou inativo." };
  }

  if (coupon.assignedUserId && coupon.assignedUserId !== userId) {
    return { coupon: null, discountCents: 0, message: "Entre na conta correta para usar este cupom." };
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
  if (!coupon.perCustomerLimit) {
    return null;
  }

  if (!userId) {
    return "Entre na conta para usar este cupom.";
  }

  const customerRedemptionCount = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      userId
    }
  });

  return customerRedemptionCount >= coupon.perCustomerLimit
    ? "Cupom já utilizado por este cliente."
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
