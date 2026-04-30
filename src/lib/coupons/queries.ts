import { CouponType, type Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export interface AdminCouponFilters {
  query?: string;
  status?: "active" | "expired" | "inactive";
  visibility?: "private" | "public";
}

export type AdminCouponListItem = Awaited<ReturnType<typeof getAdminCoupons>>["coupons"][number];

export async function getAdminCoupons(filters: AdminCouponFilters = {}) {
  const now = new Date();
  const andConditions: Prisma.CouponWhereInput[] = [];

  if (filters.query) {
    andConditions.push({
      OR: [
        { code: { contains: filters.query, mode: "insensitive" } },
        { assignedUser: { is: { email: { contains: filters.query, mode: "insensitive" } } } },
        { assignedUser: { is: { name: { contains: filters.query, mode: "insensitive" } } } }
      ]
    });
  }

  if (filters.status === "active") {
    andConditions.push({ isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
  }

  if (filters.status === "inactive") {
    andConditions.push({ isActive: false });
  }

  if (filters.status === "expired") {
    andConditions.push({ expiresAt: { lte: now } });
  }

  if (filters.visibility === "public") {
    andConditions.push({ isPublic: true });
  }

  if (filters.visibility === "private") {
    andConditions.push({ isPublic: false });
  }

  const where: Prisma.CouponWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [coupons, customers, totals] = await Promise.all([
    prisma.coupon.findMany({
      include: {
        assignedUser: { select: { email: true, id: true, name: true } },
        redemptions: {
          include: {
            order: {
              select: {
                createdAt: true,
                id: true,
                orderNumber: true,
                totalCents: true
              }
            },
            user: { select: { email: true, name: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 6
        }
      },
      orderBy: { createdAt: "desc" },
      take: 120,
      where
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { email: true, id: true, name: true },
      take: 100,
      where: { role: "CUSTOMER" }
    }),
    prisma.coupon.aggregate({
      _count: true,
      _sum: { usedCount: true }
    })
  ]);

  const activeCount = coupons.filter((coupon) => coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > now)).length;
  const expiredCount = coupons.filter((coupon) => coupon.expiresAt && coupon.expiresAt <= now).length;
  const publicCount = coupons.filter((coupon) => coupon.isPublic).length;
  const privateCount = coupons.length - publicCount;
  const fixedAmountCents = coupons
    .filter((coupon) => coupon.type === CouponType.FIXED_AMOUNT)
    .reduce((sum, coupon) => sum + coupon.value * coupon.usedCount, 0);

  return {
    coupons,
    customers,
    filters,
    metrics: {
      activeCount,
      expiredCount,
      fixedAmountCents,
      privateCount,
      publicCount,
      totalCount: totals._count,
      usedCount: totals._sum.usedCount ?? 0
    }
  };
}
