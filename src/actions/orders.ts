"use server";

import { FulfillmentStatus, OrderStatus } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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
    await prisma.order.update({
      where: {
        id: orderId,
        paidAt: null
      },
      data: {
        status: OrderStatus.CANCELED,
        canceledAt: new Date()
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível cancelar o pedido.");
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
