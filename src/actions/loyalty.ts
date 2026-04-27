"use server";

import { CouponType, LoyaltyLedgerType, UserRole } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import {
  calculateCouponValueCents,
  getLoyaltyProgramSettings,
  getPointsExpirationDate
} from "@/lib/loyalty/settings";
import { ensureReferralCode } from "@/lib/loyalty/referrals";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  birthdayBonusPoints: z.coerce.number().int().min(0).max(1_000_000),
  couponExpiresInDays: z.coerce.number().int().min(1).max(365),
  hokageMultiplier: z.coerce.number().int().min(100).max(500),
  hokageOrderThreshold: z.coerce.number().int().min(1).max(500),
  hokageSpendThresholdCents: z.coerce.number().int().min(0).max(100_000_000),
  isEnabled: z.boolean(),
  joninMultiplier: z.coerce.number().int().min(100).max(500),
  joninOrderThreshold: z.coerce.number().int().min(1).max(500),
  joninSpendThresholdCents: z.coerce.number().int().min(0).max(100_000_000),
  maxRedeemPoints: z.coerce.number().int().min(1).optional(),
  minRedeemPoints: z.coerce.number().int().min(1).max(1_000_000),
  pointsExpireInDays: z.coerce.number().int().min(1).max(3650).optional(),
  pointsPerReal: z.coerce.number().int().min(0).max(1000),
  programName: z.string().trim().min(3).max(40),
  redeemCentsPerPoint: z.coerce.number().int().min(1).max(100),
  referralInviteeBonusPoints: z.coerce.number().int().min(0).max(1_000_000),
  referralInviterBonusPoints: z.coerce.number().int().min(0).max(1_000_000),
  referralMinOrderCents: z.coerce.number().int().min(0).max(100_000_000),
  signupBonusPoints: z.coerce.number().int().min(0).max(1_000_000),
  showPendingPoints: z.boolean(),
  chuninMultiplier: z.coerce.number().int().min(100).max(500),
  chuninOrderThreshold: z.coerce.number().int().min(1).max(500),
  chuninSpendThresholdCents: z.coerce.number().int().min(0).max(100_000_000)
});

const adjustmentSchema = z.object({
  points: z.coerce.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  reason: z.string().trim().min(5).max(160),
  userId: z.string().min(1)
});

export async function updateLoyaltySettings(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedSettings = settingsSchema.safeParse({
    birthdayBonusPoints: formData.get("birthdayBonusPoints"),
    couponExpiresInDays: formData.get("couponExpiresInDays"),
    hokageMultiplier: formData.get("hokageMultiplier"),
    hokageOrderThreshold: formData.get("hokageOrderThreshold"),
    hokageSpendThresholdCents: formData.get("hokageSpendThresholdCents"),
    isEnabled: formData.get("isEnabled") === "on",
    joninMultiplier: formData.get("joninMultiplier"),
    joninOrderThreshold: formData.get("joninOrderThreshold"),
    joninSpendThresholdCents: formData.get("joninSpendThresholdCents"),
    maxRedeemPoints: formData.get("maxRedeemPoints") || undefined,
    minRedeemPoints: formData.get("minRedeemPoints"),
    pointsExpireInDays: formData.get("pointsExpireInDays") || undefined,
    pointsPerReal: formData.get("pointsPerReal"),
    programName: formData.get("programName"),
    redeemCentsPerPoint: formData.get("redeemCentsPerPoint"),
    referralInviteeBonusPoints: formData.get("referralInviteeBonusPoints"),
    referralInviterBonusPoints: formData.get("referralInviterBonusPoints"),
    referralMinOrderCents: formData.get("referralMinOrderCents"),
    signupBonusPoints: formData.get("signupBonusPoints"),
    showPendingPoints: formData.get("showPendingPoints") === "on",
    chuninMultiplier: formData.get("chuninMultiplier"),
    chuninOrderThreshold: formData.get("chuninOrderThreshold"),
    chuninSpendThresholdCents: formData.get("chuninSpendThresholdCents")
  });

  if (!parsedSettings.success) {
    throw new Error("Revise as configurações de fidelidade.");
  }

  try {
    await prisma.loyaltyProgramSettings.upsert({
      where: { singletonKey: "default" },
      create: { singletonKey: "default", ...parsedSettings.data },
      update: parsedSettings.data
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível salvar a fidelidade.");
  }

  revalidatePath("/admin/fidelidade");
  revalidatePath("/programa-de-fidelidade");
}

export async function grantBirthdayNerdcoins(): Promise<void> {
  await requireAdmin();
  const settings = await getLoyaltyProgramSettings();

  if (!settings.isEnabled || settings.birthdayBonusPoints <= 0) {
    throw new Error("Configure um bônus de aniversário ativo antes de processar.");
  }

  const today = getSaoPauloDateParts(new Date());
  const candidates = await prisma.user.findMany({
    select: { birthday: true, id: true },
    where: {
      birthday: { not: null },
      role: UserRole.CUSTOMER
    }
  });
  const eligibleUsers = candidates.filter((user) => {
    if (!user.birthday) {
      return false;
    }

    return user.birthday.getUTCDate() === today.day && user.birthday.getUTCMonth() + 1 === today.month;
  });

  try {
    for (const user of eligibleUsers) {
      await prisma.$transaction(async (tx) => {
        const idempotencyKey = `loyalty:birthday:${today.year}:${user.id}`;
        const existingLedger = await tx.loyaltyLedger.findUnique({ where: { idempotencyKey } });

        if (existingLedger) {
          return;
        }

        const current = await tx.loyaltyPoints.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {}
        });
        const nextBalance = current.balance + settings.birthdayBonusPoints;

        await tx.loyaltyPoints.update({
          where: { userId: user.id },
          data: {
            balance: nextBalance,
            lifetimeEarned: { increment: settings.birthdayBonusPoints }
          }
        });
        await tx.loyaltyLedger.create({
          data: {
            balanceAfter: nextBalance,
            customerNote: "Presente anual de aniversário",
            expiresAt: getPointsExpirationDate(settings),
            idempotencyKey,
            metadata: { year: today.year },
            pointsDelta: settings.birthdayBonusPoints,
            reason: "Bônus de aniversário",
            type: LoyaltyLedgerType.EARN,
            userId: user.id
          }
        });
      });
    }
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível processar aniversários.");
  }

  revalidatePath("/admin/fidelidade");
}

