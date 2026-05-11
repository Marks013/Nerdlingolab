import { OrderStatus } from "@/generated/prisma/client";
import { Ban, CheckCircle2, PackageCheck, ShieldAlert, Truck } from "lucide-react";

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
    <Card className="overflow-hidden border-orange-100 shadow-sm dark:border-orange-500/30">
      <CardHeader className="bg-orange-50/80 dark:bg-orange-950/20">
        <CardTitle className="flex items-center gap-2 text-balance">
          <ShieldAlert className="size-5 text-primary" />
          Central de ação
        </CardTitle>
        <CardDescription>Atualize o pedido com clareza. Cada etapa importante notifica o cliente por e-mail.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form action={markOrderAsProcessing.bind(null, order.id)}>
          <Button className="w-full border-orange-200 bg-orange-600 text-white hover:bg-orange-700 disabled:bg-muted disabled:text-muted-foreground" disabled={!canPrepare} type="submit">
            <PackageCheck className="mr-2 size-4" />
            Preparar pedido
          </Button>
        </form>
        <form action={markOrderAsShipped.bind(null, order.id)}>
          <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground" disabled={!canShip} type="submit">
            <Truck className="mr-2 size-4" />
            Marcar como enviado
          </Button>
        </form>
        <form action={markOrderAsDelivered.bind(null, order.id)}>
          <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground" disabled={!canDeliver} type="submit">
            <CheckCircle2 className="mr-2 size-4" />
            Marcar como entregue
          </Button>
        </form>
        <form action={cancelUnpaidOrder.bind(null, order.id)} className="grid gap-2 rounded-lg border border-red-200 bg-red-50/60 p-3 dark:border-red-500/40 dark:bg-red-950/20">
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
            <Ban className="mr-2 size-4" />
            Cancelar pedido
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
