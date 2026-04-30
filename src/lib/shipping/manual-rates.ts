import type { ManualShippingRate } from "@/generated/prisma/client";
import type { ShippingOption } from "@/features/cart/types";
import { prisma } from "@/lib/prisma";

export interface ManualShippingQuoteInput {
  freeShippingThresholdCents: number;
  itemCount: number;
  postalCode?: string;
  subtotalCents: number;
}

export type ManualShippingRateItem = ManualShippingRate;

export async function getAdminManualShippingRates(): Promise<ManualShippingRateItem[]> {
  return prisma.manualShippingRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }, { name: "asc" }]
  });
}

export async function quoteConfiguredManualShippingOptions({
  freeShippingThresholdCents,
  itemCount,
  postalCode,
  subtotalCents
}: ManualShippingQuoteInput): Promise<ShippingOption[]> {
  const rates = await prisma.manualShippingRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }, { name: "asc" }],
    where: { isActive: true }
  });
  const hasFreeShipping = subtotalCents >= freeShippingThresholdCents;

  return rates
    .filter((rate) => matchesManualRate(rate, { itemCount, postalCode, subtotalCents }))
    .map((rate) => ({
      description: hasFreeShipping
        ? "Frete gratis para este pedido."
        : rate.description || "Frete configurado manualmente pela loja.",
      estimatedBusinessDays: rate.estimatedBusinessDays,
      id: `manual:${rate.id}`,
      name: rate.name,
      priceCents: hasFreeShipping ? 0 : rate.priceCents,
      provider: "MANUAL"
    }));
}

function matchesManualRate(
  rate: ManualShippingRate,
  {
    itemCount,
    postalCode,
    subtotalCents
  }: Pick<ManualShippingQuoteInput, "itemCount" | "postalCode" | "subtotalCents">
): boolean {
  if (rate.minSubtotalCents !== null && subtotalCents < rate.minSubtotalCents) {
    return false;
  }

  if (rate.maxSubtotalCents !== null && subtotalCents > rate.maxSubtotalCents) {
    return false;
  }

  if (rate.minItems !== null && itemCount < rate.minItems) {
    return false;
  }

  if (rate.maxItems !== null && itemCount > rate.maxItems) {
    return false;
  }

  if (rate.postalCodePrefixes.length === 0) {
    return true;
  }

  const digits = postalCode?.replace(/\D/g, "") ?? "";

  return rate.postalCodePrefixes.some((prefix) => digits.startsWith(prefix));
}
