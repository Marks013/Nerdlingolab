import * as Sentry from "@sentry/nextjs";

import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { sendOrderCanceledEmail } from "@/lib/email/transactional";
import { releaseInventoryReservations } from "@/lib/inventory/reservations";
import { prisma } from "@/lib/prisma";

const defaultPendingPaymentTtlHours = 24;
const maxPendingPaymentTtlHours = 24 * 14;

export function getPendingPaymentTtlHours(): number {
  const parsed = Number(process.env.CHECKOUT_PENDING_PAYMENT_TTL_HOURS);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultPendingPaymentTtlHours;
  }

  return Math.min(Math.floor(parsed), maxPendingPaymentTtlHours);
}

export function getPendingPaymentExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + getPendingPaymentTtlHours() * 60 * 60 * 1000);
}

export async function expireStalePendingPaymentOrders({
  limit = 30,
  now = new Date()
}: {
  limit?: number;
  now?: Date;
} = {}): Promise<number> {
  const expiresBefore = new Date(now.getTime() - getPendingPaymentTtlHours() * 60 * 60 * 1000);
  const staleOrders = await prisma.order.findMany({
    where: {
      canceledAt: null,
      createdAt: {
        lt: expiresBefore
      },
      paidAt: null,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING_PAYMENT
    },
    include: {
      items: {
        select: {
          quantity: true,
          variantId: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    take: limit
  });

  let expiredCount = 0;

  for (const order of staleOrders) {
    try {
      const didExpire = await prisma.$transaction(async (tx) => {
        const update = await tx.order.updateMany({
          where: {
            canceledAt: null,
            id: order.id,
            paidAt: null,
            paymentStatus: PaymentStatus.PENDING,
            status: OrderStatus.PENDING_PAYMENT
          },
          data: {
            canceledAt: now,
            cancellationReason: `Pedido cancelado automaticamente porque o prazo de pagamento de ${getPendingPaymentTtlHours()} hora(s) expirou.`,
            paymentStatus: PaymentStatus.CANCELED,
            status: OrderStatus.CANCELED
          }
        });

        if (update.count !== 1) {
          return false;
        }

        await releaseInventoryReservations(tx, order.items);
        return true;
      });

      if (didExpire) {
        expiredCount += 1;
        await sendOrderCanceledEmail({
          cancellationReason: `O prazo de pagamento de ${getPendingPaymentTtlHours()} hora(s) expirou, então a reserva do pedido foi cancelada automaticamente.`,
          orderId: order.id
        });
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          feature: "orders",
          operation: "expire-pending-payment"
        }
      });
    }
  }

  return expiredCount;
}
