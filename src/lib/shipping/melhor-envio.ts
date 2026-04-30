import type { ShippingOption } from "@/features/cart/types";

interface MelhorEnvioQuoteItem {
  id: string;
  quantity: number;
  unitPriceCents: number;
  weightGrams?: number | null;
}

interface MelhorEnvioServiceQuote {
  id?: number | string;
  name?: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  custom_delivery_time?: number;
  company?: {
    name?: string;
  };
  error?: string;
}

interface MelhorEnvioQuoteInput {
  freeShippingThresholdCents: number;
  itemCount: number;
  items?: MelhorEnvioQuoteItem[];
  postalCode?: string;
  subtotalCents: number;
}

export function isMelhorEnvioQuoteConfigured(): boolean {
  return Boolean(process.env.MELHOR_ENVIO_ACCESS_TOKEN && process.env.MELHOR_ENVIO_FROM_POSTAL_CODE);
}

export async function quoteMelhorEnvioOptions({
  freeShippingThresholdCents,
  itemCount,
  items,
  postalCode,
  subtotalCents
}: MelhorEnvioQuoteInput): Promise<ShippingOption[]> {
  const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN;
  const fromPostalCode = normalizePostalCode(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE);
  const toPostalCode = normalizePostalCode(postalCode);

  if (!token || !fromPostalCode || !toPostalCode || itemCount <= 0) {
    return [];
  }

  const response = await fetch(`${getMelhorEnvioBaseUrl()}/api/v2/me/shipment/calculate`, {
    body: JSON.stringify({
      from: { postal_code: fromPostalCode },
      to: { postal_code: toPostalCode },
      products: buildProducts(items, itemCount, subtotalCents),
      options: buildOptions()
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": getMelhorEnvioUserAgent()
    },
    method: "POST",
    signal: AbortSignal.timeout(8_000)
  });

  if (!response.ok) {
    throw new Error("Melhor Envio shipping quote failed.");
  }

  const payload = await response.json() as MelhorEnvioServiceQuote[];
  const hasFreeShipping = subtotalCents >= freeShippingThresholdCents;

  return payload
    .filter((service) => !service.error)
    .map((service) => mapServiceQuote(service, hasFreeShipping))
    .filter((option): option is ShippingOption => Boolean(option));
}

function buildProducts(
  items: MelhorEnvioQuoteItem[] | undefined,
  itemCount: number,
  subtotalCents: number
): Array<Record<string, number | string>> {
  const quoteItems = items?.length
    ? items
    : [{ id: "generic", quantity: itemCount, unitPriceCents: Math.max(100, Math.floor(subtotalCents / itemCount)) }];

  return quoteItems.map((item) => ({
    height: getNumberEnv("MELHOR_ENVIO_DEFAULT_HEIGHT_CM", 3),
    id: item.id,
    insurance_value: Math.max(1, item.unitPriceCents / 100),
    length: getNumberEnv("MELHOR_ENVIO_DEFAULT_LENGTH_CM", 30),
    quantity: item.quantity,
    weight: Math.max(0.01, (item.weightGrams ?? getNumberEnv("MELHOR_ENVIO_DEFAULT_WEIGHT_GRAMS", 250)) / 1000),
    width: getNumberEnv("MELHOR_ENVIO_DEFAULT_WIDTH_CM", 25)
  }));
}

function buildOptions(): Record<string, string> | undefined {
  const services = process.env.MELHOR_ENVIO_SERVICE_IDS?.trim();

  return services ? { services } : undefined;
}

function mapServiceQuote(service: MelhorEnvioServiceQuote, hasFreeShipping: boolean): ShippingOption | null {
  const serviceId = String(service.id ?? "").trim();
  const priceCents = parseCurrencyToCents(service.custom_price ?? service.price);

  if (!serviceId || priceCents === null) {
    return null;
  }

  const companyName = service.company?.name?.trim();
  const serviceName = service.name?.trim() || "Frete";
  const deliveryTime = Number(service.custom_delivery_time ?? service.delivery_time ?? 0);

  return {
    description: hasFreeShipping
      ? "Frete gratis para este pedido."
      : "Cotacao em tempo real pelo Melhor Envio.",
    estimatedBusinessDays: Number.isFinite(deliveryTime) && deliveryTime > 0 ? deliveryTime : 1,
    id: `melhor-envio:${serviceId}`,
    name: companyName ? `${companyName} - ${serviceName}` : serviceName,
    priceCents: hasFreeShipping ? 0 : priceCents,
    provider: "MELHOR_ENVIO"
  };
}

function getMelhorEnvioBaseUrl(): string {
  return (process.env.MELHOR_ENVIO_BASE_URL || "https://melhorenvio.com.br").replace(/\/+$/, "");
}

function getMelhorEnvioUserAgent(): string {
  return process.env.MELHOR_ENVIO_USER_AGENT || "NerdLingoLab (nerdlingolab@gmail.com)";
}

function getNumberEnv(key: string, fallback: number): number {
  const parsedValue = Number(process.env[key]);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizePostalCode(postalCode?: string): string | null {
  const digits = postalCode?.replace(/\D/g, "") ?? "";

  return digits.length === 8 ? digits : null;
}

function parseCurrencyToCents(value?: string): number | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value.replace(",", "."));

  return Number.isFinite(parsedValue) ? Math.round(parsedValue * 100) : null;
}
