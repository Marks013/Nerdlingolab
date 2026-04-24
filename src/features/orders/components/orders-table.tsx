import { Eye } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOrderStatus, formatPaymentStatus } from "@/features/orders/status-labels";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AdminOrderListItem } from "@/lib/orders/queries";

interface OrdersTableProps {
  orders: AdminOrderListItem[];
}

export function OrdersTable({ orders }: OrdersTableProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos</CardTitle>
        <CardDescription>Últimos 100 pedidos criados no checkout.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-md border">
          {orders.map((order) => (
            <div key={order.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {order.user?.email ?? order.email} · {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{formatOrderStatus(order.status)}</p>
                <p>{formatPaymentStatus(order.paymentStatus)}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
                <p className="text-muted-foreground">{order._count.items} item(ns)</p>
              </div>
              <Button asChild size="icon" variant="outline">
                <Link href={`/admin/pedidos/${order.id}`} title="Ver pedido">
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
          {orders.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
