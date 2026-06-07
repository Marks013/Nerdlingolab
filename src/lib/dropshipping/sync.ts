import {
  ProductStatus,
  SupplierAlertSeverity,
  SupplierAlertStatus,
  SupplierAlertType,
  SupplierProvider,
  SupplierSourceStatus,
  type ProductSource
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";

import { prisma } from "@/lib/prisma";

import { detectSupplierFromUrl, fetchSupplierSnapshot } from "./providers";
import { getSuggestedPriceForProduct } from "./pricing";
import { SupplierSyncError, type SupplierProductSnapshot } from "./types";

const sourceMetafieldKeys = ["admin.originalProductUrl", "originalProductUrl"];
const closedSourceStatuses: SupplierSourceStatus[] = [
  SupplierSourceStatus.PAUSED,
  SupplierSourceStatus.CLOSED,
  SupplierSourceStatus.DELETED
];
const sourceAvailabilityAlertTypes: SupplierAlertType[] = [
  SupplierAlertType.API_ERROR,
  SupplierAlertType.CONFIG_REQUIRED,
  SupplierAlertType.OUT_OF_STOCK,
  SupplierAlertType.SOURCE_CLOSED,
  SupplierAlertType.SOURCE_PAUSED
];

export async function ensureDefaultDropshippingConfig(): Promise<void> {
  await prisma.$transaction([
    prisma.supplier.upsert({
      create: { id: "supplier_mercado_livre", name: "Mercado Livre", provider: SupplierProvider.MERCADO_LIVRE },
      update: { isActive: true },
      where: { provider_name: { provider: SupplierProvider.MERCADO_LIVRE, name: "Mercado Livre" } }
    }),
    prisma.supplier.upsert({
      create: { id: "supplier_shopee", name: "Shopee", provider: SupplierProvider.SHOPEE },
      update: { isActive: true },
      where: { provider_name: { provider: SupplierProvider.SHOPEE, name: "Shopee" } }
    }),
    prisma.pricingRule.upsert({
      create: {
        id: "pricing_global_default",
        scope: "GLOBAL",
        marginPercent: 35,
        marginFixedCents: 0,
        minimumMarginCents: 1000,
        roundingMode: "END_90"
      },
      update: {},
      where: { id: "pricing_global_default" }
    })
  ]);
}

export async function ensureProductSourcesFromMetafields(limit = 500): Promise<{ created: number; skipped: number }> {
  await ensureDefaultDropshippingConfig();

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      metafields: true
    },
    take: limit,
    where: {
      status: { not: ProductStatus.ARCHIVED }
    }
  });
  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const originalUrl = extractOriginalProductUrl(product.metafields);

    if (!originalUrl) {
      skipped += 1;
      continue;
    }

    const parsed = detectSupplierFromUrl(originalUrl);

    if (!parsed) {
      skipped += 1;
      continue;
    }

    const supplier = await resolveSupplier(parsed.provider);

    await prisma.productSource.upsert({
      create: {
        productId: product.id,
        supplierId: supplier.id,
        provider: parsed.provider,
        originalUrl,
        externalId: parsed.externalId,
        externalShopId: parsed.externalShopId,
        status: SupplierSourceStatus.UNKNOWN
      },
      update: {
        externalId: parsed.externalId,
        externalShopId: parsed.externalShopId,
        provider: parsed.provider,
        syncEnabled: true
      },
      where: {
        productId_supplierId_originalUrl: {
          productId: product.id,
          supplierId: supplier.id,
          originalUrl
        }
      }
    });
    created += 1;
  }

  return { created, skipped };
}

export async function syncProductSource(sourceId: string): Promise<ProductSource> {
  await ensureDefaultDropshippingConfig();

  const source = await prisma.productSource.findUnique({
    include: {
      product: {
        include: { variants: true }
      },
      snapshots: {
        orderBy: { fetchedAt: "desc" },
        take: 1
      }
    },
    where: { id: sourceId }
  });

  if (!source) {
    throw new Error("Origem de produto nao encontrada.");
  }

  try {
    const snapshot = await fetchSupplierSnapshot({
      provider: source.provider,
      externalId: source.externalId,
      externalShopId: source.externalShopId,
      originalUrl: source.originalUrl
    });

    await persistSnapshot(source, snapshot);

    return prisma.productSource.findUniqueOrThrow({ where: { id: source.id } });
  } catch (error) {
    const syncError = normalizeSyncError(error);

    await prisma.productSource.update({
      data: {
        lastCheckedAt: new Date(),
        lastError: syncError.message,
        status: syncError.status
      },
      where: { id: source.id }
    });
    await upsertOpenAlert(source.id, {
      message: syncError.message,
      severity: syncError.status === SupplierSourceStatus.CONFIG_REQUIRED ? SupplierAlertSeverity.WARNING : SupplierAlertSeverity.CRITICAL,
      type: syncError.status === SupplierSourceStatus.CONFIG_REQUIRED ? SupplierAlertType.CONFIG_REQUIRED : SupplierAlertType.API_ERROR
    });

    if (syncError.status !== SupplierSourceStatus.CONFIG_REQUIRED) {
      Sentry.captureException(error, {
        tags: { feature: "dropshipping-sync", provider: source.provider }
      });
    }

    return prisma.productSource.findUniqueOrThrow({ where: { id: source.id } });
  }
}

