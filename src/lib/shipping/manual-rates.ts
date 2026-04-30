import type { ManualShippingRate } from "@/generated/prisma/client";
import type { ShippingOption } from "@/features/cart/types";
import { prisma } from "@/lib/prisma";

export interface ManualShippingQuoteInput {
  freeShippingThresholdCents: number;
  forceFreeShipping?: boolean;
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
  forceFreeShipping = false,
  itemCount,
  postalCode,
  subtotalCents
}: ManualShippingQuoteInput): Promise<ShippingOption[]> {
  const rates = await prisma.manualShippingRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }, { name: "asc" }],
    where: { isActive: true }
  });
  const hasFreeShipping = forceFreeShipping || subtotalCents >= freeShippingThresholdCents;
  const matchedRates = rates.filter((rate) => matchesManualRate(rate, { itemCount, postalCode, subtotalCents }));
  const quoteRates = hasFreeShipping ? selectControlledFreeShippingRates(matchedRates) : matchedRates;

  return quoteRates
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

function selectControlledFreeShippingRates(rates: ManualShippingRate[]): ManualShippingRate[] {
  const preferredRates = limitPreferredRates(rates);
  const cheapestRate = [...preferredRates].sort(compareRateByCost)[0];
  const fastestDays = Math.min(...preferredRates.map((rate) => rate.estimatedBusinessDays).filter((days) => days > 0));
  const fastestCheapestRate = [...preferredRates]
    .filter((rate) => rate.estimatedBusinessDays === fastestDays)
    .sort(compareRateByCost)[0];
  const selectedRates = [cheapestRate, fastestCheapestRate].filter(Boolean);
  const uniqueRates = new Map(selectedRates.map((rate) => [rate.id, rate]));

  return [...uniqueRates.values()];
}

function limitPreferredRates(rates: ManualShippingRate[]): ManualShippingRate[] {
  if (rates.length <= 5) {
    return rates;
  }

  const cheapestRates = [...rates].sort(compareRateByCost).slice(0, 2);
  const selectedIds = new Set(cheapestRates.map((rate) => rate.id));
  const fastestRates = [...rates]
    .filter((rate) => !selectedIds.has(rate.id))
    .sort(compareRateBySpeed)
    .slice(0, 3);

  return [...cheapestRates, ...fastestRates];
}

function compareRateByCost(left: ManualShippingRate, right: ManualShippingRate): number {
  return left.priceCents - right.priceCents
    || left.estimatedBusinessDays - right.estimatedBusinessDays
    || left.name.localeCompare(right.name);
}

function compareRateBySpeed(left: ManualShippingRate, right: ManualShippingRate): number {
  return left.estimatedBusinessDays - right.estimatedBusinessDays
    || left.priceCents - right.priceCents
    || left.name.localeCompare(right.name);
}
