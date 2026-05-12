import { LoyaltyLedgerType, UserRole } from "@/generated/prisma/client";

import {
  sendLoyaltyInactiveBalanceEmail,
  sendLoyaltyNearTierEmail,
  sendLoyaltyPointsExpiringEmail,
  sendLoyaltyRedeemableCouponEmail
} from "@/lib/email/transactional";
import {
  calculateCouponValueCents,
  getLoyaltyProgramSettings,
  getVipProgress
} from "@/lib/loyalty/settings";
import { ensureReferralCode } from "@/lib/loyalty/referrals";
import { prisma } from "@/lib/prisma";

export interface LoyaltyAutomationResult {
  processedCount: number;
  routine: string;
}

export async function runLoyaltyMarketingAutomation(): Promise<LoyaltyAutomationResult[]> {
  return [
    await expireEligibleNerdcoinsAutomation(),
    await notifyExpiringNerdcoinsAutomation(),
    await notifyRedeemableNerdcoinsAutomation(),
    await notifyNearTierNerdcoinsAutomation(),
    await notifyInactiveBalanceNerdcoinsAutomation(),
    await backfillReferralCodesAutomation()
  ];
}

export async function expireEligibleNerdcoinsAutomation(): Promise<LoyaltyAutomationResult> {
  const now = new Date();
  let processedCount = 0;
  const usersWithExpiredLots = await prisma.user.findMany({
    select: { id: true },
    where: {
      loyaltyLedger: {
        some: {
          expiresAt: { lte: now },
          pointsDelta: { gt: 0 },
          type: LoyaltyLedgerType.EARN
        }
      },
      loyaltyPoints: { balance: { gt: 0 } }
    }
  });

  for (const user of usersWithExpiredLots) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.loyaltyPoints.findUnique({ where: { userId: user.id } });

      if (!current || current.balance <= 0) {
        return;
      }

      const ledger = await tx.loyaltyLedger.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          expiresAt: true,
          id: true,
          pointsDelta: true,
          type: true
        },
        where: { userId: user.id }
      });
      const lots = ledger
        .filter((entry) => entry.pointsDelta > 0)
        .map((entry) => ({
          expiresAt: entry.expiresAt,
          id: entry.id,
          remaining: entry.pointsDelta,
          type: entry.type
        }));

      for (const entry of ledger.filter((ledgerEntry) => ledgerEntry.pointsDelta < 0)) {
        let pointsToConsume = Math.abs(entry.pointsDelta);

        for (const lot of lots) {
          if (pointsToConsume <= 0) {
            break;
          }

          const consumedFromLot = Math.min(lot.remaining, pointsToConsume);
          lot.remaining -= consumedFromLot;
          pointsToConsume -= consumedFromLot;
        }
      }

      let runningBalance = current.balance;
      const expiredLots = lots.filter(
        (lot) => lot.type === LoyaltyLedgerType.EARN && lot.expiresAt && lot.expiresAt <= now && lot.remaining > 0
      );

      for (const lot of expiredLots) {
        if (runningBalance <= 0) {
          return;
        }

        const idempotencyKey = `loyalty:expire:${lot.id}`;
        const existingLedger = await tx.loyaltyLedger.findUnique({ where: { idempotencyKey } });

        if (existingLedger) {
          continue;
        }

        const pointsToExpire = Math.min(lot.remaining, runningBalance);
        runningBalance -= pointsToExpire;

        await tx.loyaltyPoints.update({
          where: { userId: user.id },
          data: {
            balance: runningBalance,
            lifetimeExpired: { increment: pointsToExpire }
          }
        });
        await tx.loyaltyLedger.create({
          data: {
            balanceAfter: runningBalance,
            customerNote: "Pontos vencidos",
            idempotencyKey,
            metadata: { expiredLedgerId: lot.id },
            pointsDelta: -pointsToExpire,
            reason: "Expiração de Nerdcoins",
            sourceLedgerId: lot.id,
            type: LoyaltyLedgerType.EXPIRE,
            userId: user.id
          }
        });
        processedCount += 1;
      }
    });
  }

  return { processedCount, routine: "expire" };
}

