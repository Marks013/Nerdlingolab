"use server";

import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  ShippingProvider
} from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { releaseInventoryReservations } from "@/lib/inventory/reservations";
import { prisma } from "@/lib/prisma";
import { syncMercadoEnviosShipment } from "@/lib/shipping/mercado-envios";
import { normalizeHttpUrl } from "@/lib/urls";

const recordIdSchema = z.string().trim().regex(/^[a-z0-9_-]{8,64}$/i);
const manualShipmentSchema = z.object({
  carrierName: z.string().trim().min(1).max(80),
  carrierUrl: z.string().trim().max(300).optional(),
  trackingNumber: z.string().trim().min(1).max(120)
});
const externalShipmentIdSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9._:-]+$/i);

export async function markOrderAsProcessing(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, {
    status: OrderStatus.PROCESSING
  });
}

export async function markOrderAsShipped(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, {
    status: OrderStatus.SHIPPED,
    fulfillmentStatus: FulfillmentStatus.FULFILLED
  });
}

export async function markOrderAsDelivered(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, {
    status: OrderStatus.DELIVERED,
    fulfillmentStatus: FulfillmentStatus.FULFILLED
  });
}

export async function cancelUnpaidOrder(orderId: string): Promise<void> {
  await requireAdmin();
  const parsedOrderId = parseRecordId(orderId);

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirstOrThrow({
        where: {
          id: parsedOrderId,
          paidAt: null
        },
        include: {
          items: true
        }
      });

      await releaseInventoryReservations(tx, order.items);
      await tx.order.update({
        where: { id: order.id },
        data: {
          canceledAt: new Date(),
          paymentStatus: PaymentStatus.CANCELED,
          status: OrderStatus.CANCELED
        }
      });
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel cancelar o pedido.");
  }

  revalidateOrderPaths(parsedOrderId);
}

export async function saveManualShipment(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedOrderId = parseRecordId(orderId);

  try {
    const parsedShipment = manualShipmentSchema.safeParse({
      carrierName: formData.get("carrierName"),
      carrierUrl: formData.get("carrierUrl") || undefined,
      trackingNumber: formData.get("trackingNumber")
    });

    if (!parsedShipment.success) {
      throw new Error("Informe transportadora e rastreio.");
    }

    const carrierUrl = parsedShipment.data.carrierUrl
      ? normalizeHttpUrl(parsedShipment.data.carrierUrl)
      : null;

    if (parsedShipment.data.carrierUrl && !carrierUrl) {
      throw new Error("Informe uma URL de rastreio valida.");
    }

    await prisma.shipment.create({
      data: {
        orderId: parsedOrderId,
        provider: ShippingProvider.MANUAL,
        carrierName: parsedShipment.data.carrierName,
        carrierUrl,
        trackingNumber: parsedShipment.data.trackingNumber,
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date()
      }
    });
    await prisma.order.update({
      where: { id: parsedOrderId },
      data: {
        status: OrderStatus.SHIPPED,
        fulfillmentStatus: FulfillmentStatus.FULFILLED
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel salvar o rastreamento.");
  }

  revalidateOrderPaths(parsedOrderId);
}

export async function syncMercadoEnviosOrderShipment(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedOrderId = parseRecordId(orderId);

  try {
    const parsedExternalShipmentId = externalShipmentIdSchema.safeParse(formData.get("externalShipmentId"));

    if (!parsedExternalShipmentId.success) {
      throw new Error("Informe o codigo de envio.");
    }

    await syncMercadoEnviosShipment({
      externalShipmentId: parsedExternalShipmentId.data,
      orderId: parsedOrderId
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel sincronizar o Mercado Envios.");
  }

  revalidateOrderPaths(parsedOrderId);
}

async function updateOrderStatus(
  orderId: string,
  data: {
    status: OrderStatus;
    fulfillmentStatus?: FulfillmentStatus;
  }
): Promise<void> {
  await requireAdmin();
  const parsedOrderId = parseRecordId(orderId);

  try {
    await prisma.order.update({
      where: { id: parsedOrderId },
      data
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel atualizar o pedido.");
  }

  revalidateOrderPaths(parsedOrderId);
}

function revalidateOrderPaths(orderId: string): void {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}

function parseRecordId(value: string): string {
  const parsedId = recordIdSchema.safeParse(value);

  if (!parsedId.success) {
    throw new Error("Identificador invalido.");
  }

  return parsedId.data;
}
