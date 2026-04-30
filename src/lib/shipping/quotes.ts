import type { ShippingOption } from "@/features/cart/types";
import { isMelhorEnvioQuoteConfigured, quoteMelhorEnvioOptions } from "@/lib/shipping/melhor-envio";
import { quoteConfiguredManualShippingOptions } from "@/lib/shipping/manual-rates";

export interface ShippingQuoteInput {
  freeShippingThresholdCents?: number;
  forceFreeShipping?: boolean;
  itemCount: number;
  items?: Array<{
    heightCm?: number | null;
    id: string;
    lengthCm?: number | null;
    quantity: number;
    shippingLeadTimeDays?: number | null;
    unitPriceCents: number;
    weightGrams?: number | null;
    widthCm?: number | null;
  }>;
  postalCode?: string;
  subtotalCents: number;
}

export interface ShippingQuoteResult {
  options: ShippingOption[];
  selectedOption: ShippingOption | null;
}

export const defaultFreeShippingThresholdCents = 9_990;

export function normalizePostalCode(postalCode?: string): string | null {
  const digits = postalCode?.replace(/\D/g, "") ?? "";

  return digits.length === 8 ? digits : null;
}

export async function quoteShippingOptions({
  freeShippingThresholdCents = defaultFreeShippingThresholdCents,
  forceFreeShipping = false,
  itemCount,
  items,
  postalCode,
  subtotalCents
}: ShippingQuoteInput): Promise<ShippingOption[]> {
  const normalizedPostalCode = normalizePostalCode(postalCode);

  if (!normalizedPostalCode || itemCount <= 0) {
    return [];
  }

  if (isMelhorEnvioQuoteConfigured()) {
    try {
      const melhorEnvioOptions = await quoteMelhorEnvioOptions({
        freeShippingThresholdCents,
        forceFreeShipping,
        itemCount,
        items,
        postalCode: normalizedPostalCode,
        subtotalCents
      });

      if (melhorEnvioOptions.length > 0) {
        return limitPreferredShippingOptions(addShippingLeadTime(melhorEnvioOptions, items));
      }
    } catch {
      // Fall back to local quotes so checkout remains available during provider outages.
    }
  }

  return quoteManualShippingOptions({
    freeShippingThresholdCents,
    forceFreeShipping,
    itemCount,
    items,
    postalCode: normalizedPostalCode,
    subtotalCents
  });
}

export async function quoteManualShippingOptions({
  freeShippingThresholdCents = defaultFreeShippingThresholdCents,
  forceFreeShipping = false,
  itemCount,
  items,
  postalCode,
  subtotalCents
}: ShippingQuoteInput): Promise<ShippingOption[]> {
  const normalizedPostalCode = normalizePostalCode(postalCode);

  if (!normalizedPostalCode || itemCount <= 0) {
    return [];
  }

  try {
    const configuredOptions = await quoteConfiguredManualShippingOptions({
      freeShippingThresholdCents,
      forceFreeShipping,
      itemCount,
      postalCode: normalizedPostalCode,
      subtotalCents
    });

    if (configuredOptions.length > 0) {
      return limitPreferredShippingOptions(addShippingLeadTime(configuredOptions, items));
    }
  } catch {
    // Fall back to deterministic local rates when database rates are unavailable.
  }

  return limitPreferredShippingOptions(addShippingLeadTime(quoteDefaultManualShippingOptions({
    freeShippingThresholdCents,
    forceFreeShipping,
    itemCount,
    postalCode: normalizedPostalCode,
    subtotalCents
  }), items));
}

export function quoteDefaultManualShippingOptions({
  freeShippingThresholdCents = defaultFreeShippingThresholdCents,
  forceFreeShipping = false,
  itemCount,
  postalCode,
  subtotalCents
}: ShippingQuoteInput): ShippingOption[] {
  const normalizedPostalCode = normalizePostalCode(postalCode);

  if (!normalizedPostalCode || itemCount <= 0) {
    return [];
  }

  const regionalMultiplier = getRegionalMultiplier(normalizedPostalCode);
  const itemSurchargeCents = Math.max(0, itemCount - 1) * 350;
  const hasFreeShipping = forceFreeShipping || subtotalCents >= freeShippingThresholdCents;
  const economyPriceCents = hasFreeShipping
    ? 0
    : Math.round((1_490 + itemSurchargeCents) * regionalMultiplier);
  const expressPriceCents = hasFreeShipping ? 0 : Math.round((2_490 + itemSurchargeCents) * regionalMultiplier);

  return [
    {
      id: "economy",
      name: "Entrega econômica",
      description: hasFreeShipping
        ? "Frete grátis para este pedido."
        : "Opção com melhor custo para sua região.",
      priceCents: economyPriceCents,
      estimatedBusinessDays: regionalMultiplier >= 1.5 ? 8 : 5,
      provider: "MANUAL"
    },
    {
      id: "express",
      name: "Entrega expressa",
      description: "Opção priorizada para receber mais rápido.",
      priceCents: expressPriceCents,
      estimatedBusinessDays: regionalMultiplier >= 1.5 ? 5 : 3,
      provider: "MANUAL"
    }
  ];
}

export async function selectShippingOption({
  freeShippingThresholdCents,
  forceFreeShipping,
  itemCount,
  items,
  postalCode,
  selectedOptionId,
  subtotalCents
}: ShippingQuoteInput & { selectedOptionId?: string }): Promise<ShippingQuoteResult> {
  const options = await quoteShippingOptions({
    freeShippingThresholdCents,
    forceFreeShipping,
    itemCount,
    items,
    postalCode,
    subtotalCents
  });
  const selectedOption = options.find((option) => option.id === selectedOptionId) ?? options[0] ?? null;

  return { options, selectedOption };
}

function getRegionalMultiplier(postalCode: string): number {
  const firstDigit = Number(postalCode[0]);

  if (firstDigit <= 3) {
    return 1;
  }

  if (firstDigit <= 6) {
    return 1.25;
  }

  return 1.55;
}

function limitPreferredShippingOptions(options: ShippingOption[]): ShippingOption[] {
  if (options.length <= 5) {
    return options;
  }

  const cheapestOptions = [...options]
    .sort(compareShippingByCost)
    .slice(0, 2);
  const selectedIds = new Set(cheapestOptions.map((option) => option.id));

  const fastestOptions = [...options]
    .filter((option) => !selectedIds.has(option.id))
    .sort(compareShippingBySpeed)
    .slice(0, 3);

  return [...cheapestOptions, ...fastestOptions];
}

function compareShippingByCost(left: ShippingOption, right: ShippingOption): number {
  return left.priceCents - right.priceCents
    || left.estimatedBusinessDays - right.estimatedBusinessDays
    || left.name.localeCompare(right.name);
}

function compareShippingBySpeed(left: ShippingOption, right: ShippingOption): number {
  return left.estimatedBusinessDays - right.estimatedBusinessDays
    || left.priceCents - right.priceCents
    || left.name.localeCompare(right.name);
}

function addShippingLeadTime(
  options: ShippingOption[],
  items: ShippingQuoteInput["items"]
): ShippingOption[] {
  const leadTimeDays = Math.max(
    0,
    ...(items ?? []).map((item) => {
      const days = item.shippingLeadTimeDays;

      return typeof days === "number" && Number.isFinite(days) ? days : 0;
    })
  );

  if (leadTimeDays <= 0) {
    return options;
  }

  return options.map((option) => ({
    ...option,
    estimatedBusinessDays: option.estimatedBusinessDays + leadTimeDays
  }));
}
