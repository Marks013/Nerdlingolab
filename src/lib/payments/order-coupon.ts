import type { PaidOrder, TransactionClient } from "@/lib/payments/mercadopago-webhook";

export async function registerOrderCouponRedemption(
  tx: TransactionClient,
  order: PaidOrder
): Promise<void> {
  if (!order.couponId || order.discountCents <= 0) {
    return;
  }

  await tx.coupon.update({
    where: { id: order.couponId },
    data: {
      usedCount: {
        increment: 1
      }
    }
  });

  await tx.couponRedemption.upsert({
    where: {
      idempotencyKey: `coupon:${order.id}:${order.couponId}`
    },
    create: {
      couponId: order.couponId,
      userId: order.userId,
      orderId: order.id,
      discountCents: order.discountCents,
      idempotencyKey: `coupon:${order.id}:${order.couponId}`
    },
    update: {}
  });
}
