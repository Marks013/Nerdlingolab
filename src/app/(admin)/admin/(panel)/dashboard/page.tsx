import { Boxes, CircleDollarSign, Gift, ShoppingCart } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getAdminDashboardMetrics } from "@/lib/dashboard/queries";
import { formatCurrency } from "@/lib/format";

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
      icon: ShoppingCart
    },
    {
      label: "Receita",
      value: formatCurrency(dashboardMetrics.revenueCents),
      detail: `${formatCurrency(dashboardMetrics.revenueTodayCents)} hoje · ${formatCurrency(dashboardMetrics.revenueYearCents)} em ${dashboardMetrics.currentYear}`,
      icon: CircleDollarSign
    },
    {
      label: "Produtos ativos",
      value: String(dashboardMetrics.activeProductsCount),
      detail: "Na vitrine",
      icon: Boxes
    },
    {
      label: "Pontos emitidos",
      value: String(dashboardMetrics.loyaltyPointsIssued),
      detail: `${dashboardMetrics.loyaltyPointsIssuedYear} em ${dashboardMetrics.currentYear}`,
      icon: Gift
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <metric.icon className="h-5 w-5 text-primary" />
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle>{metric.value}</CardTitle>
                <p className="text-sm text-muted-foreground">{metric.detail}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
