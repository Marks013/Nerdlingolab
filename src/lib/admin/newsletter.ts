import { prisma } from "@/lib/prisma";

export interface AdminNewsletterFilters {
  query?: string;
  status?: "ativos" | "inativos" | "todos";
}

export async function getAdminNewsletterDashboard(filters: AdminNewsletterFilters = {}) {
  const where = {
    ...(filters.status === "ativos" ? { isActive: true } : {}),
    ...(filters.status === "inativos" ? { isActive: false } : {}),
    ...(filters.query
      ? {
          email: {
            contains: filters.query,
            mode: "insensitive" as const
          }
        }
      : {})
  };

  const [activeCount, inactiveCount, subscribers] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    prisma.newsletterSubscriber.count({ where: { isActive: false } }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      where
    })
  ]);

  return {
    activeCount,
    inactiveCount,
    subscribers
  };
}
