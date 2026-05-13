import {
  ProductStatus,
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
  skipped: number;
  imported: number;
  invalid: number;
  missing: number;
  errors: string[];
  matchedByExternal: number;
  matchedBySourceId: number;
  matchedByUrl: number;
  updatedPrice: number;
  updatedStatus: number;
  updatedStock: number;
  updatedTitle: number;
}

interface SupplierSnapshotImportRow {
  externalId: string | null;
  externalShopId: string | null;
  note: string | null;
  priceCents: number | null;
  provider: SupplierProvider | null;
  rawProvider: string;
  rawStatus: string;
  status: SupplierSourceStatus | null;
  stockQuantity: number | null;
  sourceId: string | null;
  title: string | null;
  url: string;
}

interface ParsedSupplierSnapshotImportRow {
  index: number;
  row: SupplierSnapshotImportRow;
}

interface SourceMatch {
  id: string;
  matchedBy: "external" | "sourceId" | "url";
}

const maxImportRows = 1_000;
const maxStoredErrors = 30;
const minimumReliablePriceCents = 1_500;
const maximumReliablePriceCents = 200_000;
const requiredUrlColumns = ["url", "link", "origem", "originalurl", "originalproducturl"];
const sourceIdColumns = ["sourceid", "origemid", "idsource"];

export async function importSupplierSnapshotCsv(text: string): Promise<SupplierSnapshotImportResult> {
  await ensureProductSourcesFromMetafields(1_000);

  const rows = parseCsv(text);

  if (rows.length < 2) {
    return createEmptyResult(["Arquivo sem linhas para importar."]);
  }

  const [header, ...dataRows] = rows;
  const columns = buildColumnMap(header);
  const result = createEmptyResult();

  if (!hasAnyColumn(columns, requiredUrlColumns) && !hasAnyColumn(columns, sourceIdColumns)) {
    return createEmptyResult(["Coluna obrigatoria url/link/origem ou sourceId nao encontrada no cabecalho."]);
  }

  if (dataRows.length > maxImportRows) {
    addImportError(result, `Arquivo tem ${dataRows.length} linhas. Importe no maximo ${maxImportRows} por vez para manter a operacao segura.`);
    result.invalid += dataRows.length - maxImportRows;
  }

  const parsedRows: ParsedSupplierSnapshotImportRow[] = [];

  for (const [index, row] of dataRows.slice(0, maxImportRows).entries()) {
    const importRow = sanitizeImportRow(readImportRow(row, columns));

    if (!importRow.url && !importRow.sourceId) {
      result.skipped += 1;
      continue;
    }

    if (!hasUsefulImportData(importRow)) {
      result.skipped += 1;
      continue;
    }

    if (importRow.rawProvider && !importRow.provider) {
      result.invalid += 1;
      addImportError(result, `Linha ${index + 2}: fornecedor "${importRow.rawProvider}" nao reconhecido.`);
      continue;
    }

    if (importRow.rawStatus && !importRow.status) {
      result.invalid += 1;
      addImportError(result, `Linha ${index + 2}: status "${importRow.rawStatus}" nao reconhecido.`);
      continue;
    }

    parsedRows.push({ index, row: importRow });
  }

  const sourceMatches = await buildSourceMatchIndex(parsedRows.map((item) => item.row));

  for (const { index, row: importRow } of parsedRows) {
    const source = sourceMatches.get(rowMatchKey(importRow));

    if (!source) {
      result.missing += 1;
      addImportError(result, `Linha ${index + 2}: origem nao encontrada para ${(importRow.url || importRow.sourceId || "sem identificador").slice(0, 120)}.`);
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
      result.updatedTitle += 1;
    }

    incrementMatchCounter(result, source.matchedBy);
    if (importRow.priceCents !== null) {
      result.updatedPrice += 1;
    }
    if (importRow.stockQuantity !== null) {
      result.updatedStock += 1;
    }
    if (importRow.status !== null) {
      result.updatedStatus += 1;
    }
    result.imported += 1;
  }

  return result;
}

function hasUsefulImportData(row: SupplierSnapshotImportRow): boolean {
  return row.priceCents !== null || row.stockQuantity !== null || row.status !== null || Boolean(row.title);
}

