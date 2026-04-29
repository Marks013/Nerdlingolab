import { LoyaltyLedgerType, PaymentStatus, ReferralStatus, UserRole } from "@/generated/prisma/client";

import { getLoyaltyProgramSettings } from "@/lib/loyalty/settings";
import { prisma } from "@/lib/prisma";

export async function getAdminLoyaltyDashboard(search = "") {
  const normalizedSearch = search.trim();
  const customerWhere = normalizedSearch
    ? {
        role: UserRole.CUSTOMER,
        OR: [
          { email: { contains: normalizedSearch, mode: "insensitive" as const } },
          { name: { contains: normalizedSearch, mode: "insensitive" as const } },
          { referralCode: { is: { code: { contains: normalizedSearch, mode: "insensitive" as const } } } }
        ]
      }
    : { role: UserRole.CUSTOMER };
  const [
    settings,
    totals,
    customers,
    recentActivity,
    redeemedOrders,
    memberCount,
    customersWithoutReferralCode,
    generatedCoupons,
    referralTotals,
    recentReferrals
  ] = await Promise.all([
      getLoyaltyProgramSettings(),
      prisma.loyaltyLedger.groupBy({
        by: ["type"],
        _sum: { pointsDelta: true }
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          assignedCoupons: {
            include: {
              redemptions: {
                select: {
                  createdAt: true,
                  discountCents: true,
                  order: { select: { id: true, orderNumber: true } }
                },
                take: 5
              }
            },
            orderBy: { createdAt: "desc" },
            take: 8
          },
          email: true,
          id: true,
          loyaltyLedger: {
            orderBy: { createdAt: "desc" },
            select: {
              balanceAfter: true,
              createdAt: true,
              customerNote: true,
              id: true,
              pointsDelta: true,
              reason: true,
              type: true
            },
            take: 8
          },
          loyaltyPoints: true,
          name: true,
          orders: {
            select: { totalCents: true },
            where: { paymentStatus: PaymentStatus.APPROVED }
          },
          referralCode: { select: { code: true, isActive: true } },
          referralReceived: {
            include: {
              inviter: { select: { email: true, name: true } },
              qualifyingOrder: { select: { orderNumber: true, totalCents: true } }
            }
          },
          referralsSent: {
            include: {
              invitee: { select: { email: true, name: true } },
              qualifyingOrder: { select: { orderNumber: true, totalCents: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 8
          }
        },
        take: 80,
        where: customerWhere
      }),
      prisma.loyaltyLedger.findMany({
        include: {
          user: { select: { email: true, name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 25
      }),
      prisma.order.aggregate({
        _count: true,
        _sum: {
          loyaltyDiscountCents: true,
          loyaltyPointsRedeemed: true,
          totalCents: true
        },
        where: {
          loyaltyPointsRedeemed: { gt: 0 },
          paymentStatus: PaymentStatus.APPROVED
        }
      }),
      prisma.loyaltyPoints.count(),
      prisma.user.count({
        where: {
          referralCode: null,
          role: UserRole.CUSTOMER
        }
      }),
      prisma.coupon.findMany({
        include: {
          assignedUser: { select: { email: true, name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        where: {
          assignedUserId: { not: null },
          isPublic: false
        }
      }),
      prisma.referral.groupBy({
        by: ["status"],
        _count: true
      }),
      prisma.referral.findMany({
        include: {
          invitee: { select: { email: true, name: true } },
          inviter: { select: { email: true, name: true } },
          qualifyingOrder: { select: { orderNumber: true, totalCents: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 12
      })
    ]);
  const pointsByType = new Map(totals.map((entry) => [entry.type, entry._sum.pointsDelta ?? 0]));
  const referralsByStatus = new Map(referralTotals.map((entry) => [entry.status, entry._count]));

  return {
    customers,
    customersWithoutReferralCode,
    generatedCoupons,
    memberCount,
    pointsEarned: pointsByType.get(LoyaltyLedgerType.EARN) ?? 0,
    pointsExpired: Math.abs(pointsByType.get(LoyaltyLedgerType.EXPIRE) ?? 0),
    pointsRedeemed: Math.abs(pointsByType.get(LoyaltyLedgerType.REDEEM) ?? 0),
    referralsPending: referralsByStatus.get(ReferralStatus.PENDING) ?? 0,
    referralsRewarded: referralsByStatus.get(ReferralStatus.REWARDED) ?? 0,
    recentReferrals,
    recentActivity,
    redeemedOrders,
    settings
  };
}
