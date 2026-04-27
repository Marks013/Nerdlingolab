import { LoyaltyLedgerType, ReferralStatus, type LoyaltyTier } from "@/generated/prisma/client";

import {
  calculateEarnedPoints,
  calculateTier,
  getLoyaltyProgramSettings,
  getPointsExpirationDate
} from "@/lib/loyalty/settings";
import type { PaidOrder, TransactionClient } from "@/lib/payments/mercadopago-webhook";

export async function registerOrderLoyaltyLedger(
  tx: TransactionClient,
  order: PaidOrder
): Promise<void> {
  if (!order.userId) {
    return;
  }

  const customer = await tx.user.findUnique({
    where: { id: order.userId },
    select: { birthday: true, cpf: true }
  });

  if (!customer?.cpf || !customer.birthday) {
    return;
  }

  const currentPoints = await tx.loyaltyPoints.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId },
    update: {}
  });
  const settings = await getLoyaltyProgramSettings(tx);
  const earnedPoints = calculateEarnedPoints({
    settings,
    tier: currentPoints.tier,
    totalCents: order.totalCents
  });
  const nextBalance = currentPoints.balance - order.loyaltyPointsRedeemed + earnedPoints;
  const nextTier = calculateTier({
    orderCount: currentPoints.tierOrderCount + 1,
    settings,
    spendCents: currentPoints.tierSpendCents + order.totalCents
  });

  await registerRedeemedPoints(tx, order, currentPoints.balance);
  await registerEarnedPoints(
    tx,
    order,
    currentPoints.balance - order.loyaltyPointsRedeemed,
    earnedPoints,
    nextTier,
    getPointsExpirationDate(settings)
  );

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

  await registerReferralReward(tx, order);
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

async function registerReferralReward(tx: TransactionClient, order: PaidOrder): Promise<void> {
  if (!order.userId) {
    return;
  }

  const settings = await getLoyaltyProgramSettings(tx);

  if (!settings.isEnabled || settings.referralInviterBonusPoints <= 0 || order.totalCents < settings.referralMinOrderCents) {
    return;
  }

  const approvedOrderCount = await tx.order.count({
    where: {
      paymentStatus: "APPROVED",
      userId: order.userId
    }
  });

  if (approvedOrderCount !== 1) {
    return;
  }

  const referral = await tx.referral.findUnique({
    where: { inviteeId: order.userId },
    include: {
      invitee: { select: { cpf: true, email: true, phone: true } },
      inviter: { select: { cpf: true, email: true, phone: true } }
    }
  });

  if (!referral || referral.status !== ReferralStatus.PENDING || referral.inviterId === order.userId) {
    return;
  }

  if (
    !referral.invitee.cpf ||
    !referral.inviter.cpf ||
    referral.invitee.cpf === referral.inviter.cpf ||
    referral.invitee.email === referral.inviter.email ||
    (referral.invitee.phone && referral.invitee.phone === referral.inviter.phone)
  ) {
    await tx.referral.update({
      where: { id: referral.id },
      data: { status: ReferralStatus.CANCELED }
    });
    return;
  }

  const idempotencyKey = `loyalty:referral:inviter:${referral.id}`;
  const existingLedger = await tx.loyaltyLedger.findUnique({
    where: { idempotencyKey }
  });

  if (existingLedger) {
    return;
  }

  const currentPoints = await tx.loyaltyPoints.upsert({
    where: { userId: referral.inviterId },
    create: { userId: referral.inviterId },
    update: {}
  });
  const nextBalance = currentPoints.balance + settings.referralInviterBonusPoints;

  await tx.loyaltyPoints.update({
    where: { userId: referral.inviterId },
    data: {
      balance: nextBalance,
      lifetimeEarned: { increment: settings.referralInviterBonusPoints }
    }
  });
  await tx.loyaltyLedger.create({
    data: {
      balanceAfter: nextBalance,
      customerNote: "Indicação convertida em compra",
      expiresAt: getPointsExpirationDate(settings),
      idempotencyKey,
      metadata: { inviteeId: order.userId, orderId: order.id, referralId: referral.id },
      pointsDelta: settings.referralInviterBonusPoints,
      reason: `Bônus de indicação do pedido ${order.orderNumber}`,
      type: LoyaltyLedgerType.EARN,
      userId: referral.inviterId
    }
  });
  await registerInviteeReferralReward(tx, referral, order);
  await tx.referral.update({
    where: { id: referral.id },
    data: {
      qualifyingOrderId: order.id,
      inviterRewardPoints: settings.referralInviterBonusPoints,
      status: ReferralStatus.REWARDED,
      rewardedAt: new Date()
    }
  });
}

async function registerInviteeReferralReward(
  tx: TransactionClient,
  referral: {
    id: string;
    inviteeId: string;
    inviteeRewardPoints: number;
  },
  order: PaidOrder
): Promise<void> {
  if (referral.inviteeRewardPoints <= 0) {
    return;
  }

  const idempotencyKey = `loyalty:referral:invitee:${referral.id}`;
  const existingLedger = await tx.loyaltyLedger.findUnique({
    where: { idempotencyKey }
  });

  if (existingLedger) {
    return;
  }

  const settings = await getLoyaltyProgramSettings(tx);
  const currentPoints = await tx.loyaltyPoints.upsert({
    where: { userId: referral.inviteeId },
    create: { userId: referral.inviteeId },
    update: {}
  });
  const nextBalance = currentPoints.balance + referral.inviteeRewardPoints;

  await tx.loyaltyPoints.update({
    where: { userId: referral.inviteeId },
    data: {
      balance: nextBalance,
      lifetimeEarned: { increment: referral.inviteeRewardPoints }
    }
  });
  await tx.loyaltyLedger.create({
    data: {
      balanceAfter: nextBalance,
      customerNote: "Bônus liberado após primeira compra indicada",
      expiresAt: getPointsExpirationDate(settings),
      idempotencyKey,
      metadata: { orderId: order.id, referralId: referral.id },
      pointsDelta: referral.inviteeRewardPoints,
      reason: `Bônus de indicação recebido no pedido ${order.orderNumber}`,
      type: LoyaltyLedgerType.EARN,
      userId: referral.inviteeId
    }
  });
}

async function registerEarnedPoints(
  tx: TransactionClient,
  order: PaidOrder,
  balanceAfterRedemption: number,
  earnedPoints: number,
  nextTier: LoyaltyTier,
  expiresAt: Date | null
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
      expiresAt,
      reason: `Cashback do pedido ${order.orderNumber}`,
      idempotencyKey: `loyalty:earn:${order.id}`
    },
    update: {}
  });
}
