import { SupplierProvider, SupplierSourceStatus } from "@/generated/prisma/client";

import { SupplierProductSnapshot, SupplierSyncError, type ParsedSupplierUrl, type SupplierVariantSnapshot } from "./types";

const mercadoLivreItemApi = "https://api.mercadolibre.com/items";

export function detectSupplierFromUrl(originalUrl: string): ParsedSupplierUrl | null {
  const url = originalUrl.trim();

  if (!url) {
    return null;
  }

  const mercadoLivreId = url.match(/\bMLB-?(\d{5,})\b/i)?.[1];

  if (/mercadolivre\.com|mercadolibre\.com/i.test(url) || mercadoLivreId) {
    return {
      provider: SupplierProvider.MERCADO_LIVRE,
      externalId: mercadoLivreId ? `MLB${mercadoLivreId}` : null
    };
  }

  const shopeeMatch = url.match(/(?:^|[-.])i\.(\d+)\.(\d+)(?:[/?#]|$)/i);

  if (/shopee\./i.test(url) || shopeeMatch) {
    return {
      provider: SupplierProvider.SHOPEE,
      externalId: shopeeMatch?.[2] ?? null,
      externalShopId: shopeeMatch?.[1] ?? null
    };
  }

  return {
    provider: SupplierProvider.CUSTOM,
    externalId: null
  };
}

export async function fetchSupplierSnapshot(params: {
  provider: SupplierProvider;
  externalId: string | null;
  externalShopId?: string | null;
  originalUrl: string;
}): Promise<SupplierProductSnapshot> {
  if (params.provider === SupplierProvider.MERCADO_LIVRE) {
    return fetchMercadoLivreSnapshot(params.externalId);
  }

  if (params.provider === SupplierProvider.SHOPEE) {
    return buildAssistedShopeeSnapshot(params);
  }

  throw new SupplierSyncError("Fornecedor sem conector automatico configurado.", SupplierSourceStatus.CONFIG_REQUIRED);
}

async function fetchMercadoLivreSnapshot(externalId: string | null): Promise<SupplierProductSnapshot> {
  if (!externalId) {
    throw new SupplierSyncError("Link do Mercado Livre sem ID MLB valido.", SupplierSourceStatus.ERROR);
  }

  const response = await fetch(`${mercadoLivreItemApi}/${encodeURIComponent(externalId)}`, {
    headers: {
      accept: "application/json",
      "user-agent": "NerdLingoLab dropshipping monitor"
    },
    next: { revalidate: 0 }
  });

  if (response.status === 404) {
    throw new SupplierSyncError("Produto nao encontrado no Mercado Livre.", SupplierSourceStatus.DELETED);
  }

  if (!response.ok) {
    throw new SupplierSyncError(`Mercado Livre retornou HTTP ${response.status}.`, SupplierSourceStatus.ERROR);
  }

  const item = await response.json() as MercadoLivreItem;
  const variants = Array.isArray(item.variations)
    ? item.variations.map((variation) => normalizeMercadoLivreVariation(variation, item.currency_id))
    : [];
  const stockQuantity = normalizeQuantity(item.available_quantity);
  const status = mapMercadoLivreStatus(item.status, stockQuantity, variants);

  return {
    provider: SupplierProvider.MERCADO_LIVRE,
    externalId,
    title: typeof item.title === "string" ? item.title : null,
    status,
    priceCents: toCents(item.price),
    currency: typeof item.currency_id === "string" ? item.currency_id : null,
    stockQuantity,
    variants,
    rawSummary: {
      id: item.id,
      permalink: item.permalink,
      status: item.status,
      listing_type_id: item.listing_type_id,
      condition: item.condition
    },
    fetchedAt: new Date()
  };
}

function buildAssistedShopeeSnapshot(params: {
  externalId: string | null;
  externalShopId?: string | null;
  originalUrl: string;
}): SupplierProductSnapshot {
  if (!params.externalId || !params.externalShopId) {
    throw new SupplierSyncError("Link da Shopee sem shop_id/item_id validos.", SupplierSourceStatus.ERROR);
  }

  return {
    provider: SupplierProvider.SHOPEE,
    externalId: params.externalId,
    externalShopId: params.externalShopId,
    title: null,
    status: SupplierSourceStatus.CONFIG_REQUIRED,
    priceCents: null,
    currency: "BRL",
    stockQuantity: null,
    variants: [],
    rawSummary: {
      mode: "third_party_assisted",
      reason: "Shopee de terceiros sem leitura publica confiavel. Use validacao manual.",
      url: params.originalUrl
    },
    fetchedAt: new Date()
  };
}

function normalizeMercadoLivreVariation(variation: MercadoLivreVariation, currency: unknown): SupplierVariantSnapshot {
  const optionValues = Object.fromEntries(
    (variation.attribute_combinations ?? [])
      .map((attribute) => [String(attribute.name ?? attribute.id ?? "Opcao"), String(attribute.value_name ?? attribute.value_id ?? "")])
      .filter(([, value]) => value.trim())
  );
  const stockQuantity = normalizeQuantity(variation.available_quantity);

  return {
    externalVariantId: String(variation.id),
    title: Object.values(optionValues).join(" / ") || String(variation.id),
    optionValues,
    priceCents: toCents(variation.price),
    currency: typeof currency === "string" ? currency : null,
    stockQuantity,
    status: stockQuantity === 0 ? SupplierSourceStatus.OUT_OF_STOCK : SupplierSourceStatus.ACTIVE
  };
}

function mapMercadoLivreStatus(status: unknown, stockQuantity: number | null, variants: SupplierVariantSnapshot[]): SupplierSourceStatus {
  if (status === "active") {
    const hasVariantStock = variants.some((variant) => (variant.stockQuantity ?? 0) > 0);
    const hasStock = (stockQuantity ?? 0) > 0 || hasVariantStock;

    return hasStock ? SupplierSourceStatus.ACTIVE : SupplierSourceStatus.OUT_OF_STOCK;
  }

  if (status === "paused") {
    return SupplierSourceStatus.PAUSED;
  }

  if (status === "closed") {
    return SupplierSourceStatus.CLOSED;
  }

  return SupplierSourceStatus.UNKNOWN;
}

function toCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100);
}

function normalizeQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.floor(value));
}

interface MercadoLivreItem {
  id?: string;
  title?: string;
  status?: string;
  price?: number;
  currency_id?: string;
  available_quantity?: number;
  permalink?: string;
  listing_type_id?: string;
  condition?: string;
  variations?: MercadoLivreVariation[];
}

interface MercadoLivreVariation {
  id: number | string;
  price?: number;
  available_quantity?: number;
  attribute_combinations?: Array<{
    id?: string;
    name?: string;
    value_id?: string;
    value_name?: string;
  }>;
}
