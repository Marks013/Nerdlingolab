import type { ShippingOption } from "@/features/cart/types";

interface MelhorEnvioQuoteItem {
  heightCm?: number | null;
  id: string;
  lengthCm?: number | null;
  quantity: number;
  unitPriceCents: number;
  weightGrams?: number | null;
  widthCm?: number | null;
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
  forceFreeShipping?: boolean;
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
  forceFreeShipping = false,
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
  const hasFreeShipping = forceFreeShipping || subtotalCents >= freeShippingThresholdCents;
  const services = hasFreeShipping ? selectControlledFreeShippingServices(payload) : payload;

  return services
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
    height: getPositiveNumber(item.heightCm) ?? 3,
    id: item.id,
    insurance_value: Math.max(1, item.unitPriceCents / 100),
    length: getPositiveNumber(item.lengthCm) ?? 30,
    quantity: item.quantity,
    weight: Math.max(0.01, (item.weightGrams ?? 250) / 1000),
    width: getPositiveNumber(item.widthCm) ?? 25
  }));
}

function buildOptions(): Record<string, string> | undefined {
  const services = process.env.MELHOR_ENVIO_SERVICE_IDS?.trim();

  return services ? { services } : undefined;
}

function mapServiceQuote(service: MelhorEnvioServiceQuote, hasFreeShipping: boolean): ShippingOption | null {
  const serviceId = String(service.id ?? "").trim();
  const priceCents = getServicePriceCents(service);

  if (!serviceId || priceCents === null) {
    return null;
  }

  const companyName = service.company?.name?.trim();
  const serviceName = service.name?.trim() || "Frete";
  const deliveryTime = Number(service.custom_delivery_time ?? service.delivery_time ?? 0);

  return {
    description: hasFreeShipping
      ? "Frete gratis para este pedido."
      : "Entrega calculada para seu CEP.",
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

function getPositiveNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function selectControlledFreeShippingServices(services: MelhorEnvioServiceQuote[]): MelhorEnvioServiceQuote[] {
  const validServices = services.filter((service) => !service.error && getServicePriceCents(service) !== null);
  const preferredServices = limitPreferredServices(validServices);
  const cheapestService = [...preferredServices].sort(compareServiceByCost)[0];
  const fastestDeliveryTime = Math.min(...preferredServices.map(getServiceDeliveryTime).filter((days) => days > 0));
  const fastestCheapestService = [...preferredServices]
    .filter((service) => getServiceDeliveryTime(service) === fastestDeliveryTime)
    .sort(compareServiceByCost)[0];
  const selectedServices = [cheapestService, fastestCheapestService].filter(Boolean);
  const uniqueServices = new Map(selectedServices.map((service) => [String(service.id), service]));

  return [...uniqueServices.values()];
}

function limitPreferredServices(services: MelhorEnvioServiceQuote[]): MelhorEnvioServiceQuote[] {
  if (services.length <= 5) {
    return services;
  }

  const cheapestServices = [...services].sort(compareServiceByCost).slice(0, 2);
  const selectedIds = new Set(cheapestServices.map((service) => String(service.id)));
  const fastestServices = [...services]
    .filter((service) => !selectedIds.has(String(service.id)))
    .sort(compareServiceBySpeed)
    .slice(0, 3);

  return [...cheapestServices, ...fastestServices];
}

function compareServiceByCost(left: MelhorEnvioServiceQuote, right: MelhorEnvioServiceQuote): number {
  return (getServicePriceCents(left) ?? Number.MAX_SAFE_INTEGER) - (getServicePriceCents(right) ?? Number.MAX_SAFE_INTEGER)
    || getServiceDeliveryTime(left) - getServiceDeliveryTime(right)
    || String(left.name ?? "").localeCompare(String(right.name ?? ""));
}

function compareServiceBySpeed(left: MelhorEnvioServiceQuote, right: MelhorEnvioServiceQuote): number {
  return getServiceDeliveryTime(left) - getServiceDeliveryTime(right)
    || (getServicePriceCents(left) ?? Number.MAX_SAFE_INTEGER) - (getServicePriceCents(right) ?? Number.MAX_SAFE_INTEGER)
    || String(left.name ?? "").localeCompare(String(right.name ?? ""));
}

function getServiceDeliveryTime(service: MelhorEnvioServiceQuote): number {
  const deliveryTime = Number(service.custom_delivery_time ?? service.delivery_time ?? 0);

  return Number.isFinite(deliveryTime) && deliveryTime > 0 ? deliveryTime : Number.MAX_SAFE_INTEGER;
}

function getServicePriceCents(service: MelhorEnvioServiceQuote): number | null {
  return parseCurrencyToCents(service.custom_price ?? service.price);
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
