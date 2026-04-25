import { PaymentStatus } from "@prisma/client";

import { normalizeDisplayText } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export interface MonthlyReportItem {
  monthIndex: number;
  monthLabel: string;
  revenueCents: number;
  paidOrdersCount: number;
  couponDiscountCents: number;
  loyaltyDiscountCents: number;
  loyaltyPointsIssued: number;
  loyaltyPointsRedeemed: number;
}

export interface AnnualReportTotals {
  revenueCents: number;
  paidOrdersCount: number;
  couponDiscountCents: number;
  loyaltyDiscountCents: number;
  loyaltyPointsIssued: number;
  loyaltyPointsRedeemed: number;
}

export interface AdminAnnualReport {
  currentYear: number;
  filters: AdminReportFilters;
  monthlyItems: MonthlyReportItem[];
  totals: AnnualReportTotals;
}

export interface AdminReportFilters {
  endDate: string;
  startDate: string;
}

interface ReportOrderSummary {
  paidAt: Date | null;
  totalCents: number;
  discountCents: number;
  loyaltyDiscountCents: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
}

function createEmptyMonthlyItems({ endDate, startDate }: AdminReportFilters): MonthlyReportItem[] {
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  const monthCount = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1;

  return Array.from({ length: Math.max(1, monthCount) }, (_, monthIndex) => {
    const monthDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + monthIndex, 1));
    const rawMonthLabel = monthFormatter.format(monthDate).replace(".", "");
    const monthLabel = `${rawMonthLabel.charAt(0).toUpperCase()}${rawMonthLabel.slice(1)}/${monthDate.getUTCFullYear()}`;

    return {
      monthIndex,
      monthLabel: normalizeDisplayText(monthLabel),
      revenueCents: 0,
      paidOrdersCount: 0,
      couponDiscountCents: 0,
      loyaltyDiscountCents: 0,
      loyaltyPointsIssued: 0,
      loyaltyPointsRedeemed: 0
    };
  });
}

function buildAnnualTotals(monthlyItems: MonthlyReportItem[]): AnnualReportTotals {
  return monthlyItems.reduce<AnnualReportTotals>(
    (totals, monthlyItem) => ({
      revenueCents: totals.revenueCents + monthlyItem.revenueCents,
      paidOrdersCount: totals.paidOrdersCount + monthlyItem.paidOrdersCount,
      couponDiscountCents: totals.couponDiscountCents + monthlyItem.couponDiscountCents,
      loyaltyDiscountCents: totals.loyaltyDiscountCents + monthlyItem.loyaltyDiscountCents,
      loyaltyPointsIssued: totals.loyaltyPointsIssued + monthlyItem.loyaltyPointsIssued,
      loyaltyPointsRedeemed: totals.loyaltyPointsRedeemed + monthlyItem.loyaltyPointsRedeemed
    }),
    {
      revenueCents: 0,
      paidOrdersCount: 0,
      couponDiscountCents: 0,
      loyaltyDiscountCents: 0,
      loyaltyPointsIssued: 0,
      loyaltyPointsRedeemed: 0
    }
  );
}

export async function getAdminAnnualReport(filters?: Partial<AdminReportFilters>): Promise<AdminAnnualReport> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const resolvedFilters = resolveReportFilters(filters, currentYear);
  const startDate = parseDateInput(resolvedFilters.startDate);
  const endDate = addDays(parseDateInput(resolvedFilters.endDate), 1);
  const monthlyItems = createEmptyMonthlyItems(resolvedFilters);

  const paidOrders: ReportOrderSummary[] = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.APPROVED,
      paidAt: {
        gte: startDate,
        lt: endDate
      }
    },
    select: {
      paidAt: true,
      totalCents: true,
      discountCents: true,
      loyaltyDiscountCents: true,
      loyaltyPointsEarned: true,
      loyaltyPointsRedeemed: true
    },
    orderBy: { paidAt: "asc" }
  });

  for (const order of paidOrders) {
    if (!order.paidAt) {
      continue;
    }

    const monthIndex = (order.paidAt.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + order.paidAt.getUTCMonth() - startDate.getUTCMonth();
    const monthlyItem = monthlyItems[monthIndex];

    if (!monthlyItem) {
      continue;
    }

    monthlyItem.revenueCents += order.totalCents;
    monthlyItem.paidOrdersCount += 1;
    monthlyItem.couponDiscountCents += order.discountCents;
    monthlyItem.loyaltyDiscountCents += order.loyaltyDiscountCents;
    monthlyItem.loyaltyPointsIssued += order.loyaltyPointsEarned;
    monthlyItem.loyaltyPointsRedeemed += order.loyaltyPointsRedeemed;
  }

  return {
    currentYear,
    filters: resolvedFilters,
    monthlyItems,
    totals: buildAnnualTotals(monthlyItems)
  };
}

export function buildAdminReportCsv(report: AdminAnnualReport): string {
  const rows = [
    [
      "Mês",
      "Receita",
      "Pedidos pagos",
      "Desconto em cupons",
      "Desconto em pontos",
      "Pontos emitidos",
      "Pontos resgatados"
    ],
    ...report.monthlyItems.map((item) => [
      item.monthLabel,
      centsToDecimal(item.revenueCents),
      String(item.paidOrdersCount),
      centsToDecimal(item.couponDiscountCents),
      centsToDecimal(item.loyaltyDiscountCents),
      String(item.loyaltyPointsIssued),
      String(item.loyaltyPointsRedeemed)
    ])
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function resolveReportFilters(filters: Partial<AdminReportFilters> | undefined, currentYear = new Date().getFullYear()): AdminReportFilters {
  const fallbackStartDate = `${currentYear}-01-01`;
  const fallbackEndDate = `${currentYear}-12-31`;
  const startDate = isDateInput(filters?.startDate) ? filters?.startDate : fallbackStartDate;
  const endDate = isDateInput(filters?.endDate) ? filters?.endDate : fallbackEndDate;

  if (parseDateInput(startDate) > parseDateInput(endDate)) {
    return {
      startDate: endDate,
      endDate: startDate
    };
  }

  return {
    startDate,
    endDate
  };
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function centsToDecimal(value: number): string {
  return (value / 100).toFixed(2);
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, "\"\"")}"`;
}

function isDateInput(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return parseDateInput(value).toISOString().slice(0, 10) === value;
}

function parseDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
