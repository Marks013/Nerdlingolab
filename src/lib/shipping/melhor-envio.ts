import { ShipmentStatus, ShippingProvider } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import type { ShippingOption } from "@/features/cart/types";
import { prisma } from "@/lib/prisma";

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

interface MelhorEnvioTrackingInput {
  externalShipmentId: string;
  orderId: string;
}

type MelhorEnvioTrackingPayload = Record<string, unknown> | Record<string, unknown>[];

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

export async function syncMelhorEnvioShipment({
  externalShipmentId,
  orderId
}: MelhorEnvioTrackingInput): Promise<void> {
  const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Melhor Envio nao configurado.");
  }

  const response = await fetch(`${getMelhorEnvioBaseUrl()}/api/v2/me/shipment/tracking`, {
    body: JSON.stringify({ orders: [externalShipmentId] }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": getMelhorEnvioUserAgent()
    },
    method: "POST",
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error("Melhor Envio tracking sync failed.");
  }

  const payload = await response.json() as MelhorEnvioTrackingPayload;
  const rawPayload = toInputJson(payload);
  const tracking = normalizeMelhorEnvioTracking(payload, externalShipmentId);
  const shipment = await prisma.shipment.upsert({
    create: {
      carrierName: tracking.carrierName,
      externalShipmentId,
      lastSyncedAt: new Date(),
      orderId,
      provider: ShippingProvider.MELHOR_ENVIO,
      rawPayload,
      status: tracking.status,
      trackingNumber: tracking.trackingNumber
    },
    update: {
      carrierName: tracking.carrierName,
      lastSyncedAt: new Date(),
      rawPayload,
      status: tracking.status,
      trackingNumber: tracking.trackingNumber
    },
    where: {
      provider_externalShipmentId: {
        externalShipmentId,
        provider: ShippingProvider.MELHOR_ENVIO
      }
    }
  });

  for (const event of tracking.events) {
    const existingEvent = await prisma.shipmentEvent.findFirst({
      where: {
        description: event.description,
        occurredAt: event.occurredAt,
        shipmentId: shipment.id
      }
    });

    if (existingEvent) {
      await prisma.shipmentEvent.update({
        data: {
          rawPayload: event.rawPayload,
          status: event.status,
          substatus: event.substatus
        },
        where: { id: existingEvent.id }
      });
    } else {
      await prisma.shipmentEvent.create({
        data: {
          description: event.description,
          occurredAt: event.occurredAt,
          rawPayload: event.rawPayload,
          shipmentId: shipment.id,
          status: event.status,
          substatus: event.substatus
        }
      });
    }
  }
}

function normalizeMelhorEnvioTracking(payload: MelhorEnvioTrackingPayload, fallbackId: string): {
  carrierName?: string;
  events: Array<{
    description?: string;
    occurredAt: Date;
    rawPayload: Prisma.InputJsonValue;
    status: ShipmentStatus;
    substatus?: string;
  }>;
  status: ShipmentStatus;
  trackingNumber?: string;
} {
  const record = findTrackingRecord(payload, fallbackId);
  const statusText = getStringValue(record, ["status", "status_label", "tracking_status", "name", "description"]);
  const trackingNumber = getStringValue(record, ["tracking", "tracking_number", "tracking_code", "codigo_rastreio", "code"]);
  const carrierName = getStringValue(record, ["company", "company_name", "carrier", "carrier_name", "service"]);
  const eventRecords = getArrayValue(record, ["events", "history", "histories", "tracking_events", "statuses"]);
  const events = eventRecords
    .map((event) => normalizeTrackingEvent(event))
    .filter((event): event is NonNullable<ReturnType<typeof normalizeTrackingEvent>> => Boolean(event));

  return {
    carrierName,
    events,
    status: events[0]?.status ?? mapMelhorEnvioShipmentStatus(statusText),
    trackingNumber
  };
}

function findTrackingRecord(payload: MelhorEnvioTrackingPayload, fallbackId: string): Record<string, unknown> {
  if (Array.isArray(payload)) {
    return payload.find((item) => recordMatchesShipment(item, fallbackId)) ?? payload[0] ?? {};
  }

  const directMatch = Object.values(payload).find((item) => recordMatchesShipment(item, fallbackId));

  if (directMatch && isRecord(directMatch)) {
    return directMatch;
  }

  return payload;
}

function normalizeTrackingEvent(event: unknown): {
  description?: string;
  occurredAt: Date;
  rawPayload: Prisma.InputJsonValue;
  status: ShipmentStatus;
  substatus?: string;
} | null {
  if (!isRecord(event)) {
    return null;
  }

  const occurredAt = parseTrackingDate(getStringValue(event, ["date", "created_at", "occurred_at", "datetime", "time"]));

  if (!occurredAt) {
    return null;
  }

  const description = getStringValue(event, ["description", "message", "status", "name"]);
  const substatus = getStringValue(event, ["substatus", "location", "place"]);

  return {
    description,
    occurredAt,
    rawPayload: toInputJson(event),
    status: mapMelhorEnvioShipmentStatus(description ?? substatus),
    substatus
  };
}

function recordMatchesShipment(value: unknown, shipmentId: string): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).some((innerValue) => String(innerValue).trim() === shipmentId);
}

function getArrayValue(record: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function getStringValue(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (isRecord(value)) {
      const nestedValue = getStringValue(value, keys);

      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return undefined;
}

function mapMelhorEnvioShipmentStatus(value: string | undefined): ShipmentStatus {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.includes("entreg") || normalizedValue.includes("delivered")) {
    return ShipmentStatus.DELIVERED;
  }

  if (normalizedValue.includes("cancel")) {
    return ShipmentStatus.CANCELLED;
  }

  if (normalizedValue.includes("atras") || normalizedValue.includes("delay")) {
    return ShipmentStatus.DELAYED;
  }

  if (normalizedValue.includes("post") || normalizedValue.includes("transit") || normalizedValue.includes("shipped")) {
    return ShipmentStatus.SHIPPED;
  }

  if (normalizedValue.includes("pronto") || normalizedValue.includes("ready")) {
    return ShipmentStatus.READY_TO_SHIP;
  }

  if (normalizedValue.includes("prepar") || normalizedValue.includes("handling")) {
    return ShipmentStatus.HANDLING;
  }

  if (normalizedValue.includes("pend")) {
    return ShipmentStatus.PENDING;
  }

  return ShipmentStatus.UNKNOWN;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseTrackingDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
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
