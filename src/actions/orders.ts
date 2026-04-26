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

import { requireAdmin } from "@/lib/admin";
import { releaseInventoryReservations } from "@/lib/inventory/reservations";
import { prisma } from "@/lib/prisma";
import { syncMercadoEnviosShipment } from "@/lib/shipping/mercado-envios";

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

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirstOrThrow({
        where: {
          id: orderId,
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
    throw new Error("Não foi possível cancelar o pedido.");
  }

  revalidateOrderPaths(orderId);
}

export async function saveManualShipment(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();

  try {
    const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
    const carrierName = String(formData.get("carrierName") ?? "").trim();
    const carrierUrl = String(formData.get("carrierUrl") ?? "").trim();

    if (!trackingNumber || !carrierName) {
      throw new Error("Informe transportadora e rastreio.");
    }

    await prisma.shipment.create({
      data: {
        orderId,
        provider: ShippingProvider.MANUAL,
        carrierName,
        carrierUrl: carrierUrl || null,
        trackingNumber,
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date()
      }
    });
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.SHIPPED,
        fulfillmentStatus: FulfillmentStatus.FULFILLED
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível salvar o rastreamento.");
  }

  revalidateOrderPaths(orderId);
}

export async function syncMercadoEnviosOrderShipment(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();

  try {
    const externalShipmentId = String(formData.get("externalShipmentId") ?? "").trim();

    if (!externalShipmentId) {
      throw new Error("Informe o código de envio.");
    }

    await syncMercadoEnviosShipment({ externalShipmentId, orderId });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível sincronizar o Mercado Envios.");
  }

  revalidateOrderPaths(orderId);
}

async function updateOrderStatus(
  orderId: string,
  data: {
    status: OrderStatus;
    fulfillmentStatus?: FulfillmentStatus;
  }
): Promise<void> {
  await requireAdmin();

  try {
    await prisma.order.update({
      where: { id: orderId },
      data
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível atualizar o pedido.");
  }

  revalidateOrderPaths(orderId);
}

function revalidateOrderPaths(orderId: string): void {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}
