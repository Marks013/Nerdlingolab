import { LoyaltyTier } from "@/generated/prisma/client";

import {
  calculateEarnedPoints,
  getLoyaltyProgramSettings
} from "@/lib/loyalty/settings";

type LoyaltySettings = Awaited<ReturnType<typeof getLoyaltyProgramSettings>>;

export function estimateProductCardNerdcoins(priceCents: number, settings: LoyaltySettings): number {
  return calculateEarnedPoints({
    settings,
    tier: LoyaltyTier.GENIN,
    totalCents: priceCents
  });
}