export async function syncDueProductSources(limit = 25): Promise<{ attempted: number; failed: number }> {
  await ensureProductSourcesFromMetafields();

  const sources = await prisma.productSource.findMany({
    orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true },
    take: limit,
    where: {
      product: {
        status: { not: ProductStatus.ARCHIVED }
      },
      syncEnabled: true
    }
  });
  let failed = 0;

  for (const source of sources) {
    const result = await syncProductSource(source.id);

    if (result.status === SupplierSourceStatus.ERROR) {
      failed += 1;
    }
  }

  return { attempted: sources.length, failed };
}

export async function applySuggestedSourcePrice(sourceId: string): Promise<void> {
  const source = await prisma.productSource.findUnique({
    include: { product: true },
    where: { id: sourceId }
  });

  if (!source) {
    throw new Error("Origem de produto nao encontrada.");
  }

  const suggested = await getSuggestedPriceForProduct({
    categoryId: source.product.categoryId,
    productId: source.productId,
    sourcePriceCents: source.lastPriceCents,
    supplierId: source.supplierId
  });

  if (!suggested) {
    throw new Error("Sem preco de fornecedor valido para aplicar.");
  }

  await prisma.product.update({
    data: {
      priceCents: suggested.priceCents,
      variants: {
        updateMany: {
          data: { priceCents: suggested.priceCents },
          where: { productId: source.productId }
        }
      }
    },
    where: { id: source.productId }
  });
}

export async function updateManualProductSourceSnapshot(input: {
  sourceId: string;
  status: SupplierSourceStatus;
  priceCents: number | null;
  stockQuantity: number | null;
  note?: string | null;
}): Promise<void> {
  const source = await prisma.productSource.findUnique({
    where: { id: input.sourceId }
  });

  if (!source) {
    throw new Error("Origem de produto nao encontrada.");
  }

  const now = new Date();
  const normalizedStatus = normalizeSupplierStatus(source.provider, input.status);
  const normalizedStockQuantity = source.provider === SupplierProvider.SHOPEE ? null : input.stockQuantity;
  const nextPriceCents = input.priceCents ?? source.lastPriceCents;
  const nextStockQuantity = normalizedStockQuantity ?? source.lastStockQuantity;

  await prisma.$transaction(async (tx) => {
    await tx.productSource.update({
      data: {
        lastCheckedAt: now,
        lastCurrency: input.priceCents !== null ? "BRL" : source.lastCurrency,
        lastError: input.note || null,
        lastPriceCents: nextPriceCents,
        lastStockQuantity: nextStockQuantity,
        lastSuccessfulSyncAt: now,
        status: normalizedStatus
      },
      where: { id: source.id }
    });

    await tx.productSourceSnapshot.create({
      data: {
        productSourceId: source.id,
        status: normalizedStatus,
        priceCents: input.priceCents,
        currency: "BRL",
        stockQuantity: normalizedStockQuantity,
        rawSummary: {
          mode: "manual_assisted",
          note: input.note ?? null
        }
      }
    });

    if (normalizedStatus === SupplierSourceStatus.ACTIVE) {
      await tx.sourceAlert.updateMany({
        data: {
          resolvedAt: now,
          status: SupplierAlertStatus.RESOLVED
        },
        where: {
          productSourceId: source.id,
          status: SupplierAlertStatus.OPEN
        }
      });
    }
  });

  if (normalizedStatus === SupplierSourceStatus.OUT_OF_STOCK) {
    await upsertOpenAlert(source.id, {
      message: "Validacao manual marcou fornecedor sem estoque.",
      severity: SupplierAlertSeverity.CRITICAL,
      type: SupplierAlertType.OUT_OF_STOCK
    });
  }

  if (closedSourceStatuses.includes(normalizedStatus)) {
    await upsertOpenAlert(source.id, {
      message: `Validacao manual marcou origem como ${normalizedStatus}.`,
      severity: SupplierAlertSeverity.CRITICAL,
      type: normalizedStatus === SupplierSourceStatus.PAUSED ? SupplierAlertType.SOURCE_PAUSED : SupplierAlertType.SOURCE_CLOSED
    });
  }
}

