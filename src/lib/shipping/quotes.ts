import type { ShippingOption } from "@/features/cart/types";
import { isMelhorEnvioQuoteConfigured, quoteMelhorEnvioOptions } from "@/lib/shipping/melhor-envio";

export interface ShippingQuoteInput {
  freeShippingThresholdCents?: number;
  itemCount: number;
  items?: Array<{
    id: string;
    quantity: number;
    unitPriceCents: number;
    weightGrams?: number | null;
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
        itemCount,
        items,
        postalCode: normalizedPostalCode,
        subtotalCents
      });

      if (melhorEnvioOptions.length > 0) {
        return melhorEnvioOptions;
      }
    } catch {
      // Fall back to local quotes so checkout remains available during provider outages.
    }
  }

  return quoteManualShippingOptions({
    freeShippingThresholdCents,
    itemCount,
    postalCode: normalizedPostalCode,
    subtotalCents
  });
}

function quoteManualShippingOptions({
  freeShippingThresholdCents = defaultFreeShippingThresholdCents,
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
  const hasFreeEconomyShipping = subtotalCents >= freeShippingThresholdCents;
  const economyPriceCents = hasFreeEconomyShipping
    ? 0
    : Math.round((1_490 + itemSurchargeCents) * regionalMultiplier);
  const expressPriceCents = Math.round((2_490 + itemSurchargeCents) * regionalMultiplier);

  return [
    {
      id: "economy",
      name: "Entrega econômica",
      description: hasFreeEconomyShipping
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
  itemCount,
  items,
  postalCode,
  selectedOptionId,
  subtotalCents
}: ShippingQuoteInput & { selectedOptionId?: string }): Promise<ShippingQuoteResult> {
  const options = await quoteShippingOptions({ itemCount, items, postalCode, subtotalCents });
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
