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

  const [activeCount, inactiveCount, sentCampaignCount, failedDeliveryCount, subscribers, campaigns] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    prisma.newsletterSubscriber.count({ where: { isActive: false } }),
    prisma.newsletterCampaign.count({ where: { status: { in: ["SENT", "SENT_WITH_ERRORS"] } } }),
    prisma.newsletterCampaignDelivery.count({ where: { status: "FAILED" } }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      where
    }),
    prisma.newsletterCampaign.findMany({
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  return {
    activeCount,
    campaigns,
    failedDeliveryCount,
    inactiveCount,
    sentCampaignCount,
    subscribers
  };
}