export async function expireEligibleNerdcoins(): Promise<void> {
  await requireAdmin();
  const now = new Date();

  try {
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
        loyaltyPoints: {
          balance: { gt: 0 }
        }
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
            createdAt: true,
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
        }
      });
    }
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível expirar os Nerdcoins elegíveis.");
  }

  revalidatePath("/admin/fidelidade");
  revalidatePath("/conta/nerdcoins");
}

export async function backfillReferralCodes(): Promise<void> {
  await requireAdmin();

  try {
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
    }
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível gerar os códigos de indicação pendentes.");
  }

  revalidatePath("/admin/fidelidade");
}

export async function adjustCustomerNerdcoins(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedAdjustment = adjustmentSchema.safeParse({
    points: formData.get("points"),
    reason: formData.get("reason"),
    userId: formData.get("userId")
  });

  if (!parsedAdjustment.success) {
    throw new Error("Revise o ajuste de Nerdcoins.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.loyaltyPoints.upsert({
        where: { userId: parsedAdjustment.data.userId },
        create: { userId: parsedAdjustment.data.userId },
        update: {}
      });
      const nextBalance = Math.max(0, current.balance + parsedAdjustment.data.points);
      const appliedDelta = nextBalance - current.balance;

      await tx.loyaltyPoints.update({
        where: { userId: parsedAdjustment.data.userId },
        data: {
          balance: nextBalance,
          lifetimeEarned: appliedDelta > 0 ? { increment: appliedDelta } : undefined,
          lifetimeRedeemed: appliedDelta < 0 ? { increment: Math.abs(appliedDelta) } : undefined
        }
      });
      await tx.loyaltyLedger.create({
        data: {
          balanceAfter: nextBalance,
          idempotencyKey: `loyalty:admin:${crypto.randomUUID()}`,
          pointsDelta: appliedDelta,
          reason: parsedAdjustment.data.reason,
          type: LoyaltyLedgerType.ADJUST,
          userId: parsedAdjustment.data.userId
        }
      });
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível ajustar os Nerdcoins.");
  }

  revalidatePath("/admin/fidelidade");
  revalidatePath("/admin/clientes");
}

export async function convertNerdcoinsToCoupon(formData: FormData): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const requestedPoints = z.coerce.number().int().min(1).max(1_000_000).parse(formData.get("points"));

  try {
    const settings = await getLoyaltyProgramSettings();

    if (!settings.isEnabled || requestedPoints < settings.minRedeemPoints) {
      throw new Error("Quantidade abaixo do mínimo de resgate.");
    }

    const couponValueCents = calculateCouponValueCents(requestedPoints, settings.redeemCentsPerPoint);
    const expiresAt = new Date(Date.now() + settings.couponExpiresInDays * 86_400_000);

    await prisma.$transaction(async (tx) => {
      const current = await tx.loyaltyPoints.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id },
        update: {}
      });

      if (current.balance < requestedPoints) {
        throw new Error("Saldo insuficiente.");
      }

      const nextBalance = current.balance - requestedPoints;
      const couponCode = `NERD${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

      await tx.loyaltyPoints.update({
        where: { userId: session.user.id },
        data: {
          balance: nextBalance,
          lifetimeRedeemed: { increment: requestedPoints }
        }
      });
      await tx.coupon.create({
        data: {
          assignedUserId: session.user.id,
          code: couponCode,
          expiresAt,
          isActive: true,
          isPublic: false,
          perCustomerLimit: 1,
          type: CouponType.FIXED_AMOUNT,
          usageLimit: 1,
          value: couponValueCents
        }
      });
      await tx.loyaltyLedger.create({
        data: {
          balanceAfter: nextBalance,
          customerNote: `Cupom ${couponCode}`,
          idempotencyKey: `loyalty:coupon:${couponCode}`,
          metadata: { couponCode, couponValueCents },
          pointsDelta: -requestedPoints,
          reason: "Conversão em cupom",
          type: LoyaltyLedgerType.REDEEM,
          userId: session.user.id
        }
      });
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error(getSafeNerdcoinsConversionMessage(error));
  }

  revalidatePath("/conta/nerdcoins");
  revalidatePath("/programa-de-fidelidade");
}

function getSafeNerdcoinsConversionMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const publicMessages = new Set([
    "Quantidade abaixo do mínimo de resgate.",
    "Saldo insuficiente."
  ]);

  return publicMessages.has(message) ? message : "Não foi possível converter Nerdcoins.";
}

function getSaoPauloDateParts(date: Date): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric"
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return {
    day: Number(partMap.get("day")),
    month: Number(partMap.get("month")),
    year: Number(partMap.get("year"))
  };
}
