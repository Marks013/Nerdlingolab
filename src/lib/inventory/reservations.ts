import type { PrismaClient } from "@/generated/prisma/client";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface InventoryReservationItem {
  quantity: number;
  variantId?: string | null;
}

export async function reserveInventoryForCheckout(
  tx: TransactionClient,
  items: InventoryReservationItem[]
): Promise<void> {
  for (const item of items) {
    if (!item.variantId) {
      continue;
    }

    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: item.variantId },
      select: {
        reservedQuantity: true,
        stockQuantity: true
      }
    });
    const nextReservedQuantity = variant.reservedQuantity + item.quantity;

    if (nextReservedQuantity > variant.stockQuantity) {
      throw new Error("Estoque insuficiente para reservar o item.");
    }

    const updateResult = await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        reservedQuantity: variant.reservedQuantity,
        stockQuantity: {
          gte: nextReservedQuantity
        }
      },
      data: {
        reservedQuantity: {
          increment: item.quantity
        }
      }
    });

    if (updateResult.count !== 1) {
      throw new Error("Estoque alterado durante a reserva. Tente novamente.");
    }
  }
}

export async function releaseInventoryReservations(
  tx: TransactionClient,
  items: InventoryReservationItem[]
): Promise<void> {
  for (const item of items) {
    if (!item.variantId) {
      continue;
    }

    await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        reservedQuantity: {
          gte: item.quantity
        }
      },
      data: {
        reservedQuantity: {
          decrement: item.quantity
        }
      }
    });
  }
}
