import { PricingRoundingMode, PricingRuleScope, type PricingRule } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export interface SuggestedPrice {
  priceCents: number;
  marginCents: number;
  ruleLabel: string;
}

export async function getSuggestedPriceForProduct(params: {
  supplierId: string;
  productId: string;
  categoryId?: string | null;
  sourcePriceCents: number | null;
}): Promise<SuggestedPrice | null> {
  if (!params.sourcePriceCents || params.sourcePriceCents <= 0) {
    return null;
  }

  const rule = await resolvePricingRule(params);

  if (!rule) {
    return null;
  }

  const marginByPercent = Math.round(params.sourcePriceCents * (Number(rule.marginPercent) / 100));
  const marginCents = Math.max(rule.minimumMarginCents, marginByPercent + rule.marginFixedCents);
  const rawPrice = params.sourcePriceCents + marginCents;
  const priceCents = applyRounding(rawPrice, rule.roundingMode);

  return {
    priceCents,
    marginCents: priceCents - params.sourcePriceCents,
    ruleLabel: describeRule(rule)
  };
}

async function resolvePricingRule(params: {
  supplierId: string;
  productId: string;
  categoryId?: string | null;
}): Promise<PricingRule | null> {
  const rules = await prisma.pricingRule.findMany({
    orderBy: { updatedAt: "desc" },
    where: {
      isActive: true,
      OR: [
        { scope: PricingRuleScope.PRODUCT, productId: params.productId },
        { scope: PricingRuleScope.CATEGORY, categoryId: params.categoryId ?? "__none__" },
        { scope: PricingRuleScope.SUPPLIER, supplierId: params.supplierId },
        { scope: PricingRuleScope.GLOBAL }
      ]
    }
  });

  return rules.find((rule) => {
    if (rule.scope === PricingRuleScope.PRODUCT) {
      return rule.productId === params.productId;
    }

    if (rule.scope === PricingRuleScope.CATEGORY) {
      return Boolean(params.categoryId) && rule.categoryId === params.categoryId;
    }

    if (rule.scope === PricingRuleScope.SUPPLIER) {
      return rule.supplierId === params.supplierId;
    }

    return rule.scope === PricingRuleScope.GLOBAL;
  }) ?? null;
}

function applyRounding(value: number, mode: PricingRoundingMode): number {
  if (mode === PricingRoundingMode.END_90) {
    return roundToEnding(value, 90);
  }

  if (mode === PricingRoundingMode.END_99) {
    return roundToEnding(value, 99);
  }

  if (mode === PricingRoundingMode.INTEGER) {
    return Math.ceil(value / 100) * 100;
  }

  return value;
}

function roundToEnding(value: number, ending: number): number {
  const reais = Math.floor(value / 100);
  const candidate = reais * 100 + ending;

  return candidate >= value ? candidate : (reais + 1) * 100 + ending;
}

function describeRule(rule: PricingRule): string {
  if (rule.scope === PricingRuleScope.PRODUCT) {
    return "Produto";
  }

  if (rule.scope === PricingRuleScope.CATEGORY) {
    return "Categoria";
  }

  if (rule.scope === PricingRuleScope.SUPPLIER) {
    return "Fornecedor";
  }

  return "Global";
}
