import { Eye, PackageCheck, Search, Truck } from "lucide-react";
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
        <CardDescription>Pagamentos, entrega, cliente e itens com leitura operacional rápida.</CardDescription>
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

        <div className="grid gap-3">
          {orders.map((order) => {
            const latestShipment = order.shipments[0];

            return (
              <article key={order.id} className="grid gap-4 rounded-lg border bg-background p-4 lg:grid-cols-[minmax(260px,1fr)_1fr_180px_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {order.user?.name ?? "Cliente"} / {order.user?.email ?? order.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="grid gap-2 text-sm">
                  <span className="inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold">
                    {formatOrderStatus(order.status)}
                  </span>
                  <span className="inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {formatPaymentStatus(order.paymentStatus)}
                  </span>
                </div>
                <div className="grid gap-1 text-sm">
                  <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
                  <p className="text-muted-foreground">{order._count.items} item{order._count.items === 1 ? "" : "s"}</p>
                  <p className="inline-flex items-center text-xs text-muted-foreground">
                    <Truck className="mr-1 h-3.5 w-3.5" />
                    {order.shippingServiceName ?? "Frete não definido"}
                  </p>
                  <p className="inline-flex items-center text-xs text-muted-foreground">
                    <PackageCheck className="mr-1 h-3.5 w-3.5" />
                    {order.fulfillmentStatus}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {latestShipment ? (
                    <Button asChild className="h-10 px-4">
                      <Link href={`/admin/pedidos/${order.id}#rastreamento`}>
                        <Truck className="mr-2 h-4 w-4" />
                        Rastrear
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild className="h-10 px-4" variant="outline">
                    <Link href={`/admin/pedidos/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver pedido
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
          {orders.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
