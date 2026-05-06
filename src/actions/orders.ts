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
import { auth } from "@/lib/auth";
import { sendOrderCanceledEmail } from "@/lib/email/transactional";
import { releaseInventoryReservations } from "@/lib/inventory/reservations";
import { restoreInventoryForCanceledOrder } from "@/lib/payments/order-inventory";
import { refundMercadoPagoPayment } from "@/lib/payments/mercadopago-refunds";
import type { TransactionClient } from "@/lib/payments/mercadopago-webhook";
import { prisma } from "@/lib/prisma";
import { syncMelhorEnvioShipment } from "@/lib/shipping/melhor-envio";
import { syncMercadoEnviosShipment } from "@/lib/shipping/mercado-envios";
import { normalizeHttpUrl } from "@/lib/urls";

const recordIdSchema = z.string().trim().regex(/^[a-z0-9_-]{8,64}$/i);
const manualShipmentSchema = z.object({
  carrierName: z.string().trim().min(1).max(80),
  carrierUrl: z.string().trim().max(300).optional(),
  trackingNumber: z.string().trim().min(1).max(120)
});
const externalShipmentIdSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9._:-]+$/i);
const cancellationReasonSchema = z.string().trim().min(12).max(800);

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

export async function cancelUnpaidOrder(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const session = await auth();
  const parsedOrderId = parseRecordId(orderId);
  const parsedReason = cancellationReasonSchema.safeParse(formData.get("cancellationReason"));

  if (!parsedReason.success) {
    throw new Error("Informe uma justificativa de cancelamento com pelo menos 12 caracteres.");
  }

  try {
    const orderBeforeCancel = await prisma.order.findUnique({
      where: { id: parsedOrderId },
      include: { items: true }
    });

    if (!orderBeforeCancel) {
      throw new Error("Pedido não encontrado.");
    }

    if (orderBeforeCancel.status === OrderStatus.CANCELED || orderBeforeCancel.status === OrderStatus.REFUNDED) {
      throw new Error("Pedido já cancelado.");
    }

    if (
      orderBeforeCancel.fulfillmentStatus === FulfillmentStatus.FULFILLED ||
      orderBeforeCancel.status === OrderStatus.SHIPPED ||
      orderBeforeCancel.status === OrderStatus.DELIVERED
    ) {
      throw new Error("Pedidos enviados ou entregues devem seguir fluxo de devolução antes do cancelamento.");
    }

    const isPaidOrder = orderBeforeCancel.paymentStatus === PaymentStatus.APPROVED || Boolean(orderBeforeCancel.paidAt);
    let refundResult: Awaited<ReturnType<typeof refundMercadoPagoPayment>> | null = null;
    const refundIdempotencyKey = `order-refund-${orderBeforeCancel.id}`;

    if (isPaidOrder) {
      if (!orderBeforeCancel.mercadoPagoPaymentId) {
        throw new Error("Pedido pago sem identificador de pagamento Mercado Pago.");
      }

      refundResult = await refundMercadoPagoPayment({
        idempotencyKey: refundIdempotencyKey,
        paymentId: orderBeforeCancel.mercadoPagoPaymentId
      });
    }

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirstOrThrow({
        where: {
          id: parsedOrderId
        },
        include: {
          items: true
        }
      });

      if (isPaidOrder) {
        await restoreInventoryForCanceledOrder(tx, order);
        await reverseOrderLoyalty(tx, order);
      } else {
        await releaseInventoryReservations(tx, order.items);
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          canceledAt: new Date(),
          canceledByUserId: session?.user?.id ?? null,
          cancellationReason: parsedReason.data,
          ...(isPaidOrder
            ? {
                paymentStatus: PaymentStatus.REFUNDED,
                refundedAt: new Date(),
                refundAmountCents: refundResult?.amountCents ?? order.totalCents,
                refundIdempotencyKey,
                refundProviderId: refundResult?.providerId ?? null,
                refundStatus: refundResult?.status ?? null,
                status: OrderStatus.REFUNDED
              }
            : {
                paymentStatus: PaymentStatus.CANCELED,
                refundedAt: null,
                refundAmountCents: null,
                refundIdempotencyKey: null,
                refundProviderId: null,
                refundStatus: null,
                status: OrderStatus.CANCELED
              })
        }
      });
    });

    await sendOrderCanceledEmail({
      cancellationReason: parsedReason.data,
      orderId: parsedOrderId
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel cancelar o pedido.");
  }

  revalidateOrderPaths(parsedOrderId);
}

async function reverseOrderLoyalty(
  tx: TransactionClient,
  order: {
    id: string;
    loyaltyPointsEarned: number;
    loyaltyPointsRedeemed: number;
    orderNumber: string;
    totalCents: number;
    userId: string | null;
  }
): Promise<void> {
  if (!order.userId || (order.loyaltyPointsEarned <= 0 && order.loyaltyPointsRedeemed <= 0)) {
    return;
  }

  const currentPoints = await tx.loyaltyPoints.findUnique({
    where: { userId: order.userId }
  });

  if (!currentPoints) {
    return;
  }

  const pointsDelta = order.loyaltyPointsRedeemed - order.loyaltyPointsEarned;
  const nextBalance = Math.max(0, currentPoints.balance + pointsDelta);

  await tx.loyaltyPoints.update({
    where: { userId: order.userId },
    data: {
      balance: nextBalance,
      lifetimeEarned: Math.max(0, currentPoints.lifetimeEarned - order.loyaltyPointsEarned),
      lifetimeRedeemed: Math.max(0, currentPoints.lifetimeRedeemed - order.loyaltyPointsRedeemed),
      tierOrderCount: Math.max(0, currentPoints.tierOrderCount - 1),
      tierSpendCents: Math.max(0, currentPoints.tierSpendCents - order.totalCents)
    }
  });
  await tx.loyaltyLedger.upsert({
    where: { idempotencyKey: `loyalty:refund-reversal:${order.id}` },
    create: {
      balanceAfter: nextBalance,
      customerNote: "Reversão automática por cancelamento/reembolso",
      idempotencyKey: `loyalty:refund-reversal:${order.id}`,
      metadata: {
        loyaltyPointsEarned: order.loyaltyPointsEarned,
        loyaltyPointsRedeemed: order.loyaltyPointsRedeemed,
        orderId: order.id
      },
      orderId: order.id,
      pointsDelta,
      reason: `Reversão do pedido ${order.orderNumber}`,
      type: "REFUND_REVERSAL",
      userId: order.userId
    },
    update: {}
  });
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

export async function syncMelhorEnvioOrderShipment(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedOrderId = parseRecordId(orderId);

  try {
    const parsedExternalShipmentId = externalShipmentIdSchema.safeParse(formData.get("externalShipmentId"));

    if (!parsedExternalShipmentId.success) {
      throw new Error("Informe o codigo de envio.");
    }

    await syncMelhorEnvioShipment({
      externalShipmentId: parsedExternalShipmentId.data,
      orderId: parsedOrderId
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel sincronizar o Melhor Envio.");
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