export async function acknowledgeSourceAlert(alertId: string): Promise<void> {
  await prisma.sourceAlert.update({
    data: {
      status: SupplierAlertStatus.ACKNOWLEDGED
    },
    where: { id: alertId }
  });
}

export function extractOriginalProductUrl(metafields: unknown): string | null {
  if (!metafields || typeof metafields !== "object" || Array.isArray(metafields)) {
    return null;
  }

  const record = metafields as Record<string, unknown>;

  for (const key of sourceMetafieldKeys) {
    const value = record[key];

    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }

  return null;
}

async function persistSnapshot(
  source: ProductSource & {
    product: {
      id: string;
      categoryId: string | null;
      variants: Array<{
        id: string;
        optionValues: unknown;
      }>;
    };
    snapshots: Array<{
      priceCents: number | null;
      stockQuantity: number | null;
      status: SupplierSourceStatus;
    }>;
  },
  snapshot: SupplierProductSnapshot
): Promise<void> {
  const previous = source.snapshots[0];
  const now = snapshot.fetchedAt;
  const normalizedStatus = normalizeSupplierStatus(source.provider, snapshot.status);
  const normalizedStockQuantity = source.provider === SupplierProvider.SHOPEE ? null : snapshot.stockQuantity;
  const nextPriceCents = snapshot.priceCents ?? source.lastPriceCents;
  const nextStockQuantity = normalizedStockQuantity ?? source.lastStockQuantity;

  await prisma.$transaction(async (tx) => {
    await tx.productSource.update({
      data: {
        externalId: snapshot.externalId,
        externalShopId: snapshot.externalShopId,
        lastCheckedAt: now,
        lastCurrency: snapshot.priceCents !== null ? snapshot.currency : source.lastCurrency,
        lastError: null,
        lastPriceCents: nextPriceCents,
        lastStockQuantity: nextStockQuantity,
        lastSuccessfulSyncAt: now,
        status: normalizedStatus,
        title: snapshot.title
      },
      where: { id: source.id }
    });

    await tx.productSourceSnapshot.create({
      data: {
        productSourceId: source.id,
        status: normalizedStatus,
        title: snapshot.title,
        priceCents: snapshot.priceCents,
        currency: snapshot.currency,
        stockQuantity: normalizedStockQuantity,
        variantCount: snapshot.variants.length,
        rawSummary: snapshot.rawSummary as Prisma.InputJsonObject
      }
    });

    for (const variant of snapshot.variants) {
      const localVariantId = findMatchingLocalVariantId(source.product.variants, variant.optionValues);

      await tx.productSourceVariant.upsert({
        create: {
          productSourceId: source.id,
          variantId: localVariantId,
          externalVariantId: variant.externalVariantId,
          title: variant.title,
          optionValues: variant.optionValues,
          priceCents: variant.priceCents,
          currency: variant.currency,
          stockQuantity: variant.stockQuantity,
          imageUrl: variant.imageUrl,
          status: variant.status,
          lastCheckedAt: now
        },
        update: {
          variantId: localVariantId,
          title: variant.title,
          optionValues: variant.optionValues,
          priceCents: variant.priceCents,
          currency: variant.currency,
          stockQuantity: variant.stockQuantity,
          imageUrl: variant.imageUrl,
          status: variant.status,
          lastCheckedAt: now
        },
        where: {
          productSourceId_externalVariantId: {
            productSourceId: source.id,
            externalVariantId: variant.externalVariantId
          }
        }
      });
    }
  });

  if (normalizedStatus === SupplierSourceStatus.ACTIVE) {
    await prisma.sourceAlert.updateMany({
      data: {
        resolvedAt: now,
        status: SupplierAlertStatus.RESOLVED
      },
      where: {
        productSourceId: source.id,
        status: SupplierAlertStatus.OPEN,
        type: { in: sourceAvailabilityAlertTypes }
      }
    });
  }

  await createChangeAlerts(source, { ...snapshot, status: normalizedStatus, stockQuantity: normalizedStockQuantity }, previous);
}

function normalizeSupplierStatus(provider: SupplierProvider, status: SupplierSourceStatus): SupplierSourceStatus {
  if (provider === SupplierProvider.SHOPEE && status === SupplierSourceStatus.OUT_OF_STOCK) {
    return SupplierSourceStatus.ACTIVE;
  }

  return status;
}