function sanitizeImportRow(row: SupplierSnapshotImportRow): SupplierSnapshotImportRow {
  if (
    row.priceCents !== null
    && row.priceCents > 0
    && (row.priceCents < minimumReliablePriceCents || row.priceCents > maximumReliablePriceCents)
  ) {
    return {
      ...row,
      note: appendNote(row.note, `Preco de origem fora da faixa segura (${formatCents(row.priceCents)}). Revise manualmente.`),
      priceCents: null,
      status: SupplierSourceStatus.CONFIG_REQUIRED
    };
  }

  return row;
}

async function buildSourceMatchIndex(rows: SupplierSnapshotImportRow[]): Promise<Map<string, SourceMatch>> {
  const sourceIds = unique(rows.map((row) => row.sourceId).filter(isNonEmptyString));
  const urls = unique(rows.flatMap((row) => [row.url, normalizeUrl(row.url)]).filter(isNonEmptyString));
  const externalIds = unique(rows.map((row) => resolveExternalFields(row).externalId).filter(isNonEmptyString));
  const matches = new Map<string, SourceMatch>();

  const [byIds, byUrls, byExternalIds] = await Promise.all([
    sourceIds.length
      ? prisma.productSource.findMany({
          select: { id: true },
          where: {
            id: { in: sourceIds },
            product: { status: { not: ProductStatus.ARCHIVED } }
          }
        })
      : [],
    urls.length
      ? prisma.productSource.findMany({
          select: { id: true, originalUrl: true },
          where: {
            originalUrl: { in: urls },
            product: { status: { not: ProductStatus.ARCHIVED } }
          }
        })
      : [],
    externalIds.length
      ? prisma.productSource.findMany({
          select: { externalId: true, externalShopId: true, id: true, provider: true },
          where: {
            externalId: { in: externalIds },
            product: { status: { not: ProductStatus.ARCHIVED } }
          }
        })
      : []
  ]);
  const byIdMap = new Map(byIds.map((source) => [source.id, source.id]));
  const byUrlMap = new Map(byUrls.flatMap((source) => [[source.originalUrl, source.id], [normalizeUrl(source.originalUrl), source.id]]));
  const byExternalMap = new Map(
    byExternalIds.map((source) => [
      externalMatchKey({
        externalId: source.externalId,
        externalShopId: source.externalShopId,
        provider: source.provider
      }),
      source.id
    ])
  );

  for (const row of rows) {
    const key = rowMatchKey(row);

    if (row.sourceId && byIdMap.has(row.sourceId)) {
      matches.set(key, { id: byIdMap.get(row.sourceId)!, matchedBy: "sourceId" });
      continue;
    }

    const urlMatch = byUrlMap.get(row.url) ?? byUrlMap.get(normalizeUrl(row.url));

    if (urlMatch) {
      matches.set(key, { id: urlMatch, matchedBy: "url" });
      continue;
    }

    const external = resolveExternalFields(row);
    const externalMatch = byExternalMap.get(externalMatchKey(external));

    if (externalMatch) {
      matches.set(key, { id: externalMatch, matchedBy: "external" });
    }
  }

  return matches;
}

function resolveExternalFields(row: SupplierSnapshotImportRow): {
  externalId: string | null;
  externalShopId: string | null;
  provider: SupplierProvider | null;
} {
  const parsed = row.url ? detectSupplierFromUrl(normalizeUrl(row.url)) : null;

  return {
    externalId: row.externalId ?? parsed?.externalId ?? null,
    externalShopId: row.externalShopId ?? parsed?.externalShopId ?? null,
    provider: row.provider ?? parsed?.provider ?? null
  };
}

