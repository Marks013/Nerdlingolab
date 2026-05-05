import { OrderStatus } from "@/generated/prisma/client";

import {
  cancelUnpaidOrder,
  markOrderAsDelivered,
  markOrderAsProcessing,
  markOrderAsShipped
} from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AdminOrderDetail } from "@/lib/orders/queries";

interface OrderActionsProps {
  order: AdminOrderDetail;
}

export function OrderActions({ order }: OrderActionsProps): React.ReactElement {
  const canCancel =
    order.status !== OrderStatus.CANCELED &&
    order.status !== OrderStatus.REFUNDED &&
    order.status !== OrderStatus.SHIPPED &&
    order.status !== OrderStatus.DELIVERED;
  const cancelHelpText = order.paidAt
    ? "Pedido pago: o sistema solicitará reembolso total ao Mercado Pago antes de marcar como reembolsado."
    : "Pedido não pago: o sistema cancelará a reserva e avisará o cliente.";
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
          <Button className="w-full" disabled={!canPrepare} type="submit">
            Preparar pedido
          </Button>
        </form>
        <form action={markOrderAsShipped.bind(null, order.id)}>
          <Button className="w-full" disabled={!canShip} type="submit">
            Marcar como enviado
          </Button>
        </form>
        <form action={markOrderAsDelivered.bind(null, order.id)}>
          <Button className="w-full" disabled={!canDeliver} type="submit">
            Marcar como entregue
          </Button>
        </form>
        <form action={cancelUnpaidOrder.bind(null, order.id)} className="grid gap-2 rounded-lg border border-red-200 bg-red-50/60 p-3 dark:bg-red-950/20">
          <label className="grid gap-2 text-sm font-medium">
            Justificativa do cancelamento
            <Textarea
              disabled={!canCancel}
              maxLength={800}
              minLength={12}
              name="cancellationReason"
              placeholder="Explique ao cliente por que o pedido será cancelado."
              required={canCancel}
              rows={4}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {cancelHelpText} O cliente receberá um e-mail automático usando o template Pedido cancelado.
          </p>
          <Button className="w-full" disabled={!canCancel} type="submit" variant="destructive">
            Cancelar pedido
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
