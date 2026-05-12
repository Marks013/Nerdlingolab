import { SupplierSourceStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { getActivePricingRules, getSuggestedPriceFromRules } from "./pricing";
import { buildDropshippingSourceWhere, type DropshippingDashboardFilters } from "./queries";

const unavailableStatuses: SupplierSourceStatus[] = [
  SupplierSourceStatus.OUT_OF_STOCK,
  SupplierSourceStatus.PAUSED,
  SupplierSourceStatus.CLOSED,
  SupplierSourceStatus.DELETED
];

const supplierSnapshotCsvHeaders = [
  "sourceId",
  "productId",
  "productTitle",
  "productSlug",
  "provider",
  "url",
  "externalId",
  "externalShopId",
  "currentSourceTitle",
  "currentStatus",
  "lastPrice",
  "lastStock",
  "storePrice",
  "suggestedPrice",
  "suggestedMargin",
  "lastCheckedAt",
  "lastError",
  "variantCount",
  "unavailableVariantCount",
  "preco_importacao",
  "estoque_importacao",
  "status",
  "titulo_importacao",
  "note"
];

export async function buildSupplierSnapshotCsv(filters: DropshippingDashboardFilters = {}): Promise<string> {
  const [sources, pricingRules] = await Promise.all([
    prisma.productSource.findMany({
      include: {
        product: {
          select: {
            id: true,
            priceCents: true,
            slug: true,
            title: true,
            categoryId: true
          }
        },
        variants: {
          select: {
            status: true
          }
        }
      },
      orderBy: [{ product: { title: "asc" } }, { createdAt: "asc" }],
      take: 1_000,
      where: buildDropshippingSourceWhere(filters)
    }),
    getActivePricingRules()
  ]);

  const rows = sources.map((source) => {
    const suggested = getSuggestedPriceFromRules(pricingRules, {
      categoryId: source.product.categoryId,
      productId: source.productId,
      sourcePriceCents: source.lastPriceCents,
      supplierId: source.supplierId
    });

    return [
      source.id,
      source.product.id,
      source.product.title,
      source.product.slug,
      source.provider,
      source.originalUrl,
      source.externalId ?? "",
      source.externalShopId ?? "",
      source.title ?? "",
      source.status,
      formatCents(source.lastPriceCents),
      source.lastStockQuantity ?? "",
      formatCents(source.product.priceCents),
      formatCents(suggested?.priceCents ?? null),
      formatCents(suggested?.marginCents ?? null),
      source.lastCheckedAt?.toISOString() ?? "",
      source.lastError ?? "",
      source.variants.length,
      source.variants.filter((variant) => unavailableStatuses.includes(variant.status)).length,
      formatCents(source.lastPriceCents),
      source.lastStockQuantity ?? "",
      source.status,
      source.title ?? source.product.title,
      ""
    ];
  });

  return [
    supplierSnapshotCsvHeaders.map(escapeCsvValue).join(";"),
    ...rows.map((row) => row.map((value) => escapeCsvValue(String(value))).join(";"))
  ].join("\r\n");
}

function formatCents(value: number | null): string {
  if (value === null) {
    return "";
  }

  return (value / 100).toFixed(2).replace(".", ",");
}

function escapeCsvValue(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}
