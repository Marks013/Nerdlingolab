import { Eye, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOrderStatus, formatPaymentStatus } from "@/features/orders/status-labels";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  adminOrderStatuses,
  adminPaymentStatuses,
  type AdminOrderFilters,
  type AdminOrderListItem
} from "@/lib/orders/queries";

interface OrdersTableProps {
  filters: AdminOrderFilters;
  orders: AdminOrderListItem[];
}

export function OrdersTable({ filters, orders }: OrdersTableProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos</CardTitle>
        <CardDescription>Últimos 100 pedidos conforme os filtros aplicados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action="/admin/pedidos" className="grid gap-3 rounded-md border bg-background p-4 lg:grid-cols-2 2xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto_auto]">
          <label className="grid gap-2 text-sm font-medium">
            Buscar
            <input
              className="h-10 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={filters.query ?? ""}
              maxLength={120}
              name="busca"
              placeholder="Pedido, cliente ou e-mail"
              type="search"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Situação
            <select
              className="h-10 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={filters.orderStatus ?? ""}
              name="situacao"
            >
              <option value="">Todas</option>
              {adminOrderStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatOrderStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Pagamento
            <select
              className="h-10 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={filters.paymentStatus ?? ""}
              name="pagamento"
            >
              <option value="">Todos</option>
              {adminPaymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatPaymentStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Início
            <input
              className="h-10 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={filters.startDate ?? ""}
              name="inicio"
              type="date"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Fim
            <input
              className="h-10 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={filters.endDate ?? ""}
              name="fim"
              type="date"
            />
          </label>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <Search className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
          <div className="flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href="/admin/pedidos">Limpar</Link>
            </Button>
          </div>
        </form>

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
