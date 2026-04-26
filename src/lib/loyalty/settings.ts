import { LoyaltyTier } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

type LoyaltySettingsClient = Pick<typeof prisma, "loyaltyProgramSettings">;
type LoyaltyProgramSettings = Awaited<ReturnType<typeof getLoyaltyProgramSettings>>;

export const loyaltyTierLabels: Record<LoyaltyTier, string> = {
  [LoyaltyTier.GENIN]: "Genin",
  [LoyaltyTier.CHUNIN]: "Chunin",
  [LoyaltyTier.JONIN]: "Jonin",
  [LoyaltyTier.HOKAGE]: "Hokage"
};

export async function getLoyaltyProgramSettings(client: LoyaltySettingsClient = prisma) {
  return client.loyaltyProgramSettings.upsert({
    where: { singletonKey: "default" },
    create: { singletonKey: "default" },
    update: {}
  });
}

export function calculateTier({
  orderCount,
  settings,
  spendCents
}: {
  orderCount: number;
  settings: Awaited<ReturnType<typeof getLoyaltyProgramSettings>>;
  spendCents: number;
}): LoyaltyTier {
  if (orderCount >= settings.hokageOrderThreshold || spendCents >= settings.hokageSpendThresholdCents) {
    return LoyaltyTier.HOKAGE;
  }

  if (orderCount >= settings.joninOrderThreshold || spendCents >= settings.joninSpendThresholdCents) {
    return LoyaltyTier.JONIN;
  }

  if (orderCount >= settings.chuninOrderThreshold || spendCents >= settings.chuninSpendThresholdCents) {
    return LoyaltyTier.CHUNIN;
  }

  return LoyaltyTier.GENIN;
}

export function getTierMultiplierPercent(
  tier: LoyaltyTier,
  settings: Awaited<ReturnType<typeof getLoyaltyProgramSettings>>
): number {
  if (tier === LoyaltyTier.HOKAGE) {
    return settings.hokageMultiplier;
  }

  if (tier === LoyaltyTier.JONIN) {
    return settings.joninMultiplier;
  }

  if (tier === LoyaltyTier.CHUNIN) {
    return settings.chuninMultiplier;
  }

  return 100;
}

export function calculateEarnedPoints({
  settings,
  tier,
  totalCents
}: {
  settings: Awaited<ReturnType<typeof getLoyaltyProgramSettings>>;
  tier: LoyaltyTier;
  totalCents: number;
}): number {
  if (!settings.isEnabled || settings.pointsPerReal <= 0) {
    return 0;
  }

  const basePoints = Math.floor((totalCents / 100) * settings.pointsPerReal);

  return Math.floor((basePoints * getTierMultiplierPercent(tier, settings)) / 100);
}

export function calculateCouponValueCents(points: number, redeemCentsPerPoint: number): number {
  return Math.max(0, Math.floor(points) * Math.max(1, redeemCentsPerPoint));
}

export function getPointsExpirationDate(settings: LoyaltyProgramSettings, fromDate = new Date()): Date | null {
  if (!settings.pointsExpireInDays) {
    return null;
  }

  return new Date(fromDate.getTime() + settings.pointsExpireInDays * 86_400_000);
}

export function getVipProgress({
  orderCount,
  settings,
  spendCents,
  tier
}: {
  orderCount: number;
  settings: LoyaltyProgramSettings;
  spendCents: number;
  tier: LoyaltyTier;
}) {
  const nextTier = getNextTier(tier);

  if (!nextTier) {
    return {
      currentLabel: loyaltyTierLabels[tier],
      isMaxTier: true,
      nextLabel: null,
      orderPercent: 100,
      ordersRemaining: 0,
      spendPercent: 100,
      spendRemainingCents: 0
    };
  }

  const orderTarget = getTierOrderThreshold(nextTier, settings);
  const spendTargetCents = getTierSpendThreshold(nextTier, settings);

  return {
    currentLabel: loyaltyTierLabels[tier],
    isMaxTier: false,
    nextLabel: loyaltyTierLabels[nextTier],
    orderPercent: getPercent(orderCount, orderTarget),
    ordersRemaining: Math.max(0, orderTarget - orderCount),
    spendPercent: getPercent(spendCents, spendTargetCents),
    spendRemainingCents: Math.max(0, spendTargetCents - spendCents)
  };
}

export function getTierOrderThreshold(tier: LoyaltyTier, settings: LoyaltyProgramSettings): number {
  if (tier === LoyaltyTier.HOKAGE) {
    return settings.hokageOrderThreshold;
  }

  if (tier === LoyaltyTier.JONIN) {
    return settings.joninOrderThreshold;
  }

  if (tier === LoyaltyTier.CHUNIN) {
    return settings.chuninOrderThreshold;
  }

  return 0;
}

export function getTierSpendThreshold(tier: LoyaltyTier, settings: LoyaltyProgramSettings): number {
  if (tier === LoyaltyTier.HOKAGE) {
    return settings.hokageSpendThresholdCents;
  }

  if (tier === LoyaltyTier.JONIN) {
    return settings.joninSpendThresholdCents;
  }

  if (tier === LoyaltyTier.CHUNIN) {
    return settings.chuninSpendThresholdCents;
  }

  return 0;
}

function getNextTier(tier: LoyaltyTier): LoyaltyTier | null {
  if (tier === LoyaltyTier.GENIN) {
    return LoyaltyTier.CHUNIN;
  }

  if (tier === LoyaltyTier.CHUNIN) {
    return LoyaltyTier.JONIN;
  }

  if (tier === LoyaltyTier.JONIN) {
    return LoyaltyTier.HOKAGE;
  }

  return null;
}

function getPercent(current: number, target: number): number {
  if (target <= 0) {
    return 100;
  }

  return Math.min(100, Math.round((current / target) * 100));
}
