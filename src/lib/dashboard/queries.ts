import { LoyaltyLedgerType, PaymentStatus, ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface AdminDashboardMetrics {
  paidOrdersCount: number;
  paidOrdersTodayCount: number;
  paidOrdersYearCount: number;
  revenueCents: number;
  revenueTodayCents: number;
  revenueYearCents: number;
  activeProductsCount: number;
  loyaltyPointsIssued: number;
  loyaltyPointsIssuedYear: number;
  currentYear: number;
}

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const currentYear = todayStart.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);

  const [
    paidOrdersCount,
    paidOrdersTodayCount,
    paidOrdersYearCount,
    revenue,
    revenueToday,
    revenueYear,
    activeProductsCount,
    loyaltyEarned,
    loyaltyEarnedYear
  ] = await Promise.all([
    prisma.order.count({
      where: { paymentStatus: PaymentStatus.APPROVED }
    }),
    prisma.order.count({
      where: {
        paymentStatus: PaymentStatus.APPROVED,
        paidAt: { gte: todayStart }
      }
    }),
    prisma.order.count({
      where: {
        paymentStatus: PaymentStatus.APPROVED,
        paidAt: { gte: yearStart }
      }
    }),
    prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.APPROVED },
      _sum: { totalCents: true }
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: PaymentStatus.APPROVED,
        paidAt: { gte: todayStart }
      },
      _sum: { totalCents: true }
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: PaymentStatus.APPROVED,
        paidAt: { gte: yearStart }
      },
      _sum: { totalCents: true }
    }),
    prisma.product.count({
      where: { status: ProductStatus.ACTIVE }
    }),
    prisma.loyaltyLedger.aggregate({
      where: { type: LoyaltyLedgerType.EARN },
      _sum: { pointsDelta: true }
    }),
    prisma.loyaltyLedger.aggregate({
      where: {
        type: LoyaltyLedgerType.EARN,
        createdAt: { gte: yearStart }
      },
      _sum: { pointsDelta: true }
    })
  ]);

  return {
    paidOrdersCount,
    paidOrdersTodayCount,
    paidOrdersYearCount,
    revenueCents: revenue._sum.totalCents ?? 0,
    revenueTodayCents: revenueToday._sum.totalCents ?? 0,
    revenueYearCents: revenueYear._sum.totalCents ?? 0,
    activeProductsCount,
    loyaltyPointsIssued: loyaltyEarned._sum.pointsDelta ?? 0,
    loyaltyPointsIssuedYear: loyaltyEarnedYear._sum.pointsDelta ?? 0,
    currentYear
  };
}
