import { BarChart3, CircleDollarSign, Gift, ShoppingCart, TicketPercent } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnualReportChart } from "@/features/reports/components/annual-report-chart";
import { formatCurrency } from "@/lib/format";
import { getAdminAnnualReport } from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage(): Promise<React.ReactElement> {
  const annualReport = await getAdminAnnualReport();

  const reportCards = [
    {
      label: "Receita no ano",
      value: formatCurrency(annualReport.totals.revenueCents),
      detail: String(annualReport.currentYear),
      icon: CircleDollarSign
    },
    {
      label: "Pedidos pagos",
      value: String(annualReport.totals.paidOrdersCount),
      detail: String(annualReport.currentYear),
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
          <p className="text-sm text-muted-foreground">{annualReport.currentYear}</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-normal">
            <BarChart3 className="h-7 w-7 text-primary" />
            Relatórios
          </h1>
        </div>

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
