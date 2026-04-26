import type { PaidOrder, TransactionClient } from "@/lib/payments/mercadopago-webhook";

export async function registerOrderCouponRedemption(
  tx: TransactionClient,
  order: PaidOrder
): Promise<void> {
  if (!order.couponId || order.discountCents <= 0) {
    return;
  }

  const coupon = await tx.coupon.findUniqueOrThrow({
    where: { id: order.couponId }
  });

  if (coupon.perCustomerLimit) {
    if (!order.userId) {
      throw new Error("Cupom restrito exige cliente autenticado.");
    }

    const customerRedemptions = await tx.couponRedemption.count({
      where: {
        couponId: order.couponId,
        userId: order.userId
      }
    });

    if (customerRedemptions >= coupon.perCustomerLimit) {
      throw new Error("Limite de uso do cupom por cliente atingido.");
    }
  }

  const updateResult = await tx.coupon.updateMany({
    where: {
      id: order.couponId,
      OR: [{ usageLimit: null }, { usedCount: { lt: coupon.usageLimit ?? 0 } }]
    },
    data: {
      usedCount: {
        increment: 1
      }
    }
  });

  if (updateResult.count !== 1) {
    throw new Error("Limite global de uso do cupom atingido.");
  }

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
