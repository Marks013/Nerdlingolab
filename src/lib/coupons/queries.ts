import type { Coupon } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getAdminCoupons(): Promise<Coupon[]> {
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" }
  });
}
