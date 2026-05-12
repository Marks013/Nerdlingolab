import {
  SupplierProvider,
  SupplierSourceStatus
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { detectSupplierFromUrl } from "./providers";
import {
  ensureProductSourcesFromMetafields,
  updateManualProductSourceSnapshot
} from "./sync";

export interface SupplierSnapshotImportResult {
  imported: number;
  missing: number;
  skipped: number;
  errors: string[];
}

interface SupplierSnapshotImportRow {
  note: string | null;
  priceCents: number | null;
  provider: SupplierProvider | null;
  status: SupplierSourceStatus | null;
  stockQuantity: number | null;
  title: string | null;
  url: string;
}

export async function importSupplierSnapshotCsv(text: string): Promise<SupplierSnapshotImportResult> {
  await ensureProductSourcesFromMetafields(1_000);

  const rows = parseCsv(text);

  if (rows.length < 2) {
    return { errors: ["Arquivo sem linhas para importar."], imported: 0, missing: 0, skipped: 0 };
  }

  const [header, ...dataRows] = rows;
  const columns = buildColumnMap(header);
  const result: SupplierSnapshotImportResult = { errors: [], imported: 0, missing: 0, skipped: 0 };

  for (const [index, row] of dataRows.entries()) {
    const importRow = readImportRow(row, columns);

    if (!importRow.url) {
      result.skipped += 1;
      continue;
    }

    if (!hasUsefulImportData(importRow)) {
      result.skipped += 1;
      continue;
    }

    const source = await findProductSource(importRow);

    if (!source) {
      result.missing += 1;
      result.errors.push(`Linha ${index + 2}: origem nao encontrada para ${importRow.url.slice(0, 120)}.`);
      continue;
    }

    const status = importRow.status ?? inferStatus(importRow);

    await updateManualProductSourceSnapshot({
      sourceId: source.id,
      status,
      priceCents: importRow.priceCents,
      stockQuantity: importRow.stockQuantity,
      note: importRow.note ?? "Importacao assistida por CSV"
    });

    if (importRow.title) {
      await prisma.productSource.update({
        data: { title: importRow.title },
        where: { id: source.id }
      });
    }

    result.imported += 1;
  }

  return result;
}

function hasUsefulImportData(row: SupplierSnapshotImportRow): boolean {
  return row.priceCents !== null || row.stockQuantity !== null || row.status !== null || Boolean(row.title);
}

async function findProductSource(row: SupplierSnapshotImportRow): Promise<{ id: string } | null> {
  const normalizedUrl = normalizeUrl(row.url);
  const parsed = detectSupplierFromUrl(normalizedUrl);
  const provider = row.provider ?? parsed?.provider;
  const externalId = parsed?.externalId;
  const externalShopId = parsed?.externalShopId;

  const exact = await prisma.productSource.findFirst({
    select: { id: true },
    where: {
      OR: [
        { originalUrl: normalizedUrl },
        { originalUrl: row.url }
      ]
    }
  });

  if (exact) {
    return exact;
  }

  if (!provider || !externalId) {
    return null;
  }

  return prisma.productSource.findFirst({
    select: { id: true },
    where: {
      externalId,
      externalShopId: externalShopId ?? undefined,
      provider
    }
  });
}

function readImportRow(row: string[], columns: Map<string, number>): SupplierSnapshotImportRow {
  const url = firstColumn(row, columns, ["url", "link", "origem", "originalurl", "originalproducturl"]);
  const rawProvider = firstColumn(row, columns, ["provider", "fornecedor"]);
  const rawStatus = firstColumn(row, columns, ["status", "situacao"]);

  return {
    note: firstColumn(row, columns, ["note", "observacao", "erro", "mensagem"]) || null,
    priceCents: parseCurrencyToCents(firstColumn(row, columns, ["price", "preco", "precofornecedor", "supplierprice", "lastprice"])),
    provider: parseProvider(rawProvider),
    status: parseStatus(rawStatus),
    stockQuantity: parseOptionalInteger(firstColumn(row, columns, ["stock", "estoque", "stockquantity", "quantidade"])),
    title: firstColumn(row, columns, ["title", "titulo", "produto", "nome"]) || null,
    url: normalizeUrl(url)
  };
}

function inferStatus(row: SupplierSnapshotImportRow): SupplierSourceStatus {
  if (row.stockQuantity === 0) {
    return SupplierSourceStatus.OUT_OF_STOCK;
  }

  if (row.priceCents !== null || row.stockQuantity !== null) {
    return SupplierSourceStatus.ACTIVE;
  }

  return SupplierSourceStatus.CONFIG_REQUIRED;
}

function parseProvider(value: string): SupplierProvider | null {
  const normalized = normalizeHeader(value);

  if (normalized.includes("mercadolivre") || normalized.includes("mercadolibre")) {
    return SupplierProvider.MERCADO_LIVRE;
  }

  if (normalized.includes("shopee")) {
    return SupplierProvider.SHOPEE;
  }

  return null;
}

function parseStatus(value: string): SupplierSourceStatus | null {
  const normalized = normalizeHeader(value);

  if (!normalized) {
    return null;
  }

  const byValue: Record<string, SupplierSourceStatus> = {
    active: SupplierSourceStatus.ACTIVE,
    ativo: SupplierSourceStatus.ACTIVE,
    closed: SupplierSourceStatus.CLOSED,
    encerrado: SupplierSourceStatus.CLOSED,
    deleted: SupplierSourceStatus.DELETED,
    error: SupplierSourceStatus.ERROR,
    erro: SupplierSourceStatus.ERROR,
    manual: SupplierSourceStatus.CONFIG_REQUIRED,
    paused: SupplierSourceStatus.PAUSED,
    pausado: SupplierSourceStatus.PAUSED,
    outofstock: SupplierSourceStatus.OUT_OF_STOCK,
    semestoque: SupplierSourceStatus.OUT_OF_STOCK,
    unavailable: SupplierSourceStatus.OUT_OF_STOCK,
    indisponivel: SupplierSourceStatus.OUT_OF_STOCK,
    unknown: SupplierSourceStatus.UNKNOWN
  };

  return byValue[normalized] ?? null;
}

function buildColumnMap(header: string[]): Map<string, number> {
  return new Map(header.map((name, index) => [normalizeHeader(name), index]));
}

function firstColumn(row: string[], columns: Map<string, number>, names: string[]): string {
  for (const name of names) {
    const index = columns.get(normalizeHeader(name));

    if (typeof index === "number") {
      return row[index]?.trim() ?? "";
    }
  }

  return "";
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeUrl(value: string): string {
  const rawValue = value.trim();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue.startsWith("//") ? `https:${rawValue}` : rawValue);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : rawValue;
  } catch {
    return rawValue;
  }
}

function parseCurrencyToCents(value: string): number | null {
  const rawValue = value.trim();

  if (!rawValue) {
    return null;
  }

  const cleaned = rawValue.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? Math.round(numberValue * 100) : null;
}

function parseOptionalInteger(value: string): number | null {
  const rawValue = value.trim();

  if (!rawValue) {
    return null;
  }

  const numberValue = Number(rawValue.replace(/[^\d-]/g, ""));

  return Number.isInteger(numberValue) ? numberValue : null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (isQuoted) {
      if (char === "\"" && nextChar === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        isQuoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      isQuoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((value) => value.trim()));
}
