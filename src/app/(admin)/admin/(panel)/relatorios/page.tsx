import { BarChart3, CircleDollarSign, Gift, ShoppingCart, TicketPercent } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnualReportChart } from "@/features/reports/components/annual-report-chart";
import { formatCurrency } from "@/lib/format";
import { getAdminAnnualReport, resolveReportFilters } from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

interface AdminReportsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminReportsPage({
  searchParams
}: AdminReportsPageProps): Promise<React.ReactElement> {
  const filters = parseReportFilters(await searchParams);
  const annualReport = await getAdminAnnualReport(filters);
  const csvHref = `/api/admin/reports/annual.csv?inicio=${annualReport.filters.startDate}&fim=${annualReport.filters.endDate}`;
  const pdfHref = `/api/admin/reports/annual.pdf?inicio=${annualReport.filters.startDate}&fim=${annualReport.filters.endDate}`;

  const reportCards = [
    {
      label: "Receita no período",
      value: formatCurrency(annualReport.totals.revenueCents),
      detail: `${formatDateLabel(annualReport.filters.startDate)} a ${formatDateLabel(annualReport.filters.endDate)}`,
      icon: CircleDollarSign
    },
    {
      label: "Pedidos pagos",
      value: String(annualReport.totals.paidOrdersCount),
      detail: `${formatDateLabel(annualReport.filters.startDate)} a ${formatDateLabel(annualReport.filters.endDate)}`,
      icon: ShoppingCart
    },
    {
      label: "Descontos aplicados",
      value: formatCurrency(
        annualReport.totals.couponDiscountCents + annualReport.totals.loyaltyDiscountCents
      ),
      detail: "Cupons e recompensas",
      icon: TicketPercent
    },
    {
      label: "Pontos emitidos",
      value: String(annualReport.totals.loyaltyPointsIssued),
      detail: `${annualReport.totals.loyaltyPointsRedeemed} resgatados`,
      icon: Gift
    }
  ];

  return (
    <main>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatDateLabel(annualReport.filters.startDate)} a {formatDateLabel(annualReport.filters.endDate)}
          </p>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-normal">
            <BarChart3 className="h-7 w-7 text-primary" />
            Relatórios
          </h1>
        </div>

        <form action="/admin/relatorios" className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1fr_1fr_auto_auto_auto]">
          <label className="grid gap-2 text-sm font-medium">
            Início
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={annualReport.filters.startDate}
              name="inicio"
              type="date"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Fim
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary"
              defaultValue={annualReport.filters.endDate}
              name="fim"
              type="date"
            />
          </label>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              Filtrar
            </Button>
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <AnnualReportChart monthlyItems={annualReport.monthlyItems} />
      </div>
    </main>
  );
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
    startDate: normalizeSearchParam(searchParams?.inicio),
    endDate: normalizeSearchParam(searchParams?.fim)
  });
}