export async function notifyExpiringNerdcoinsAutomation(): Promise<LoyaltyAutomationResult> {
  const now = new Date();
  const limitDate = new Date(now.getTime() + 7 * 86_400_000);
  let processedCount = 0;
  const users = await prisma.user.findMany({
    select: { id: true },
    where: {
      loyaltyLedger: {
        some: {
          expiresAt: { gt: now, lte: limitDate },
          pointsDelta: { gt: 0 },
          type: LoyaltyLedgerType.EARN
        }
      },
      loyaltyPoints: { balance: { gt: 0 } }
    }
  });

  for (const user of users) {
    const [current, ledger] = await Promise.all([
      prisma.loyaltyPoints.findUnique({ where: { userId: user.id } }),
      prisma.loyaltyLedger.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          expiresAt: true,
          id: true,
          pointsDelta: true,
          type: true,
          user: { select: { email: true } }
        },
        where: { userId: user.id }
      })
    ]);

    if (!current || current.balance <= 0) {
      continue;
    }

    const lots = ledger
      .filter((entry) => entry.pointsDelta > 0)
      .map((entry) => ({
        email: entry.user?.email ?? null,
        expiresAt: entry.expiresAt,
        id: entry.id,
        remaining: entry.pointsDelta,
        type: entry.type
      }));

    for (const entry of ledger.filter((ledgerEntry) => ledgerEntry.pointsDelta < 0)) {
      let pointsToConsume = Math.abs(entry.pointsDelta);

      for (const lot of lots) {
        if (pointsToConsume <= 0) {
          break;
        }

        const consumedFromLot = Math.min(lot.remaining, pointsToConsume);
        lot.remaining -= consumedFromLot;
        pointsToConsume -= consumedFromLot;
      }
    }

    for (const lot of lots.filter((entry) => entry.type === LoyaltyLedgerType.EARN && entry.expiresAt && entry.expiresAt > now && entry.expiresAt <= limitDate && entry.remaining > 0)) {
      const idempotencyKey = `loyalty:expiring-notice:${lot.id}`;
      const existingNotice = await prisma.loyaltyNotification.findUnique({ where: { idempotencyKey } });

      if (existingNotice || !lot.expiresAt) {
        continue;
      }

      const result = await sendLoyaltyPointsExpiringEmail({
        expiresAt: lot.expiresAt,
        points: Math.min(lot.remaining, current.balance),
        userId: user.id
      });

      await prisma.loyaltyNotification.create({
        data: {
          email: lot.email,
          errorMessage: result.error ?? null,
          idempotencyKey,
          sourceLedgerId: lot.id,
          status: result.ok ? "SENT" : "FAILED",
          type: "POINTS_EXPIRING",
          userId: user.id
        }
      });
      processedCount += 1;
    }
  }

  return { processedCount, routine: "expiring" };
}

export async function notifyRedeemableNerdcoinsAutomation(): Promise<LoyaltyAutomationResult> {
  const settings = await getLoyaltyProgramSettings();
  let processedCount = 0;

  if (!settings.isEnabled) {
    return { processedCount, routine: "redeemable" };
  }

  const customers = await prisma.loyaltyPoints.findMany({
    include: { user: { select: { email: true } } },
    take: 500,
    where: {
      balance: { gte: settings.minRedeemPoints },
      user: { is: { role: UserRole.CUSTOMER } }
    }
  });

  for (const customer of customers) {
    const idempotencyKey = `loyalty:redeemable:${customer.userId}:${customer.balance}:${settings.minRedeemPoints}`;
    const existingNotice = await prisma.loyaltyNotification.findUnique({ where: { idempotencyKey } });

    if (existingNotice) {
      continue;
    }

    const result = await sendLoyaltyRedeemableCouponEmail({
      balance: customer.balance,
      minRedeemPoints: settings.minRedeemPoints,
      userId: customer.userId,
      valueCents: calculateCouponValueCents(customer.balance, settings.redeemCentsPerPoint)
    });

    await prisma.loyaltyNotification.create({
      data: {
        email: customer.user.email,
        errorMessage: result.error ?? null,
        idempotencyKey,
        status: result.ok ? "SENT" : "FAILED",
        type: "REDEEMABLE_COUPON",
        userId: customer.userId
      }
    });
    processedCount += 1;
  }

  return { processedCount, routine: "redeemable" };
}

