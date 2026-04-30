import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

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

export interface AdminReportBreakdownItem {
  label: string;
  value: number;
}

export interface AdminReportCouponItem {
  code: string;
  discountCents: number;
  ordersCount: number;
}

export interface AdminReportRecentOrder {
  createdAt: Date;
  id: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  totalCents: number;
}

export interface AdminReportTopProduct {
  productId: string;
  productTitle: string;
  quantity: number;
  revenueCents: number;
}

export interface AnnualReportTotals {
  averageTicketCents: number;
  canceledOrdersCount: number;
  couponDiscountCents: number;
  couponOrdersCount: number;
  grossSubtotalCents: number;
  loyaltyDiscountCents: number;
  loyaltyPointsIssued: number;
  loyaltyPointsRedeemed: number;
  newCustomersCount: number;
  paidOrdersCount: number;
  pendingPaymentCount: number;
  productsSoldCount: number;
  revenueCents: number;
  shippingCents: number;
}

export interface AdminAnnualReport {
  couponPerformance: AdminReportCouponItem[];
  currentYear: number;
  filters: AdminReportFilters;
  monthlyItems: MonthlyReportItem[];
  orderStatusItems: AdminReportBreakdownItem[];
  paymentStatusItems: AdminReportBreakdownItem[];
  recentOrders: AdminReportRecentOrder[];
  topProducts: AdminReportTopProduct[];
  totals: AnnualReportTotals;
}

export interface AdminReportFilters {
  endDate: string;
  startDate: string;
}

interface ReportOrderSummary {
  coupon: { code: string } | null;
  discountCents: number;
  items: Array<{
    productId: string;
    productTitle: string;
    quantity: number;
    totalCents: number;
  }>;
  loyaltyDiscountCents: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  paidAt: Date | null;
  shippingCents: number;
  subtotalCents: number;
  totalCents: number;
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
      couponDiscountCents: 0,
      loyaltyDiscountCents: 0,
      loyaltyPointsIssued: 0,
      loyaltyPointsRedeemed: 0,
      monthIndex,
      monthLabel: normalizeDisplayText(monthLabel),
      paidOrdersCount: 0,
      revenueCents: 0
    };
  });
}

function buildAnnualTotals(
  monthlyItems: MonthlyReportItem[],
  paidOrders: ReportOrderSummary[],
  periodCounters: {
    canceledOrdersCount: number;
    newCustomersCount: number;
    pendingPaymentCount: number;
  }
): AnnualReportTotals {
  const baseTotals = monthlyItems.reduce(
    (totals, monthlyItem) => ({
      couponDiscountCents: totals.couponDiscountCents + monthlyItem.couponDiscountCents,
      loyaltyDiscountCents: totals.loyaltyDiscountCents + monthlyItem.loyaltyDiscountCents,
      loyaltyPointsIssued: totals.loyaltyPointsIssued + monthlyItem.loyaltyPointsIssued,
      loyaltyPointsRedeemed: totals.loyaltyPointsRedeemed + monthlyItem.loyaltyPointsRedeemed,
      paidOrdersCount: totals.paidOrdersCount + monthlyItem.paidOrdersCount,
      revenueCents: totals.revenueCents + monthlyItem.revenueCents
    }),
    {
      couponDiscountCents: 0,
      loyaltyDiscountCents: 0,
      loyaltyPointsIssued: 0,
      loyaltyPointsRedeemed: 0,
      paidOrdersCount: 0,
      revenueCents: 0
    }
  );
  const grossSubtotalCents = paidOrders.reduce((sum, order) => sum + order.subtotalCents, 0);
  const productsSoldCount = paidOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  const shippingCents = paidOrders.reduce((sum, order) => sum + order.shippingCents, 0);
  const couponOrdersCount = paidOrders.filter((order) => order.discountCents > 0 || order.coupon).length;

  return {
    ...baseTotals,
    averageTicketCents: baseTotals.paidOrdersCount > 0 ? Math.round(baseTotals.revenueCents / baseTotals.paidOrdersCount) : 0,
    canceledOrdersCount: periodCounters.canceledOrdersCount,
    couponOrdersCount,
    grossSubtotalCents,
    newCustomersCount: periodCounters.newCustomersCount,
    pendingPaymentCount: periodCounters.pendingPaymentCount,
    productsSoldCount,
    shippingCents
  };
}

