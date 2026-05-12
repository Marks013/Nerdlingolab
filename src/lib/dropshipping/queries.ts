import {
  SupplierAlertStatus,
  SupplierAlertType,
  SupplierProvider,
  SupplierSourceStatus,
  type PricingRoundingMode
} from "@/generated/prisma/client";

import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { getSuggestedPriceForProduct } from "./pricing";

const unavailableStatuses: SupplierSourceStatus[] = [
  SupplierSourceStatus.OUT_OF_STOCK,
  SupplierSourceStatus.PAUSED,
  SupplierSourceStatus.CLOSED,
  SupplierSourceStatus.DELETED
];

export interface DropshippingDashboardFilters {
  provider?: SupplierProvider;
  status?: SupplierSourceStatus;
  alert?: "open";
  query?: string;
}

export interface DropshippingDashboardItem {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  provider: SupplierProvider;
  originalUrl: string;
  status: SupplierSourceStatus;
  lastPriceCents: number | null;
  lastStockQuantity: number | null;
  storePriceCents: number;
  suggestedPriceCents: number | null;
  suggestedMarginCents: number | null;
  suggestedRuleLabel: string | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
  openAlerts: Array<{
    id: string;
    type: SupplierAlertType;
    message: string;
    createdAt: Date;
  }>;
  variantCount: number;
  unavailableVariantCount: number;
}

export async function getDropshippingDashboard(filters: DropshippingDashboardFilters = {}): Promise<{
  items: DropshippingDashboardItem[];
  totals: {
    sources: number;
    openAlerts: number;
    mercadoLivre: number;
    shopee: number;
    criticalStatuses: number;
  };
  pricingRules: Array<{
    id: string;
    label: string;
    marginPercent: string;
    marginFixedCents: number;
    minimumMarginCents: number;
    roundingMode: PricingRoundingMode;
    isActive: boolean;
  }>;
}> {
  const where = {
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query
      ? {
          product: {
            title: {
              contains: filters.query,
              mode: "insensitive" as const
            }
          }
        }
      : {}),
    ...(filters.alert === "open"
      ? {
          alerts: {
            some: {
              status: SupplierAlertStatus.OPEN
            }
          }
        }
      : {})
  };

  const [sources, openAlerts, mercadoLivre, shopee, criticalStatuses, pricingRules] = await Promise.all([
    prisma.productSource.findMany({
      include: {
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 3,
          where: { status: SupplierAlertStatus.OPEN }
        },
        product: true,
        supplier: true,
        variants: true
      },
      orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "desc" }],
      take: 120,
      where
    }),
    prisma.sourceAlert.count({ where: { status: SupplierAlertStatus.OPEN } }),
    prisma.productSource.count({ where: { provider: SupplierProvider.MERCADO_LIVRE } }),
    prisma.productSource.count({ where: { provider: SupplierProvider.SHOPEE } }),
    prisma.productSource.count({
      where: {
        status: { in: [SupplierSourceStatus.PAUSED, SupplierSourceStatus.CLOSED, SupplierSourceStatus.DELETED, SupplierSourceStatus.OUT_OF_STOCK] }
      }
    }),
    prisma.pricingRule.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10
    })
  ]);

  const items = await Promise.all(
    sources.map(async (source) => {
      const suggested = await getSuggestedPriceForProduct({
        categoryId: source.product.categoryId,
        productId: source.productId,
        sourcePriceCents: source.lastPriceCents,
        supplierId: source.supplierId
      });

      return {
        id: source.id,
        productId: source.productId,
        productTitle: source.product.title,
        productSlug: source.product.slug,
        provider: source.provider,
        originalUrl: source.originalUrl,
        status: source.status,
        lastPriceCents: source.lastPriceCents,
        lastStockQuantity: source.lastStockQuantity,
        storePriceCents: source.product.priceCents,
        suggestedPriceCents: suggested?.priceCents ?? null,
        suggestedMarginCents: suggested?.marginCents ?? null,
        suggestedRuleLabel: suggested?.ruleLabel ?? null,
        lastCheckedAt: source.lastCheckedAt,
        lastError: source.lastError,
        openAlerts: source.alerts.map((alert) => ({
          id: alert.id,
          type: alert.type,
          message: alert.message,
          createdAt: alert.createdAt
        })),
        variantCount: source.variants.length,
        unavailableVariantCount: source.variants.filter((variant) => unavailableStatuses.includes(variant.status)).length
      } satisfies DropshippingDashboardItem;
    })
  );

  return {
    items,
    totals: {
      sources: sources.length,
      openAlerts,
      mercadoLivre,
      shopee,
      criticalStatuses
    },
    pricingRules: pricingRules.map((rule) => ({
      id: rule.id,
      label: rule.scope,
      marginPercent: String(rule.marginPercent),
      marginFixedCents: rule.marginFixedCents,
      minimumMarginCents: rule.minimumMarginCents,
      roundingMode: rule.roundingMode,
      isActive: rule.isActive
    }))
  };
}

export function formatOptionalCurrency(value: number | null): string {
  return value === null ? "-" : formatCurrency(value);
}
