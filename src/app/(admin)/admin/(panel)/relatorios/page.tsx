import { BarChart3, CircleDollarSign, Gift, PackageSearch, ShoppingCart, TicketPercent, UsersRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnualReportChart } from "@/features/reports/components/annual-report-chart";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getAdminAnnualReport, resolveReportFilters, type AdminReportBreakdownItem } from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

interface AdminReportsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminReportsPage({
  searchParams
}: AdminReportsPageProps): Promise<React.ReactElement> {
  const filters = parseReportFilters(await searchParams);
  const report = await getAdminAnnualReport(filters);
  const csvHref = `/api/admin/reports/annual.csv?inicio=${report.filters.startDate}&fim=${report.filters.endDate}`;
  const pdfHref = `/api/admin/reports/annual.pdf?inicio=${report.filters.startDate}&fim=${report.filters.endDate}`;

  const reportCards = [
    {
      detail: `${formatDateLabel(report.filters.startDate)} a ${formatDateLabel(report.filters.endDate)}`,
      icon: CircleDollarSign,
      label: "Receita aprovada",
      value: formatCurrency(report.totals.revenueCents)
    },
    {
      detail: `Ticket medio ${formatCurrency(report.totals.averageTicketCents)}`,
      icon: ShoppingCart,
      label: "Pedidos pagos",
      value: String(report.totals.paidOrdersCount)
    },
    {
      detail: `${report.totals.couponOrdersCount} pedido(s) com desconto`,
      icon: TicketPercent,
      label: "Descontos",
      value: formatCurrency(report.totals.couponDiscountCents + report.totals.loyaltyDiscountCents)
    },
    {
      detail: `${report.totals.loyaltyPointsRedeemed} resgatados`,
      icon: Gift,
      label: "Pontos emitidos",
      value: String(report.totals.loyaltyPointsIssued)
    },
    {
      detail: `${report.totals.productsSoldCount} itens vendidos`,
      icon: PackageSearch,
      label: "Subtotal bruto",
      value: formatCurrency(report.totals.grossSubtotalCents)
    },
    {
      detail: `${report.totals.pendingPaymentCount} pendente(s) / ${report.totals.canceledOrdersCount} cancelado(s)`,
      icon: UsersRound,
      label: "Novos clientes",
      value: String(report.totals.newCustomersCount)
    }
  ];

  return (
    <main>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatDateLabel(report.filters.startDate)} a {formatDateLabel(report.filters.endDate)}
          </p>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-normal">
            <BarChart3 className="h-7 w-7 text-primary" />
            Relatorios
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Visao administrativa de vendas, pagamentos, produtos, cupons e clientes do e-commerce.
          </p>
        </div>

        <form action="/admin/relatorios" className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_auto_auto_auto]">
          <label className="grid gap-2 text-sm font-medium">
            Inicio
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={report.filters.startDate}
              name="inicio"
              type="date"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Fim
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={report.filters.endDate}
              name="fim"
              type="date"
            />
          </label>
          <div className="flex items-end">
            <Button className="w-full" type="submit">Filtrar</Button>
          </div>
          <div className="flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href={csvHref}>Exportar CSV</Link>
            </Button>
          </div>
          <div className="flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href={pdfHref}>Exportar PDF</Link>
            </Button>
          </div>
        </form>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {reportCards.map((reportCard) => (
            <Card key={reportCard.label}>
              <CardHeader>
                <reportCard.icon className="h-5 w-5 text-primary" />
                <CardDescription>{reportCard.label}</CardDescription>
                <CardTitle>{reportCard.value}</CardTitle>
                <p className="text-sm text-muted-foreground">{reportCard.detail}</p>
              </CardHeader>
            </Card>
          ))}
        </div>

        <AnnualReportChart monthlyItems={report.monthlyItems} />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Produtos mais fortes</CardTitle>
              <CardDescription>Ranking por receita aprovada no periodo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {report.topProducts.map((product) => (
                  <div className="grid gap-2 p-3 text-sm md:grid-cols-[minmax(0,1fr)_90px_140px]" key={product.productId}>
                    <p className="truncate font-semibold">{product.productTitle}</p>
                    <p>{product.quantity} un.</p>
                    <p className="font-semibold">{formatCurrency(product.revenueCents)}</p>
                  </div>
                ))}
                {report.topProducts.length === 0 ? <EmptyRow>Nenhum produto vendido no periodo.</EmptyRow> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cupons no periodo</CardTitle>
              <CardDescription>Cupons que mais consumiram desconto.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {report.couponPerformance.map((coupon) => (
                  <div className="grid gap-1 p-3 text-sm" key={coupon.code}>
                    <p className="font-mono font-semibold">{coupon.code}</p>
                    <p className="text-muted-foreground">
                      {coupon.ordersCount} pedido(s) / {formatCurrency(coupon.discountCents)}
                    </p>
                  </div>
                ))}
                {report.couponPerformance.length === 0 ? <EmptyRow>Nenhum cupom usado no periodo.</EmptyRow> : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <BreakdownCard items={report.paymentStatusItems} title="Status de pagamento" />
          <BreakdownCard items={report.orderStatusItems} title="Status dos pedidos" />
          <Card>
            <CardHeader>
              <CardTitle>Pedidos recentes</CardTitle>
              <CardDescription>Ultimos pedidos criados dentro do filtro.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {report.recentOrders.map((order) => (
                  <Link className="block p-3 text-sm transition hover:bg-muted/40" href={`/admin/pedidos/${order.id}`} key={order.id}>
                    <span className="block font-semibold">{order.orderNumber}</span>
                    <span className="block text-muted-foreground">
                      {formatCurrency(order.totalCents)} / {order.paymentStatus} / {formatDateTime(order.createdAt)}
                    </span>
                  </Link>
                ))}
                {report.recentOrders.length === 0 ? <EmptyRow>Nenhum pedido recente no periodo.</EmptyRow> : null}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function BreakdownCard({ items, title }: { items: AdminReportBreakdownItem[]; title: string }): React.ReactElement {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{total} registro(s) no periodo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {items.map((item) => (
            <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-3 rounded-md border px-3 py-2 text-sm" key={item.label}>
              <span className="truncate">{item.label}</span>
              <span className="text-right font-semibold tabular-nums">{item.value}</span>
            </div>
          ))}
          {items.length === 0 ? <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Sem registros.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="p-3 text-sm text-muted-foreground">{children}</p>;
}

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseReportFilters(searchParams?: Record<string, string | string[] | undefined>) {
  return resolveReportFilters({
    endDate: normalizeSearchParam(searchParams?.fim),
    startDate: normalizeSearchParam(searchParams?.inicio)
  });
}
