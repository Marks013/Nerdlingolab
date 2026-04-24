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
  monthlyItems: MonthlyReportItem[];
  totals: AnnualReportTotals;
}

interface ReportOrderSummary {
  paidAt: Date | null;
  totalCents: number;
  discountCents: number;
  loyaltyDiscountCents: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
}

function createEmptyMonthlyItems(currentYear: number): MonthlyReportItem[] {
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(currentYear, monthIndex, 1);
    const rawMonthLabel = monthFormatter.format(monthDate).replace(".", "");
    const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

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

export async function getAdminAnnualReport(): Promise<AdminAnnualReport> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const nextYearStart = new Date(currentYear + 1, 0, 1);
  const monthlyItems = createEmptyMonthlyItems(currentYear);

  const paidOrders: ReportOrderSummary[] = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.APPROVED,
      paidAt: {
        gte: yearStart,
        lt: nextYearStart
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

    const monthIndex = order.paidAt.getMonth();
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
    monthlyItems,
    totals: buildAnnualTotals(monthlyItems)
  };
}
