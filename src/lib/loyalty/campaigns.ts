import type { LoyaltyCampaign } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

type LoyaltyCampaignClient = Pick<typeof prisma, "loyaltyCampaign" | "product">;

export interface LoyaltyCampaignMatch {
  bonusPoints: number;
  id: string;
  name: string;
  pointsMultiplier: number;
}

export interface CampaignProductContext {
  categoryId: string | null;
  extraCategoryIds: string[];
  id: string;
  tags: string[];
}

export async function getActiveLoyaltyCampaigns(
  client: Pick<typeof prisma, "loyaltyCampaign"> = prisma,
  now = new Date()
): Promise<LoyaltyCampaign[]> {
  return client.loyaltyCampaign.findMany({
    orderBy: [
      { pointsMultiplier: "desc" },
      { bonusPoints: "desc" },
      { createdAt: "desc" }
    ],
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }]
        }
      ]
    }
  });
}

export async function getStorefrontLoyaltyCampaigns(
  client: Pick<typeof prisma, "loyaltyCampaign"> = prisma
): Promise<LoyaltyCampaign[]> {
  const campaigns = await getActiveLoyaltyCampaigns(client);

  return campaigns.filter((campaign) => campaign.showOnStorefront).slice(0, 4);
}

export async function getBestLoyaltyCampaignForProducts({
  client = prisma,
  productIds,
  rewardBaseCents
}: {
  client?: LoyaltyCampaignClient;
  productIds: string[];
  rewardBaseCents: number;
}): Promise<LoyaltyCampaignMatch | null> {
  const campaigns = await getActiveLoyaltyCampaigns(client);

  if (campaigns.length === 0) {
    return null;
  }

  const products = productIds.length > 0
    ? await client.product.findMany({
        select: {
          categoryId: true,
          categories: {
            select: { categoryId: true }
          },
          id: true,
          tags: true
        },
        where: { id: { in: productIds } }
      })
    : [];
  const productContexts = products.map((product) => ({
    categoryId: product.categoryId,
    extraCategoryIds: product.categories.map((category) => category.categoryId),
    id: product.id,
    tags: product.tags
  }));
  const matchingCampaigns = campaigns.filter((campaign) => matchesLoyaltyCampaign(campaign, productContexts, rewardBaseCents));

  return matchingCampaigns[0]
    ? {
        bonusPoints: matchingCampaigns[0].bonusPoints,
        id: matchingCampaigns[0].id,
        name: matchingCampaigns[0].name,
        pointsMultiplier: matchingCampaigns[0].pointsMultiplier
      }
    : null;
}

export function applyLoyaltyCampaignPoints(basePoints: number, campaign: LoyaltyCampaignMatch | null): number {
  if (!campaign) {
    return basePoints;
  }

  return Math.max(0, Math.floor((basePoints * campaign.pointsMultiplier) / 100) + campaign.bonusPoints);
}

export function describeLoyaltyCampaign(campaign: LoyaltyCampaignMatch): string {
  const parts = [];

  if (campaign.pointsMultiplier > 100) {
    parts.push(`${campaign.pointsMultiplier}% dos pontos`);
  }

  if (campaign.bonusPoints > 0) {
    parts.push(`+${campaign.bonusPoints} pontos`);
  }

  return parts.length > 0 ? `${campaign.name}: ${parts.join(" e ")}` : campaign.name;
}

function matchesLoyaltyCampaign(
  campaign: LoyaltyCampaign,
  products: CampaignProductContext[],
  rewardBaseCents: number
): boolean {
  if (campaign.minSubtotalCents && rewardBaseCents < campaign.minSubtotalCents) {
    return false;
  }

  const campaignCategories = new Set(campaign.categoryIds);
  const campaignTags = new Set(campaign.productTags.map(normalizeTag));
  const hasCategoryFilter = campaignCategories.size > 0;
  const hasTagFilter = campaignTags.size > 0;

  if (!hasCategoryFilter && !hasTagFilter) {
    return true;
  }

  return products.some((product) => {
    const categoryMatch = hasCategoryFilter && [
      product.categoryId,
      ...product.extraCategoryIds
    ].filter((categoryId): categoryId is string => Boolean(categoryId)).some((categoryId) => campaignCategories.has(categoryId));
    const tagMatch = hasTagFilter && product.tags.some((tag) => campaignTags.has(normalizeTag(tag)));

    return categoryMatch || tagMatch;
  });
}

function normalizeTag(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
