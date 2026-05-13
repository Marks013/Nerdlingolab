import {
  ProductStatus,
  SupplierAlertStatus,
  SupplierAlertType,
  SupplierProvider,
  SupplierSourceStatus,
  type PricingRoundingMode
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { getActivePricingRules, getSuggestedPriceFromRules } from "./pricing";

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
  scope?: "active" | "all" | "review";
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
    filteredSources: number;
    openAlerts: number;
    mercadoLivre: number;
    shopee: number;
    criticalStatuses: number;
    sources: number;
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
  const where = buildDashboardWhere(filters);

  const [sources, totalSources, filteredSources, openAlerts, mercadoLivre, shopee, criticalStatuses, pricingRules] = await Promise.all([
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
    prisma.productSource.count({
      where: {
        product: {
          status: { not: ProductStatus.ARCHIVED }
        }
      }
    }),
    prisma.productSource.count({ where }),
    prisma.sourceAlert.count({
      where: {
        productSource: {
          product: {
            status: { not: ProductStatus.ARCHIVED }
          }
        },
        status: SupplierAlertStatus.OPEN
      }
    }),
    prisma.productSource.count({
      where: {
        product: {
          status: { not: ProductStatus.ARCHIVED }
        },
        provider: SupplierProvider.MERCADO_LIVRE
      }
    }),
    prisma.productSource.count({
      where: {
        product: {
          status: { not: ProductStatus.ARCHIVED }
        },
        provider: SupplierProvider.SHOPEE
      }
    }),
    prisma.productSource.count({
      where: {
        product: {
          status: { not: ProductStatus.ARCHIVED }
        },
        status: { in: [SupplierSourceStatus.PAUSED, SupplierSourceStatus.CLOSED, SupplierSourceStatus.DELETED, SupplierSourceStatus.OUT_OF_STOCK] }
      }
    }),
    getActivePricingRules()
  ]);

  const items = sources.map((source) => {
    const suggested = getSuggestedPriceFromRules(pricingRules, {
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
  });

  return {
    items,
    totals: {
      filteredSources,
      openAlerts,
      mercadoLivre,
      shopee,
      criticalStatuses,
      sources: totalSources
    },
    pricingRules: pricingRules.slice(0, 10).map((rule) => ({
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

export function buildDropshippingSourceWhere(filters: DropshippingDashboardFilters = {}): Prisma.ProductSourceWhereInput {
  return buildDashboardWhere(filters);
}

function buildDashboardWhere(filters: DropshippingDashboardFilters = {}): Prisma.ProductSourceWhereInput {
  const scopeWhere = resolveDashboardScopeWhere(filters);
  const combinedFilters: Prisma.ProductSourceWhereInput[] = [];

  if (!filters.status && hasWhereClause(scopeWhere)) {
    combinedFilters.push(scopeWhere);
  }

  if (filters.query) {
    combinedFilters.push({
      OR: [
        {
          product: {
            title: {
              contains: filters.query,
              mode: "insensitive" as const
            }
          }
        },
        {
          product: {
            slug: {
              contains: filters.query,
              mode: "insensitive" as const
            }
          }
        },
        {
          title: {
            contains: filters.query,
            mode: "insensitive" as const
          }
        },
        {
          originalUrl: {
            contains: filters.query,
            mode: "insensitive" as const
          }
        },
        {
          externalId: {
            contains: filters.query,
            mode: "insensitive" as const
          }
        }
      ]
    });
  }

  if (filters.alert === "open") {
    combinedFilters.push({
      alerts: {
        some: {
          status: SupplierAlertStatus.OPEN
        }
      }
    });
  }

  return {
    ...(combinedFilters.length ? { AND: combinedFilters } : {}),
    product: {
      status: { not: ProductStatus.ARCHIVED }
    },
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.status ? { status: filters.status } : {})
  };
}

function resolveDashboardScopeWhere(filters: DropshippingDashboardFilters): Prisma.ProductSourceWhereInput {
  if (filters.scope === "all") {
    return {};
  }

  if (filters.scope === "active") {
    return {
      alerts: {
        none: {
          status: SupplierAlertStatus.OPEN
        }
      },
      status: SupplierSourceStatus.ACTIVE
    };
  }

  return {
    OR: [
      {
        status: {
          not: SupplierSourceStatus.ACTIVE
        }
      },
      {
        alerts: {
          some: {
            status: SupplierAlertStatus.OPEN
          }
        }
      }
    ]
  };
}

function hasWhereClause(where: Prisma.ProductSourceWhereInput): boolean {
  return Object.keys(where).length > 0;
}

export function formatOptionalCurrency(value: number | null): string {
  return value === null ? "-" : formatCurrency(value);
}
