import { PaymentStatus } from "@/generated/prisma/client";

import { getLoyaltyProgramSettings } from "@/lib/loyalty/settings";
import { prisma } from "@/lib/prisma";

export const newsletterAudienceOptions = [
  { label: "Inscritos ativos", value: "ACTIVE_SUBSCRIBERS" },
  { label: "Clientes que já compraram", value: "CUSTOMERS_WITH_PURCHASE" },
  { label: "Inscritos sem compra aprovada", value: "SUBSCRIBERS_WITHOUT_PURCHASE" },
  { label: "Com saldo NerdCoins", value: "WITH_NERDCOINS_BALANCE" },
  { label: "Prontos para gerar cupom", value: "REDEEMABLE_NERDCOINS" },
  { label: "Saldo NerdCoins parado", value: "INACTIVE_WITH_BALANCE" }
] as const;

export type NewsletterAudience = (typeof newsletterAudienceOptions)[number]["value"];

export interface NewsletterAudienceSummary {
  label: string;
  value: NewsletterAudience;
  count: number;
}

export function isNewsletterAudience(value: string | null | undefined): value is NewsletterAudience {
  return newsletterAudienceOptions.some((option) => option.value === value);
}

export function getNewsletterAudienceLabel(value: string): string {
  return newsletterAudienceOptions.find((option) => option.value === value)?.label ?? value;
}

export async function getNewsletterAudienceSubscribers(audience: string) {
  const normalizedAudience = isNewsletterAudience(audience) ? audience : "ACTIVE_SUBSCRIBERS";

  if (normalizedAudience === "ACTIVE_SUBSCRIBERS") {
    return prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      where: { isActive: true }
    });
  }

  if (normalizedAudience === "SUBSCRIBERS_WITHOUT_PURCHASE") {
    const customerEmails = await getCustomerEmailsWithApprovedOrders();

    return prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        email: customerEmails.length > 0 ? { notIn: customerEmails } : undefined,
        isActive: true
      }
    });
  }

  const emails = await getAudienceCustomerEmails(normalizedAudience);

  if (emails.length === 0) {
    return [];
  }

  return prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    where: {
      email: { in: emails },
      isActive: true
    }
  });
}

export async function getNewsletterAudienceSummaries(): Promise<NewsletterAudienceSummary[]> {
  const summaries = await Promise.all(
    newsletterAudienceOptions.map(async (option) => ({
      count: await countNewsletterAudience(option.value),
      label: option.label,
      value: option.value
    }))
  );

  return summaries;
}

async function countNewsletterAudience(audience: NewsletterAudience): Promise<number> {
  if (audience === "ACTIVE_SUBSCRIBERS") {
    return prisma.newsletterSubscriber.count({ where: { isActive: true } });
  }

  if (audience === "SUBSCRIBERS_WITHOUT_PURCHASE") {
    const customerEmails = await getCustomerEmailsWithApprovedOrders();

    return prisma.newsletterSubscriber.count({
      where: {
        email: customerEmails.length > 0 ? { notIn: customerEmails } : undefined,
        isActive: true
      }
    });
  }

  const emails = await getAudienceCustomerEmails(audience);

  if (emails.length === 0) {
    return 0;
  }

  return prisma.newsletterSubscriber.count({
    where: {
      email: { in: emails },
      isActive: true
    }
  });
}

async function getAudienceCustomerEmails(audience: NewsletterAudience): Promise<string[]> {
  if (audience === "CUSTOMERS_WITH_PURCHASE") {
    return getCustomerEmailsWithApprovedOrders();
  }

  if (audience === "WITH_NERDCOINS_BALANCE") {
    return getCustomerEmailsWithLoyaltyBalance({ minBalance: 1 });
  }

  if (audience === "REDEEMABLE_NERDCOINS") {
    const settings = await getLoyaltyProgramSettings();

    return getCustomerEmailsWithLoyaltyBalance({ minBalance: settings.minRedeemPoints });
  }

  if (audience === "INACTIVE_WITH_BALANCE") {
    return getCustomerEmailsWithLoyaltyBalance({
      inactiveBefore: new Date(Date.now() - 45 * 86_400_000),
      minBalance: 1
    });
  }

  return [];
}

async function getCustomerEmailsWithApprovedOrders(): Promise<string[]> {
  const users = await prisma.user.findMany({
    select: { email: true },
    where: {
      orders: {
        some: { paymentStatus: PaymentStatus.APPROVED }
      }
    }
  });

  return users.map((user) => user.email);
}

async function getCustomerEmailsWithLoyaltyBalance({
  inactiveBefore,
  minBalance
}: {
  inactiveBefore?: Date;
  minBalance: number;
}): Promise<string[]> {
  const users = await prisma.user.findMany({
    select: { email: true },
    where: {
      loyaltyPoints: {
        is: {
          balance: { gte: minBalance },
          updatedAt: inactiveBefore ? { lt: inactiveBefore } : undefined
        }
      }
    }
  });

  return users.map((user) => user.email);
}
