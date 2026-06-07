import { SupplierProvider, SupplierSourceStatus } from "@/generated/prisma/client";

import { SupplierProductSnapshot, SupplierSyncError, type ParsedSupplierUrl, type SupplierVariantSnapshot } from "./types";

const mercadoLivreItemApi = "https://api.mercadolibre.com/items";

export function detectSupplierFromUrl(originalUrl: string): ParsedSupplierUrl | null {
  const url = originalUrl.trim();

  if (!url) {
    return null;
  }

  const mercadoLivreId = extractMercadoLivreItemId(url);

  if (/mercadolivre\.com|mercadolibre\.com/i.test(url) || mercadoLivreId) {
    return {
      provider: SupplierProvider.MERCADO_LIVRE,
      externalId: mercadoLivreId
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

function extractMercadoLivreItemId(value: string): string | null {
  const normalized = normalizeMercadoLivreItemId(readMercadoLivreQueryParam(value, "wid"))
    ?? normalizeMercadoLivreItemId(readMercadoLivreQueryParam(value, "item_id"));

  if (normalized) {
    return normalized;
  }

  try {
    const url = new URL(value);
    const pathItemId = normalizeMercadoLivreItemId(url.pathname.match(/\/(MLB-?\d{5,})(?:[-_/]|$)/i)?.[1]);

    if (pathItemId && !/\/p\/MLB/i.test(url.pathname)) {
      return pathItemId;
    }
  } catch {
    return normalizeMercadoLivreItemId(value);
  }

  return null;
}

function readMercadoLivreQueryParam(value: string, name: string): string | null {
  try {
    const url = new URL(value);
    const fromSearch = url.searchParams.get(name);

    if (fromSearch) {
      return fromSearch;
    }

    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;

    return new URLSearchParams(hash).get(name);
  } catch {
    return null;
  }
}

function normalizeMercadoLivreItemId(value: string | null | undefined): string | null {
  const match = String(value ?? "").match(/\bMLB-?(\d{5,})\b/i);

  return match ? `MLB${match[1]}` : null;
}

export async function fetchSupplierSnapshot(params: {
  provider: SupplierProvider;
  externalId: string | null;
  externalShopId?: string | null;
  originalUrl: string;
}): Promise<SupplierProductSnapshot> {
  if (params.provider === SupplierProvider.MERCADO_LIVRE) {
    return fetchMercadoLivreSnapshot(params.externalId, params.originalUrl);
  }

  if (params.provider === SupplierProvider.SHOPEE) {
    return fetchShopeeSnapshot(params);
  }

  throw new SupplierSyncError("Fornecedor sem conector automatico configurado.", SupplierSourceStatus.CONFIG_REQUIRED);
}

async function fetchMercadoLivreSnapshot(externalId: string | null, originalUrl: string): Promise<SupplierProductSnapshot> {
  if (!externalId) {
    return buildManualRequiredSnapshot({
      originalUrl,
      provider: SupplierProvider.MERCADO_LIVRE,
      reason: "Link do Mercado Livre sem ID MLB válido."
    });
  }

  const response = await fetch(`${mercadoLivreItemApi}/${encodeURIComponent(externalId)}`, {
    headers: {
      accept: "application/json",
      "user-agent": "NerdLingoLab dropshipping monitor"
    },
    next: { revalidate: 0 }
  });

  if (response.status === 404) {
    const pageSnapshot = await fetchPublicProductPageSnapshot({
      blockedReason: "API do Mercado Livre retornou 404.",
      externalId,
      originalUrl,
      provider: SupplierProvider.MERCADO_LIVRE
    });

    if (pageSnapshot) {
      return pageSnapshot;
    }

    throw new SupplierSyncError("Produto nao encontrado no Mercado Livre.", SupplierSourceStatus.DELETED);
  }

  if (response.status === 401 || response.status === 403) {
    const pageSnapshot = await fetchPublicProductPageSnapshot({
      blockedReason: `API do Mercado Livre retornou HTTP ${response.status}.`,
      externalId,
      originalUrl,
      provider: SupplierProvider.MERCADO_LIVRE
    });

    if (pageSnapshot) {
      return pageSnapshot;
    }

    return {
      provider: SupplierProvider.MERCADO_LIVRE,
      externalId,
      title: null,
      status: SupplierSourceStatus.CONFIG_REQUIRED,
      priceCents: null,
      currency: "BRL",
      stockQuantity: null,
      variants: [],
      rawSummary: {
        mode: "third_party_assisted",
        reason: `Leitura publica do Mercado Livre retornou HTTP ${response.status} e a pagina nao expos preco estruturado. Use validacao manual.`,
        externalId
      },
      fetchedAt: new Date()
    };
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

async function fetchShopeeSnapshot(params: {
  externalId: string | null;
  externalShopId?: string | null;
  originalUrl: string;
}): Promise<SupplierProductSnapshot> {
  if (!params.externalId || !params.externalShopId) {
    return buildManualRequiredSnapshot({
      originalUrl: params.originalUrl,
      provider: SupplierProvider.SHOPEE,
      reason: "Link da Shopee sem shop_id/item_id válidos."
    });
  }

  const pageSnapshot = await fetchPublicProductPageSnapshot({
    blockedReason: "Shopee sem API publica confiavel para anuncio de terceiro.",
    externalId: params.externalId,
    externalShopId: params.externalShopId,
    originalUrl: params.originalUrl,
    provider: SupplierProvider.SHOPEE
  });

  return pageSnapshot ?? buildAssistedShopeeSnapshot(params);
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

function buildManualRequiredSnapshot(params: {
  originalUrl: string;
  provider: SupplierProvider;
  reason: string;
}): SupplierProductSnapshot {
  return {
    provider: params.provider,
    externalId: null,
    title: null,
    status: SupplierSourceStatus.CONFIG_REQUIRED,
    priceCents: null,
    currency: "BRL",
    stockQuantity: null,
    variants: [],
    rawSummary: {
      mode: "manual_required",
      reason: params.reason,
      url: params.originalUrl
    },
    fetchedAt: new Date()
  };
}

async function fetchPublicProductPageSnapshot(params: {
  blockedReason: string;
  externalId: string | null;
  externalShopId?: string | null;
  originalUrl: string;
  provider: SupplierProvider;
}): Promise<SupplierProductSnapshot | null> {
  try {
    const response = await fetch(params.originalUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.6",
        "user-agent": "Mozilla/5.0 (compatible; NerdLingoLabSupplierMonitor/1.0; +https://nerdlingolab.com)"
      },
      next: { revalidate: 0 },
      redirect: "follow"
    });

    const html = await response.text();

    if (!response.ok || isVerificationPage(response.url, html)) {
      return null;
    }

    const structured = extractStructuredProductData(html);

    if (!structured.priceCents && !structured.availability) {
      return null;
    }

    return {
      provider: params.provider,
      externalId: params.externalId,
      externalShopId: params.externalShopId,
      title: structured.title,
      status: statusFromStructuredAvailability(structured.availability, structured.priceCents),
      priceCents: structured.priceCents,
      currency: structured.currency ?? "BRL",
      stockQuantity: structured.stockQuantity,
      variants: [],
      rawSummary: {
        mode: "public_page_structured_data",
        reason: params.blockedReason,
        pageUrl: response.url,
        source: structured.source
      },
      fetchedAt: new Date()
    };
  } catch {
    return null;
  }
}

function isVerificationPage(url: string, html: string): boolean {
  return /account-verification|captcha|robot|challenge|verificacao|verifica[cç][aã]o/i.test(`${url}\n${html.slice(0, 4000)}`);
}

function extractStructuredProductData(html: string): {
  availability: string | null;
  currency: string | null;
  priceCents: number | null;
  source: string | null;
  stockQuantity: number | null;
  title: string | null;
} {
  const jsonLdProduct = extractJsonLdProducts(html)
    .map((product) => normalizeJsonLdProduct(product))
    .find((product) => product.priceCents || product.title || product.availability);

  if (jsonLdProduct) {
    return { ...jsonLdProduct, source: "json_ld" };
  }

  const price = readMetaContent(html, ["product:price:amount", "price", "twitter:data1"]);
  const currency = readMetaContent(html, ["product:price:currency", "priceCurrency"]);
  const title = readMetaContent(html, ["og:title", "twitter:title"]) ?? extractHtmlTitle(html);
  const availability = readMetaContent(html, ["product:availability", "availability"]);

  return {
    availability,
    currency,
    priceCents: parsePriceToCents(price),
    source: price || title || availability ? "meta_tags" : null,
    stockQuantity: availability && /outofstock|esgotado|indispon/i.test(availability) ? 0 : null,
    title
  };
}

function extractJsonLdProducts(html: string): unknown[] {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const products: unknown[] = [];

  for (const block of blocks) {
    const rawJson = decodeHtmlEntities(block[1]?.trim() ?? "");

    if (!rawJson) {
      continue;
    }

    try {
      collectProductNodes(JSON.parse(rawJson), products);
    } catch {
      continue;
    }
  }

  return products;
}

function collectProductNodes(value: unknown, products: unknown[]): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectProductNodes(item, products);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  const typeText = Array.isArray(type) ? type.join(" ") : String(type ?? "");

  if (/Product/i.test(typeText)) {
    products.push(record);
  }

  for (const key of ["@graph", "mainEntity", "itemListElement"]) {
    collectProductNodes(record[key], products);
  }
}

function normalizeJsonLdProduct(product: unknown): {
  availability: string | null;
  currency: string | null;
  priceCents: number | null;
  stockQuantity: number | null;
  title: string | null;
} {
  const record = product && typeof product === "object" && !Array.isArray(product) ? product as Record<string, unknown> : {};
  const offers = normalizeOffer(record.offers);
  const availability = offers.availability;

  return {
    availability,
    currency: offers.currency,
    priceCents: offers.priceCents,
    stockQuantity: availability && /OutOfStock|Discontinued/i.test(availability) ? 0 : null,
    title: firstString(record.name, record.title)
  };
}

function normalizeOffer(value: unknown): { availability: string | null; currency: string | null; priceCents: number | null } {
  const offer = Array.isArray(value) ? value[0] : value;
  const record = offer && typeof offer === "object" && !Array.isArray(offer) ? offer as Record<string, unknown> : {};

  return {
    availability: firstString(record.availability),
    currency: firstString(record.priceCurrency),
    priceCents: parsePriceToCents(firstString(record.price, record.lowPrice, record.highPrice))
  };
}

function readMetaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const propertyMatch = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"));
    const contentFirstMatch = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"));
    const content = propertyMatch?.[1] ?? contentFirstMatch?.[1];

    if (content) {
      return decodeHtmlEntities(content.trim());
    }
  }

  return null;
}

function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeHtmlEntities(match?.[1]?.replace(/\s+/g, " ").trim() ?? "");

  return title || null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function parsePriceToCents(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[^\d,.-]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? Math.round(numberValue * 100) : null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function statusFromStructuredAvailability(availability: string | null, priceCents: number | null): SupplierSourceStatus {
  if (availability && /OutOfStock|SoldOut|Discontinued|esgotado|indisponivel/i.test(availability)) {
    return SupplierSourceStatus.OUT_OF_STOCK;
  }

  if (availability && /InStock|LimitedAvailability|PreOrder|dispon/i.test(availability)) {
    return SupplierSourceStatus.ACTIVE;
  }

  return priceCents ? SupplierSourceStatus.ACTIVE : SupplierSourceStatus.UNKNOWN;
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
