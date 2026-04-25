"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { MonthlyReportItem } from "@/lib/reports/queries";

interface AnnualReportChartProps {
  monthlyItems: MonthlyReportItem[];
}

interface ChartTooltipPayload {
  name?: string;
  value?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

interface RevenueChartItem {
  monthLabel: string;
  revenueCents: number;
  couponDiscountCents: number;
  loyaltyDiscountCents: number;
}

interface LoyaltyChartItem {
  monthLabel: string;
  loyaltyPointsIssued: number;
  loyaltyPointsRedeemed: number;
}

function RevenueTooltip({ active, payload, label }: ChartTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 text-sm shadow-sm">
      <p className="font-medium">{label}</p>
      {payload.map((item) => (
        <p className="text-muted-foreground" key={item.name}>
          {item.name}: {formatCurrency(item.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

function PointsTooltip({ active, payload, label }: ChartTooltipProps): React.ReactElement | null {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 text-sm shadow-sm">
      <p className="font-medium">{label}</p>
      {payload.map((item) => (
        <p className="text-muted-foreground" key={item.name}>
          {item.name}: {item.value ?? 0}
        </p>
      ))}
    </div>
  );
}

export function AnnualReportChart({ monthlyItems }: AnnualReportChartProps): React.ReactElement {
  const revenueData: RevenueChartItem[] = monthlyItems.map((item) => ({
    monthLabel: item.monthLabel,
    revenueCents: item.revenueCents,
    couponDiscountCents: item.couponDiscountCents,
    loyaltyDiscountCents: item.loyaltyDiscountCents
  }));

  const loyaltyData: LoyaltyChartItem[] = monthlyItems.map((item) => ({
    monthLabel: item.monthLabel,
    loyaltyPointsIssued: item.loyaltyPointsIssued,
    loyaltyPointsRedeemed: item.loyaltyPointsRedeemed
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Valores por mês</CardTitle>
          <CardDescription>Receita e descontos confirmados no ano.</CardDescription>
        </CardHeader>
        <CardContent className="h-80 min-w-0">
          <ResponsiveContainer height={320} minWidth={0} width="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="monthLabel" tickLine={false} />
              <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={86} />
              <Tooltip content={<RevenueTooltip />} />
              <Legend />
              <Bar dataKey="revenueCents" fill="hsl(var(--primary))" name="Receita" radius={[4, 4, 0, 0]} />
              <Bar dataKey="couponDiscountCents" fill="#0f766e" name="Cupons" radius={[4, 4, 0, 0]} />
              <Bar dataKey="loyaltyDiscountCents" fill="#7c3aed" name="Pontos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pontos por mês</CardTitle>
          <CardDescription>Emissão e resgate de recompensas no ano.</CardDescription>
        </CardHeader>
        <CardContent className="h-80 min-w-0">
          <ResponsiveContainer height={320} minWidth={0} width="100%">
            <BarChart data={loyaltyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="monthLabel" tickLine={false} />
              <YAxis />
              <Tooltip content={<PointsTooltip />} />
              <Legend />
              <Bar dataKey="loyaltyPointsIssued" fill="#2563eb" name="Emitidos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="loyaltyPointsRedeemed" fill="#f97316" name="Resgatados" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
