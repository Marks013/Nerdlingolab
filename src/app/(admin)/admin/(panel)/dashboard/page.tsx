/* eslint-disable @next/next/no-html-link-for-pages */
import { AlertTriangle, Boxes, CircleDollarSign, Gift, Headphones, MailCheck, ShoppingCart, TicketPercent } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getAdminDashboardMetrics } from "@/lib/dashboard/queries";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage(): Promise<React.ReactElement> {
  const [session, dashboardMetrics] = await Promise.all([
    auth(),
    getAdminDashboardMetrics()
  ]);
  const metrics = [
    {
      label: "Pedidos pagos",
      value: String(dashboardMetrics.paidOrdersCount),
      detail: `${dashboardMetrics.paidOrdersTodayCount} hoje · ${dashboardMetrics.paidOrdersYearCount} em ${dashboardMetrics.currentYear}`,
      href: "/admin/pedidos",
      icon: ShoppingCart
    },
    {
      label: "Receita",
      value: formatCurrency(dashboardMetrics.revenueCents),
      detail: `${formatCurrency(dashboardMetrics.revenueTodayCents)} hoje · ${formatCurrency(dashboardMetrics.revenueYearCents)} em ${dashboardMetrics.currentYear}`,
      href: "/admin/relatorios",
      icon: CircleDollarSign
    },
    {
      label: "Produtos ativos",
      value: String(dashboardMetrics.activeProductsCount),
      detail: `${dashboardMetrics.lowStockVariants.length} variantes em atenção`,
      href: "/admin/produtos",
      icon: Boxes
    },
    {
      label: "Pontos emitidos",
      value: String(dashboardMetrics.loyaltyPointsIssued),
      detail: `${dashboardMetrics.loyaltyPointsIssuedYear} em ${dashboardMetrics.currentYear}`,
      href: "/admin/fidelidade",
      icon: Gift
    },
    {
      label: "Suporte aberto",
      value: String(dashboardMetrics.openSupportTicketsCount),
      detail: "Tickets abertos ou em andamento",
      href: "/admin/suporte",
      icon: Headphones
    },
    {
      label: "Pedidos pendentes",
      value: String(dashboardMetrics.pendingOrdersCount),
      detail: "Aguardando pagamento",
      href: "/admin/pedidos?status=PENDING_PAYMENT",
      icon: AlertTriangle
    },
    {
      label: "Cupons públicos",
      value: String(dashboardMetrics.publicCouponsCount),
      detail: "Visíveis na página de cupons",
      href: "/admin/cupons",
      icon: TicketPercent
    },
    {
      label: "Newsletter",
      value: String(dashboardMetrics.newsletterActiveCount),
      detail: "Inscritos ativos",
      href: "/admin/newsletter",
      icon: MailCheck
    }
  ];

  return (
    <main>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm text-muted-foreground">Admin NerdLingoLab</p>
          <h1 className="text-3xl font-bold tracking-normal">Dashboard</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{session?.user?.name ?? session?.user?.email ?? "Operador"}</CardTitle>
            <CardDescription>
              Acompanhe vendas, catálogo, cupons e recompensas em um só lugar.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <a className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={metric.href} key={metric.label}>
              <Card className="h-full transition hover:border-primary">
                <CardHeader>
                  <metric.icon className="h-5 w-5 text-primary" />
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle>{metric.value}</CardTitle>
                  <p className="text-sm text-muted-foreground">{metric.detail}</p>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Pedidos recentes</CardTitle>
                <CardDescription>Status financeiro e total dos últimos pedidos.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="/admin/pedidos">Ver pedidos</a>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {dashboardMetrics.recentOrders.map((order) => (
                  <div className="grid gap-2 p-3 text-sm md:grid-cols-[120px_minmax(0,1fr)_130px_150px]" key={order.id}>
                    <a className="font-mono font-semibold text-primary" href={`/admin/pedidos/${order.id}`}>
                      {order.orderNumber}
                    </a>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{order.email}</p>
                      <p className="text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <p>{order.paymentStatus}</p>
                    <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
                  </div>
                ))}
                {dashboardMetrics.recentOrders.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Nenhum pedido criado ainda.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estoque em atenção</CardTitle>
              <CardDescription>Variantes ativas com 5 unidades ou menos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {dashboardMetrics.lowStockVariants.map((variant) => (
                  <div className="grid gap-1 p-3 text-sm" key={variant.sku}>
                    <a className="font-semibold text-primary" href={`/admin/produtos/${variant.product.id}/editar`}>
                      {variant.product.title}
                    </a>
                    <p className="text-muted-foreground">
                      {variant.title} · SKU {variant.sku}
                    </p>
                    <p className={variant.stockQuantity === 0 ? "font-semibold text-destructive" : "font-semibold"}>
                      {variant.stockQuantity} unidades
                    </p>
                  </div>
                ))}
                {dashboardMetrics.lowStockVariants.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Nenhuma variante crítica no momento.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
