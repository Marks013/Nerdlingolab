import { LoyaltyLedgerType, LoyaltyTier } from "@prisma/client";

import type { PaidOrder, TransactionClient } from "@/lib/payments/mercadopago-webhook";

export async function registerOrderLoyaltyLedger(
  tx: TransactionClient,
  order: PaidOrder
): Promise<void> {
  if (!order.userId) {
    return;
  }

  const currentPoints = await tx.loyaltyPoints.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId },
    update: {}
  });
  const earnedPoints = calculateEarnedPoints(order.totalCents);
  const nextBalance = currentPoints.balance - order.loyaltyPointsRedeemed + earnedPoints;
  const nextTier = calculateTier(currentPoints.tierOrderCount + 1);

  await registerRedeemedPoints(tx, order, currentPoints.balance);
  await registerEarnedPoints(tx, order, currentPoints.balance - order.loyaltyPointsRedeemed, earnedPoints, nextTier);

  await tx.loyaltyPoints.update({
    where: { userId: order.userId },
    data: {
      balance: nextBalance,
      lifetimeEarned: { increment: earnedPoints },
      lifetimeRedeemed: { increment: order.loyaltyPointsRedeemed },
      tierOrderCount: { increment: 1 },
      tierSpendCents: { increment: order.totalCents },
      tier: nextTier,
      tierUpdatedAt: new Date()
    }
  });

  await tx.order.update({
    where: { id: order.id },
    data: { loyaltyPointsEarned: earnedPoints }
  });
}

async function registerRedeemedPoints(
  tx: TransactionClient,
  order: PaidOrder,
  startingBalance: number
): Promise<void> {
  if (order.loyaltyPointsRedeemed <= 0 || !order.userId) {
    return;
  }

  await tx.loyaltyLedger.upsert({
    where: { idempotencyKey: `loyalty:redeem:${order.id}` },
    create: {
      userId: order.userId,
      orderId: order.id,
      type: LoyaltyLedgerType.REDEEM,
      pointsDelta: -order.loyaltyPointsRedeemed,
      balanceAfter: startingBalance - order.loyaltyPointsRedeemed,
      reason: `Resgate no pedido ${order.orderNumber}`,
      idempotencyKey: `loyalty:redeem:${order.id}`
    },
    update: {}
  });
}

async function registerEarnedPoints(
  tx: TransactionClient,
  order: PaidOrder,
  balanceAfterRedemption: number,
  earnedPoints: number,
  nextTier: LoyaltyTier
): Promise<void> {
  if (earnedPoints <= 0 || !order.userId) {
    return;
  }

  await tx.loyaltyLedger.upsert({
    where: { idempotencyKey: `loyalty:earn:${order.id}` },
    create: {
      userId: order.userId,
      orderId: order.id,
      type: LoyaltyLedgerType.EARN,
      pointsDelta: earnedPoints,
      balanceAfter: balanceAfterRedemption + earnedPoints,
      tierAfter: nextTier,
      reason: `Cashback do pedido ${order.orderNumber}`,
      idempotencyKey: `loyalty:earn:${order.id}`
    },
    update: {}
  });
}

function calculateEarnedPoints(totalCents: number): number {
  return Math.floor(totalCents * 0.05);
}

function calculateTier(orderCount: number): LoyaltyTier {
  if (orderCount >= 20) {
    return LoyaltyTier.HOKAGE;
  }

  if (orderCount >= 10) {
    return LoyaltyTier.JONIN;
  }

  if (orderCount >= 3) {
    return LoyaltyTier.CHUNIN;
  }

  return LoyaltyTier.GENIN;
}
