import { ShipmentStatus } from "@/generated/prisma/client";
import { sendShipmentOverdueAdminEmail } from "@/lib/email/transactional";
import { prisma } from "@/lib/prisma";

export interface OverdueShipmentSummary {
  count: number;
}

const finalShipmentStatuses = [ShipmentStatus.CANCELLED, ShipmentStatus.DELIVERED];

export async function notifyOverdueShipments(): Promise<OverdueShipmentSummary> {
  const now = new Date();
  const overdueShipments = await prisma.shipment.findMany({
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true
        }
      }
    },
    orderBy: { estimatedDeliveryAt: "asc" },
    take: 50,
    where: {
      deliveredAt: null,
      estimatedDeliveryAt: { lt: now },
      status: { notIn: finalShipmentStatuses }
    }
  });

  const unnotifiedShipments = overdueShipments.filter((shipment) => !shipment.overdueNotifiedAt);

  for (const shipment of unnotifiedShipments) {
    if (!shipment.estimatedDeliveryAt) {
      continue;
    }

    await sendShipmentOverdueAdminEmail({
      carrierName: shipment.carrierName,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt,
      orderId: shipment.order.id,
      orderNumber: shipment.order.orderNumber,
      trackingNumber: shipment.trackingNumber ?? shipment.externalShipmentId
    });

    await prisma.shipment.update({
      data: {
        overdueNotifiedAt: new Date(),
        status: ShipmentStatus.DELAYED
      },
      where: { id: shipment.id }
    });
  }

  return { count: overdueShipments.length };
}
