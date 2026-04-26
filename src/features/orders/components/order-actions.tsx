import { OrderStatus } from "@/generated/prisma/client";

import {
  cancelUnpaidOrder,
  markOrderAsDelivered,
  markOrderAsProcessing,
  markOrderAsShipped
} from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminOrderDetail } from "@/lib/orders/queries";

interface OrderActionsProps {
  order: AdminOrderDetail;
}

export function OrderActions({ order }: OrderActionsProps): React.ReactElement {
  const canCancel = !order.paidAt && order.status !== OrderStatus.CANCELED;
  const canPrepare = order.status === OrderStatus.PAID;
  const canShip = order.status === OrderStatus.PROCESSING;
  const canDeliver = order.status === OrderStatus.SHIPPED;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações</CardTitle>
        <CardDescription>Atualize o andamento do pedido.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <form action={markOrderAsProcessing.bind(null, order.id)}>
          <Button className="w-full" disabled={!canPrepare} type="submit" variant="outline">
            Preparar pedido
          </Button>
        </form>
        <form action={markOrderAsShipped.bind(null, order.id)}>
          <Button className="w-full" disabled={!canShip} type="submit" variant="outline">
            Marcar como enviado
          </Button>
        </form>
        <form action={markOrderAsDelivered.bind(null, order.id)}>
          <Button className="w-full" disabled={!canDeliver} type="submit" variant="outline">
            Marcar como entregue
          </Button>
        </form>
        <form action={cancelUnpaidOrder.bind(null, order.id)}>
          <Button className="w-full" disabled={!canCancel} type="submit" variant="outline">
            Cancelar pedido
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
