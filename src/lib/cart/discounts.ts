import { CouponType, type Coupon } from "@/generated/prisma/client";

import type { CartValidationResponse } from "@/features/cart/types";
import { getLoyaltyProgramSettings } from "@/lib/loyalty/settings";
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
      isAvailable: false,
      maxRedeemablePoints: 0,
      minRedeemPoints: 0,
      redeemCentsPerPoint: 1,
      message: "Entre na conta para usar Nerdcoins."
    };
  }

  const loyaltyPoints = await prisma.loyaltyPoints.findUnique({
    where: { userId }
  });
  const availablePoints = loyaltyPoints?.balance ?? 0;
  const settings = await getLoyaltyProgramSettings();

  if (!settings.isEnabled) {
    return {
      availablePoints,
      requestedPoints,
      redeemedPoints: 0,
      discountCents: 0,
      isAvailable: false,
      maxRedeemablePoints: 0,
      minRedeemPoints: settings.minRedeemPoints,
      redeemCentsPerPoint: settings.redeemCentsPerPoint,
      message: "Programa de fidelidade indisponível no momento."
    };
  }

  const safeRequestedPoints = Math.max(0, Math.floor(requestedPoints));
  const configuredMaxPoints = settings.maxRedeemPoints ?? availablePoints;
  const valueLimitedPoints = Math.floor(subtotalAfterCouponCents / settings.redeemCentsPerPoint);
  const maxRedeemablePoints = Math.min(availablePoints, configuredMaxPoints, valueLimitedPoints);
  const redeemedPoints = Math.min(safeRequestedPoints, maxRedeemablePoints);
  const meetsMinimum = redeemedPoints === 0 || redeemedPoints >= settings.minRedeemPoints;
  const message = getLoyaltyMessage({
    maxRedeemablePoints,
    minRedeemPoints: settings.minRedeemPoints,
    redeemedPoints: meetsMinimum ? redeemedPoints : 0,
    requestedPoints: safeRequestedPoints
  });

  return {
    availablePoints,
    requestedPoints: safeRequestedPoints,
    redeemedPoints: meetsMinimum ? redeemedPoints : 0,
    discountCents: meetsMinimum ? redeemedPoints * settings.redeemCentsPerPoint : 0,
    isAvailable: true,
    maxRedeemablePoints,
    minRedeemPoints: settings.minRedeemPoints,
    redeemCentsPerPoint: settings.redeemCentsPerPoint,
    message
  };
}

function getLoyaltyMessage({
  maxRedeemablePoints,
  minRedeemPoints,
  redeemedPoints,
  requestedPoints
}: {
  maxRedeemablePoints: number;
  minRedeemPoints: number;
  redeemedPoints: number;
  requestedPoints: number;
}): string | null {
  if (requestedPoints <= 0) {
    return null;
  }

  if (maxRedeemablePoints < minRedeemPoints) {
    return "Saldo ou subtotal abaixo do mínimo para resgate.";
  }

  if (redeemedPoints === 0) {
    return `Use pelo menos ${minRedeemPoints} Nerdcoins.`;
  }

  if (redeemedPoints < requestedPoints) {
    return `Aplicamos ${redeemedPoints} Nerdcoins, o máximo permitido para este carrinho.`;
  }

  return `${redeemedPoints} Nerdcoins aplicados.`;
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
