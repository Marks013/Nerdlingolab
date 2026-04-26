import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  WebhookStatus
} from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

import { sendOrderPaidEmail } from "@/lib/email/transactional";
import { assertMercadoPagoConfigured, mercadoPagoPayment } from "@/lib/mercadopago";
import { registerOrderCouponRedemption } from "@/lib/payments/order-coupon";
import { decrementInventoryForOrder } from "@/lib/payments/order-inventory";
import { registerOrderLoyaltyLedger } from "@/lib/payments/order-rewards";
import { prisma } from "@/lib/prisma";

interface ProcessMercadoPagoPaymentInput {
  paymentId: string;
  webhookEventId: string;
}

interface MercadoPagoPaymentResponse {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
}

export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type PaidOrder = NonNullable<
  Awaited<ReturnType<TransactionClient["order"]["findUnique"]>>
> & {
  items: Awaited<ReturnType<TransactionClient["orderItem"]["findMany"]>>;
};

export async function processMercadoPagoPayment({
  paymentId,
  webhookEventId
}: ProcessMercadoPagoPaymentInput): Promise<void> {
  assertMercadoPagoConfigured();

  const payment = await mercadoPagoPayment.get({ id: paymentId }) as MercadoPagoPaymentResponse;

  await processApprovedMercadoPagoPayment({
    payment,
    paymentId,
    webhookEventId
  });
}

export async function processApprovedMercadoPagoPayment({
  payment,
  paymentId,
  webhookEventId
}: {
  payment: MercadoPagoPaymentResponse;
  paymentId: string;
  webhookEventId: string;
}): Promise<void> {
  if (payment.status !== "approved" || !payment.external_reference) {
    await markWebhookEvent(webhookEventId, WebhookStatus.IGNORED, "Pagamento não aprovado.");
    return;
  }

  let paidOrderId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: payment.external_reference },
      include: {
        items: true,
        user: true
      }
    });

    if (!order) {
      await tx.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: WebhookStatus.FAILED,
          errorMessage: "Pedido não encontrado."
        }
      });
      return;
    }

    if (order.paymentStatus === PaymentStatus.APPROVED) {
      await tx.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: WebhookStatus.IGNORED,
          processedAt: new Date(),
          errorMessage: "Pedido ja processado."
        }
      });
      return;
    }

    if (!isPaymentAmountValid(payment, order.totalCents)) {
      await tx.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: WebhookStatus.FAILED,
          processedAt: new Date(),
          errorMessage: "Valor pago não confere com o total do pedido."
        }
      });
      return;
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.APPROVED,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        mercadoPagoPaymentId: String(payment.id ?? paymentId),
        mercadoPagoStatus: payment.status,
        paidAt: new Date()
      }
    });

    await decrementInventoryForOrder(tx, order);
    await registerOrderCouponRedemption(tx, order);
    await registerOrderLoyaltyLedger(tx, order);
    paidOrderId = order.id;

    await tx.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: new Date()
      }
    });
  });

  if (paidOrderId) {
    await sendOrderPaidEmail(paidOrderId);
  }
}

function isPaymentAmountValid(
  payment: MercadoPagoPaymentResponse,
  expectedTotalCents: number
): boolean {
  if (typeof payment.transaction_amount !== "number") {
    return false;
  }

  const paidCents = Math.round(payment.transaction_amount * 100);

  return paidCents === expectedTotalCents;
}

async function markWebhookEvent(
  webhookEventId: string,
  status: WebhookStatus,
  message: string
): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status,
      processedAt: new Date(),
      errorMessage: message
    }
  });
}