export async function notifyNearTierNerdcoinsAutomation(): Promise<LoyaltyAutomationResult> {
  const settings = await getLoyaltyProgramSettings();
  let processedCount = 0;

  if (!settings.isEnabled) {
    return { processedCount, routine: "near-tier" };
  }

  const customers = await prisma.loyaltyPoints.findMany({
    include: { user: { select: { email: true } } },
    take: 500,
    where: { user: { is: { role: UserRole.CUSTOMER } } }
  });

  for (const customer of customers) {
    const progress = getVipProgress({
      orderCount: customer.tierOrderCount,
      settings,
      spendCents: customer.tierSpendCents,
      tier: customer.tier
    });

    if (progress.isMaxTier || Math.max(progress.orderPercent, progress.spendPercent) < 80 || !progress.nextLabel) {
      continue;
    }

    const idempotencyKey = `loyalty:near-tier:${customer.userId}:${customer.tier}:${progress.orderPercent}:${progress.spendPercent}`;
    const existingNotice = await prisma.loyaltyNotification.findUnique({ where: { idempotencyKey } });

    if (existingNotice) {
      continue;
    }

    const result = await sendLoyaltyNearTierEmail({
      nextTierLabel: progress.nextLabel,
      ordersRemaining: progress.ordersRemaining,
      spendRemainingCents: progress.spendRemainingCents,
      userId: customer.userId
    });

    await prisma.loyaltyNotification.create({
      data: {
        email: customer.user.email,
        errorMessage: result.error ?? null,
        idempotencyKey,
        status: result.ok ? "SENT" : "FAILED",
        type: "NEAR_NEXT_TIER",
        userId: customer.userId
      }
    });
    processedCount += 1;
  }

  return { processedCount, routine: "near-tier" };
}

export async function notifyInactiveBalanceNerdcoinsAutomation(): Promise<LoyaltyAutomationResult> {
  const settings = await getLoyaltyProgramSettings();
  const inactiveSince = new Date(Date.now() - 45 * 86_400_000);
  const monthKey = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric"
  }).format(new Date());
  let processedCount = 0;

  if (!settings.isEnabled) {
    return { processedCount, routine: "inactive-balance" };
  }

  const customers = await prisma.loyaltyPoints.findMany({
    include: { user: { select: { email: true } } },
    take: 500,
    where: {
      balance: { gt: 0 },
      updatedAt: { lt: inactiveSince },
      user: { is: { role: UserRole.CUSTOMER } }
    }
  });

  for (const customer of customers) {
    const idempotencyKey = `loyalty:inactive-balance:${monthKey}:${customer.userId}:${customer.balance}`;
    const existingNotice = await prisma.loyaltyNotification.findUnique({ where: { idempotencyKey } });

    if (existingNotice) {
      continue;
    }

    const result = await sendLoyaltyInactiveBalanceEmail({
      balance: customer.balance,
      userId: customer.userId,
      valueCents: calculateCouponValueCents(customer.balance, settings.redeemCentsPerPoint)
    });

    await prisma.loyaltyNotification.create({
      data: {
        email: customer.user.email,
        errorMessage: result.error ?? null,
        idempotencyKey,
        status: result.ok ? "SENT" : "FAILED",
        type: "INACTIVE_BALANCE",
        userId: customer.userId
      }
    });
    processedCount += 1;
  }

  return { processedCount, routine: "inactive-balance" };
}

export async function backfillReferralCodesAutomation(): Promise<LoyaltyAutomationResult> {
  let processedCount = 0;
  const customersWithoutCodes = await prisma.user.findMany({
    select: { id: true },
    take: 500,
    where: {
      referralCode: null,
      role: UserRole.CUSTOMER
    }
  });

  for (const customer of customersWithoutCodes) {
    await ensureReferralCode(customer.id);
    processedCount += 1;
  }

  return { processedCount, routine: "referrals" };
}
