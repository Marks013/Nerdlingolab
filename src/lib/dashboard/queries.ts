import { LoyaltyLedgerType, PaymentStatus, ProductStatus, SupportTicketStatus } from "@/generated/prisma/client";

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
  lowStockVariants: Array<{
    product: { slug: string; title: string };
    sku: string;
    stockQuantity: number;
    title: string;
  }>;
  pendingOrdersCount: number;
  publicCouponsCount: number;
  newsletterActiveCount: number;
  recentOrders: Array<{
    createdAt: Date;
    email: string;
    id: string;
    orderNumber: string;
    paymentStatus: PaymentStatus;
    status: string;
    totalCents: number;
  }>;
  openSupportTicketsCount: number;
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
    loyaltyEarnedYear,
    pendingOrdersCount,
    openSupportTicketsCount,
    publicCouponsCount,
    newsletterActiveCount,
    lowStockVariants,
    recentOrders
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
    }),
    prisma.order.count({
      where: { paymentStatus: PaymentStatus.PENDING }
    }),
    prisma.supportTicket.count({
      where: {
        status: {
          in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS]
        }
      }
    }),
    prisma.coupon.count({
      where: {
        isActive: true,
        isPublic: true
      }
    }),
    prisma.newsletterSubscriber.count({
      where: { isActive: true }
    }),
    prisma.productVariant.findMany({
      orderBy: { stockQuantity: "asc" },
      select: {
        product: {
          select: {
            slug: true,
            title: true
          }
        },
        sku: true,
        stockQuantity: true,
        title: true
      },
      take: 8,
      where: {
        isActive: true,
        product: { status: ProductStatus.ACTIVE },
        stockQuantity: { lte: 5 }
      }
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        email: true,
        id: true,
        orderNumber: true,
        paymentStatus: true,
        status: true,
        totalCents: true
      },
      take: 8
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
    lowStockVariants,
    newsletterActiveCount,
    openSupportTicketsCount,
    pendingOrdersCount,
    publicCouponsCount,
    recentOrders,
    currentYear
  };
}