async function createChangeAlerts(
  source: ProductSource & { product: { id: string; categoryId: string | null } },
  snapshot: SupplierProductSnapshot,
  previous?: { priceCents: number | null; stockQuantity: number | null; status: SupplierSourceStatus }
): Promise<void> {
  if (closedSourceStatuses.includes(snapshot.status)) {
    await upsertOpenAlert(source.id, {
      message: `Fornecedor marcou o produto como ${snapshot.status}.`,
      severity: SupplierAlertSeverity.CRITICAL,
      type: snapshot.status === SupplierSourceStatus.PAUSED ? SupplierAlertType.SOURCE_PAUSED : SupplierAlertType.SOURCE_CLOSED
    });
  }

  if (snapshot.status === SupplierSourceStatus.OUT_OF_STOCK || snapshot.stockQuantity === 0) {
    await upsertOpenAlert(source.id, {
      message: "Fornecedor sem estoque disponivel para este produto.",
      severity: SupplierAlertSeverity.CRITICAL,
      type: SupplierAlertType.OUT_OF_STOCK
    });
  }

  if (previous?.priceCents && snapshot.priceCents && snapshot.priceCents > previous.priceCents) {
    await upsertOpenAlert(source.id, {
      message: `Preco fornecedor subiu de ${previous.priceCents} para ${snapshot.priceCents} centavos.`,
      severity: SupplierAlertSeverity.WARNING,
      type: SupplierAlertType.PRICE_INCREASE
    });
  }

  const suggested = await getSuggestedPriceForProduct({
    categoryId: source.product.categoryId,
    productId: source.productId,
    sourcePriceCents: snapshot.priceCents,
    supplierId: source.supplierId
  });

  if (suggested && snapshot.priceCents && suggested.marginCents < 1000) {
    await upsertOpenAlert(source.id, {
      message: "Margem sugerida abaixo do minimo operacional.",
      severity: SupplierAlertSeverity.WARNING,
      type: SupplierAlertType.MARGIN_BELOW_MIN
    });
  }
}

async function upsertOpenAlert(
  sourceId: string,
  input: { message: string; severity: SupplierAlertSeverity; type: SupplierAlertType }
): Promise<void> {
  const existing = await prisma.sourceAlert.findFirst({
    select: { id: true },
    where: {
      productSourceId: sourceId,
      status: SupplierAlertStatus.OPEN,
      type: input.type
    }
  });

  if (existing) {
    await prisma.sourceAlert.update({
      data: {
        message: input.message,
        severity: input.severity
      },
      where: { id: existing.id }
    });
    return;
  }

  await prisma.sourceAlert.create({
    data: {
      productSourceId: sourceId,
      message: input.message,
      severity: input.severity,
      type: input.type
    }
  });
}

function findMatchingLocalVariantId(
  variants: Array<{ id: string; optionValues: unknown }>,
  sourceOptions: Record<string, string>
): string | null {
  const sourceTokens = normalizeOptionTokens(sourceOptions);

  if (!sourceTokens.length) {
    return null;
  }

  let bestMatch: { id: string; score: number } | null = null;

  for (const variant of variants) {
    const score = countIntersection(sourceTokens, normalizeOptionTokens(variant.optionValues));

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: variant.id, score };
    }
  }

  return bestMatch?.id ?? null;
}

function normalizeOptionTokens(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.values(value as Record<string, unknown>)
    .flatMap((item) => String(item).split(/[\s/,-]+/))
    .map((item) => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim())
    .filter(Boolean);
}

function countIntersection(left: string[], right: string[]): number {
  const rightSet = new Set(right);

  return left.filter((item) => rightSet.has(item)).length;
}

function normalizeSyncError(error: unknown): SupplierSyncError {
  if (error instanceof SupplierSyncError) {
    return error;
  }

  if (error instanceof Error) {
    return new SupplierSyncError(error.message, SupplierSourceStatus.ERROR);
  }

  return new SupplierSyncError("Erro desconhecido no sync do fornecedor.", SupplierSourceStatus.ERROR);
}

async function resolveSupplier(provider: SupplierProvider): Promise<{ id: string }> {
  const nameByProvider: Record<SupplierProvider, string> = {
    [SupplierProvider.MERCADO_LIVRE]: "Mercado Livre",
    [SupplierProvider.SHOPEE]: "Shopee",
    [SupplierProvider.MANUAL]: "Manual",
    [SupplierProvider.CUSTOM]: "Fornecedor personalizado"
  };

  return prisma.supplier.upsert({
    create: {
      name: nameByProvider[provider],
      provider
    },
    select: { id: true },
    update: { isActive: true },
    where: {
      provider_name: {
        provider,
        name: nameByProvider[provider]
      }
    }
  });
}
