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

  const rule = selectPricingRule(await getActivePricingRules(), params);

  if (!rule) {
    return null;
  }

  return getSuggestedPriceFromRule(params.sourcePriceCents, rule);
}

export async function getActivePricingRules(): Promise<PricingRule[]> {
  return prisma.pricingRule.findMany({
    orderBy: { updatedAt: "desc" },
    where: { isActive: true }
  });
}

export function getSuggestedPriceFromRules(
  rules: PricingRule[],
  params: {
    supplierId: string;
    productId: string;
    categoryId?: string | null;
    sourcePriceCents: number | null;
  }
): SuggestedPrice | null {
  if (!params.sourcePriceCents || params.sourcePriceCents <= 0) {
    return null;
  }

  const rule = selectPricingRule(rules, params);

  return rule ? getSuggestedPriceFromRule(params.sourcePriceCents, rule) : null;
}

function getSuggestedPriceFromRule(sourcePriceCents: number, rule: PricingRule): SuggestedPrice {
  const marginByPercent = Math.round(sourcePriceCents * (Number(rule.marginPercent) / 100));
  const marginCents = Math.max(rule.minimumMarginCents, marginByPercent + rule.marginFixedCents);
  const rawPrice = sourcePriceCents + marginCents;
  const priceCents = applyRounding(rawPrice, rule.roundingMode);

  return {
    priceCents,
    marginCents: priceCents - sourcePriceCents,
    ruleLabel: describeRule(rule)
  };
}

function selectPricingRule(
  rules: PricingRule[],
  params: {
    supplierId: string;
    productId: string;
    categoryId?: string | null;
  }
): PricingRule | null {
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
