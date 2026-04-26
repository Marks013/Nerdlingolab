import { InventoryLedgerType } from "@/generated/prisma/client";

import type { PaidOrder, TransactionClient } from "@/lib/payments/mercadopago-webhook";

export async function decrementInventoryForOrder(
  tx: TransactionClient,
  order: PaidOrder
): Promise<void> {
  for (const item of order.items) {
    if (!item.variantId) {
      continue;
    }

    const updateResult = await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        reservedQuantity: {
          gte: item.quantity
        },
        stockQuantity: {
          gte: item.quantity
        }
      },
      data: {
        reservedQuantity: {
          decrement: item.quantity
        },
        stockQuantity: {
          decrement: item.quantity
        }
      }
    });

    if (updateResult.count !== 1) {
      const fallbackUpdateResult = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stockQuantity: {
            gte: item.quantity
          }
        },
        data: {
          stockQuantity: {
            decrement: item.quantity
          }
        }
      });

      if (fallbackUpdateResult.count !== 1) {
        throw new Error(`Estoque insuficiente para o item ${item.id}.`);
      }
    }

    const updatedVariant = await tx.productVariant.findUniqueOrThrow({
      where: { id: item.variantId }
    });

    await tx.inventoryLedger.upsert({
      where: {
        idempotencyKey: `stock:${order.id}:${item.id}`
      },
      create: {
        productId: item.productId,
        variantId: item.variantId,
        orderId: order.id,
        type: InventoryLedgerType.SALE,
        quantityDelta: -item.quantity,
        quantityAfter: updatedVariant.stockQuantity,
        reason: `Pedido pago ${order.orderNumber}`,
        idempotencyKey: `stock:${order.id}:${item.id}`
      },
      update: {}
    });
  }
}