function readImportRow(row: string[], columns: Map<string, number>): SupplierSnapshotImportRow {
  const url = firstColumn(row, columns, requiredUrlColumns);
  const rawProvider = firstColumn(row, columns, ["provider", "fornecedor"]);
  const rawStatus = firstColumn(row, columns, ["status", "situacao"]);

  return {
    externalId: firstColumn(row, columns, ["externalid", "idexterno", "itemid", "mlb", "supplierid"]) || null,
    externalShopId: firstColumn(row, columns, ["externalshopid", "shopid", "lojaexterna"]) || null,
    note: truncateText(firstColumn(row, columns, ["note", "observacao", "observacaointerna", "erro", "mensagem"]), 500) || null,
    priceCents: parseCurrencyToCents(firstColumn(row, columns, ["price", "preco", "precoimportacao", "precofornecedor", "supplierprice", "lastprice"])),
    provider: parseProvider(rawProvider),
    rawProvider,
    rawStatus,
    status: parseStatus(rawStatus),
    stockQuantity: parseOptionalInteger(firstColumn(row, columns, ["stock", "estoque", "estoqueimportacao", "stockquantity", "quantidade"])),
    sourceId: firstColumn(row, columns, sourceIdColumns) || null,
    title: truncateText(firstColumn(row, columns, ["title", "titulo", "tituloimportacao", "produto", "nome"]), 180) || null,
    url: normalizeUrl(url)
  };
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function appendNote(note: string | null, suffix: string): string {
  const text = note?.trim();

  return text ? `${text} ${suffix}` : suffix;
}

function formatCents(value: number): string {
  return `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;
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

  if (normalized.includes("manual")) {
    return SupplierProvider.MANUAL;
  }

  if (normalized.includes("custom") || normalized.includes("personalizado") || normalized.includes("outro")) {
    return SupplierProvider.CUSTOM;
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
    configrequired: SupplierSourceStatus.CONFIG_REQUIRED,
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

function hasAnyColumn(columns: Map<string, number>, names: string[]): boolean {
  return names.some((name) => columns.has(normalizeHeader(name)));
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

  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue * 100) : null;
}

function parseOptionalInteger(value: string): number | null {
  const rawValue = value.trim();

  if (!rawValue) {
    return null;
  }

  const numberValue = Number(rawValue.replace(/[^\d-]/g, ""));

  return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null;
}

function incrementMatchCounter(result: SupplierSnapshotImportResult, matchedBy: SourceMatch["matchedBy"]): void {
  if (matchedBy === "sourceId") {
    result.matchedBySourceId += 1;
    return;
  }

  if (matchedBy === "url") {
    result.matchedByUrl += 1;
    return;
  }

  result.matchedByExternal += 1;
}

function rowMatchKey(row: SupplierSnapshotImportRow): string {
  const external = resolveExternalFields(row);

  return [row.sourceId ?? "", normalizeUrl(row.url), external.provider ?? "", external.externalId ?? "", external.externalShopId ?? ""].join("|");
}

function externalMatchKey(input: {
  externalId: string | null;
  externalShopId: string | null;
  provider: SupplierProvider | null;
}): string {
  return [input.provider ?? "", input.externalId ?? "", input.externalShopId ?? ""].join("|");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return Boolean(value);
}

function parseCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);
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
    } else if (char === delimiter) {
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

function detectDelimiter(text: string): "," | ";" | "\t" {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates: Array<"," | ";" | "\t"> = [",", ";", "\t"];
  let best: "," | ";" | "\t" = ",";
  let bestCount = -1;
  let isQuoted = false;

  const counts = new Map(candidates.map((candidate) => [candidate, 0]));

  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index];
    const nextChar = firstLine[index + 1];

    if (char === "\"" && nextChar === "\"") {
      index += 1;
      continue;
    }

    if (char === "\"") {
      isQuoted = !isQuoted;
      continue;
    }

    if (!isQuoted && counts.has(char as "," | ";" | "\t")) {
      counts.set(char as "," | ";" | "\t", (counts.get(char as "," | ";" | "\t") ?? 0) + 1);
    }
  }

  for (const candidate of candidates) {
    const count = counts.get(candidate) ?? 0;

    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function createEmptyResult(errors: string[] = []): SupplierSnapshotImportResult {
  return {
    errors,
    imported: 0,
    invalid: errors.length,
    matchedByExternal: 0,
    matchedBySourceId: 0,
    matchedByUrl: 0,
    missing: 0,
    skipped: 0,
    updatedPrice: 0,
    updatedStatus: 0,
    updatedStock: 0,
    updatedTitle: 0
  };
}

function addImportError(result: SupplierSnapshotImportResult, error: string): void {
  if (result.errors.length < maxStoredErrors) {
    result.errors.push(error);
  }
}