export async function getAdminAnnualReport(filters?: Partial<AdminReportFilters>): Promise<AdminAnnualReport> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const resolvedFilters = resolveReportFilters(filters, currentYear);
  const startDate = parseDateInput(resolvedFilters.startDate);
  const endDate = addDays(parseDateInput(resolvedFilters.endDate), 1);
  const monthlyItems = createEmptyMonthlyItems(resolvedFilters);

  const [
    paidOrders,
    orderStatusGroups,
    paymentStatusGroups,
    pendingPaymentCount,
    canceledOrdersCount,
    newCustomersCount,
    recentOrders
  ] = await Promise.all([
    prisma.order.findMany({
      include: {
        coupon: { select: { code: true } },
        items: {
          select: {
            productId: true,
            productTitle: true,
            quantity: true,
            totalCents: true
          }
        }
      },
      orderBy: { paidAt: "asc" },
      where: {
        paidAt: {
          gte: startDate,
          lt: endDate
        },
        paymentStatus: PaymentStatus.APPROVED
      }
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      }
    }),
    prisma.order.groupBy({
      by: ["paymentStatus"],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      }
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        paymentStatus: PaymentStatus.PENDING
      }
    }),
    prisma.order.count({
      where: {
        canceledAt: { gte: startDate, lt: endDate }
      }
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        role: "CUSTOMER"
      }
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        id: true,
        orderNumber: true,
        paymentStatus: true,
        status: true,
        totalCents: true
      },
      take: 8,
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      }
    })
  ]);

  const couponPerformanceMap = new Map<string, AdminReportCouponItem>();
  const productPerformanceMap = new Map<string, AdminReportTopProduct>();

  for (const order of paidOrders) {
    if (!order.paidAt) {
      continue;
    }

    const monthIndex = (order.paidAt.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + order.paidAt.getUTCMonth() - startDate.getUTCMonth();
    const monthlyItem = monthlyItems[monthIndex];

    if (monthlyItem) {
      monthlyItem.couponDiscountCents += order.discountCents;
      monthlyItem.loyaltyDiscountCents += order.loyaltyDiscountCents;
      monthlyItem.loyaltyPointsIssued += order.loyaltyPointsEarned;
      monthlyItem.loyaltyPointsRedeemed += order.loyaltyPointsRedeemed;
      monthlyItem.paidOrdersCount += 1;
      monthlyItem.revenueCents += order.totalCents;
    }

    if (order.coupon || order.discountCents > 0) {
      const code = order.coupon?.code ?? "DESCONTO_MANUAL";
      const currentCoupon = couponPerformanceMap.get(code) ?? {
        code,
        discountCents: 0,
        ordersCount: 0
      };

      currentCoupon.discountCents += order.discountCents;
      currentCoupon.ordersCount += 1;
      couponPerformanceMap.set(code, currentCoupon);
    }

    for (const item of order.items) {
      const currentProduct = productPerformanceMap.get(item.productId) ?? {
        productId: item.productId,
        productTitle: item.productTitle,
        quantity: 0,
        revenueCents: 0
      };

      currentProduct.quantity += item.quantity;
      currentProduct.revenueCents += item.totalCents;
      productPerformanceMap.set(item.productId, currentProduct);
    }
  }

  return {
    couponPerformance: [...couponPerformanceMap.values()]
      .sort((first, second) => second.discountCents - first.discountCents)
      .slice(0, 8),
    currentYear,
    filters: resolvedFilters,
    monthlyItems,
    orderStatusItems: orderStatusGroups.map((entry) => ({
      label: formatOrderStatusLabel(entry.status),
      value: entry._count
    })),
    paymentStatusItems: paymentStatusGroups.map((entry) => ({
      label: formatPaymentStatusLabel(entry.paymentStatus),
      value: entry._count
    })),
    recentOrders,
    topProducts: [...productPerformanceMap.values()]
      .sort((first, second) => second.revenueCents - first.revenueCents)
      .slice(0, 8),
    totals: buildAnnualTotals(monthlyItems, paidOrders, {
      canceledOrdersCount,
      newCustomersCount,
      pendingPaymentCount
    })
  };
}

export function buildAdminReportCsv(report: AdminAnnualReport): string {
  const rows = [
    [
      "Mes",
      "Receita",
      "Pedidos pagos",
      "Ticket medio",
      "Desconto em cupons",
      "Desconto em pontos",
      "Pontos emitidos",
      "Pontos resgatados"
    ],
    ...report.monthlyItems.map((item) => [
      item.monthLabel,
      centsToDecimal(item.revenueCents),
      String(item.paidOrdersCount),
      centsToDecimal(item.paidOrdersCount > 0 ? Math.round(item.revenueCents / item.paidOrdersCount) : 0),
      centsToDecimal(item.couponDiscountCents),
      centsToDecimal(item.loyaltyDiscountCents),
      String(item.loyaltyPointsIssued),
      String(item.loyaltyPointsRedeemed)
    ]),
    [],
    ["Produto", "Quantidade", "Receita"],
    ...report.topProducts.map((item) => [
      item.productTitle,
      String(item.quantity),
      centsToDecimal(item.revenueCents)
    ]),
    [],
    ["Cupom", "Pedidos", "Desconto"],
    ...report.couponPerformance.map((item) => [
      item.code,
      String(item.ordersCount),
      centsToDecimal(item.discountCents)
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
      endDate: startDate,
      startDate: endDate
    };
  }

  return {
    endDate,
    startDate
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

function formatOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    CANCELED: "Cancelado",
    DELIVERED: "Entregue",
    DRAFT: "Rascunho",
    PAID: "Pago",
    PENDING_PAYMENT: "Aguardando pagamento",
    PROCESSING: "Processando",
    REFUNDED: "Reembolsado",
    SHIPPED: "Enviado"
  };

  return labels[status] ?? status;
}

function formatPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    APPROVED: "Aprovado",
    CANCELED: "Cancelado",
    CHARGEBACK: "Chargeback",
    PENDING: "Pendente",
    REFUNDED: "Reembolsado",
    REJECTED: "Recusado"
  };

  return labels[status] ?? status;
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
