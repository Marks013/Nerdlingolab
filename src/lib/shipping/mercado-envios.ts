import {
  FulfillmentStatus,
  OrderStatus,
  ShipmentStatus,
  ShippingProvider,
  type Prisma
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

interface MercadoEnviosShipment {
  id?: string | number;
  status?: string;
  substatus?: string;
  tracking_number?: string;
  estimated_delivery_time?: {
    date?: string;
  };
}

interface MercadoEnviosHistoryEntry {
  status?: string;
  substatus?: string;
  date?: string;
}

interface MercadoEnviosCarrier {
  name?: string;
  url?: string;
}

export async function syncMercadoEnviosShipment({
  externalShipmentId,
  orderId
}: {
  externalShipmentId: string;
  orderId: string;
}): Promise<void> {
  const [shipment, history, carrier] = await Promise.all([
    fetchMercadoEnvios<MercadoEnviosShipment>(`/shipments/${externalShipmentId}`),
    fetchMercadoEnvios<MercadoEnviosHistoryEntry[]>(`/shipments/${externalShipmentId}/history`),
    fetchMercadoEnvios<MercadoEnviosCarrier>(`/shipments/${externalShipmentId}/carrier`).catch(() => null)
  ]);
  const status = mapMercadoEnviosStatus(shipment.status);
  const savedShipment = await prisma.shipment.upsert({
    where: {
      provider_externalShipmentId: {
        provider: ShippingProvider.MERCADO_ENVIOS,
        externalShipmentId
      }
    },
    create: {
      orderId,
      provider: ShippingProvider.MERCADO_ENVIOS,
      externalShipmentId,
      carrierName: carrier?.name,
      carrierUrl: carrier?.url,
      trackingNumber: shipment.tracking_number,
      status,
      substatus: shipment.substatus,
      estimatedDeliveryAt: parseDate(shipment.estimated_delivery_time?.date),
      lastSyncedAt: new Date(),
      rawPayload: toJson(shipment)
    },
    update: {
      carrierName: carrier?.name,
      carrierUrl: carrier?.url,
      trackingNumber: shipment.tracking_number,
      status,
      substatus: shipment.substatus,
      estimatedDeliveryAt: parseDate(shipment.estimated_delivery_time?.date),
      lastSyncedAt: new Date(),
      rawPayload: toJson(shipment)
    }
  });

  await prisma.shipmentEvent.deleteMany({ where: { shipmentId: savedShipment.id } });
  await prisma.shipmentEvent.createMany({
    data: history.map((entry) => ({
      shipmentId: savedShipment.id,
      status: mapMercadoEnviosStatus(entry.status),
      substatus: entry.substatus,
      occurredAt: parseDate(entry.date) ?? new Date(),
      rawPayload: toJson(entry)
    }))
  });
  await updateOrderFromShipment(orderId, status);
}

export function mapMercadoEnviosStatus(status?: string): ShipmentStatus {
  switch (status) {
    case "handling":
      return ShipmentStatus.HANDLING;
    case "ready_to_ship":
      return ShipmentStatus.READY_TO_SHIP;
    case "shipped":
      return ShipmentStatus.SHIPPED;
    case "delivered":
      return ShipmentStatus.DELIVERED;
    case "cancelled":
      return ShipmentStatus.CANCELLED;
    default:
      return ShipmentStatus.UNKNOWN;
  }
}

async function fetchMercadoEnvios<T>(path: string): Promise<T> {
  const token = process.env.MERCADO_ENVIOS_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Token do Mercado Envios não configurado.");
  }

  const response = await fetch(`https://api.mercadolibre.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-format-new": "true"
    }
  });

  if (!response.ok) {
    throw new Error("Não foi possível consultar o Mercado Envios.");
  }

  return response.json() as Promise<T>;
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function updateOrderFromShipment(orderId: string, status: ShipmentStatus): Promise<void> {
  if (status === ShipmentStatus.DELIVERED) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        fulfillmentStatus: FulfillmentStatus.FULFILLED
      }
    });
    return;
  }

  if (status === ShipmentStatus.SHIPPED || status === ShipmentStatus.READY_TO_SHIP) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.SHIPPED,
        fulfillmentStatus: FulfillmentStatus.FULFILLED
      }
    });
  }
}
