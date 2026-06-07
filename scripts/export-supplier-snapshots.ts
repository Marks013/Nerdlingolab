import fs from "node:fs";
import path from "node:path";

import { SupplierProvider, SupplierSourceStatus } from "@/generated/prisma/client";
import { buildSupplierSnapshotCsv } from "@/lib/dropshipping/csv-export";
import type { DropshippingDashboardFilters } from "@/lib/dropshipping/queries";

const args = parseArgs(process.argv.slice(2));
const outputPath = path.resolve(args.output ?? `data/dropshipping/fornecedores-importacao-assistida-${new Date().toISOString().slice(0, 10)}.csv`);
const filters = buildFilters(args);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const csv = await buildSupplierSnapshotCsv(filters);

fs.writeFileSync(outputPath, `\uFEFF${csv}`, "utf8");
console.log(JSON.stringify({
  filters,
  output: outputPath
}, null, 2));

function parseArgs(rawArgs: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index];

    if (value.startsWith("--")) {
      parsed[value.slice(2)] = rawArgs[index + 1] ?? "";
      index += 1;
    }
  }

  return parsed;
}

function buildFilters(values: Record<string, string>): DropshippingDashboardFilters {
  return {
    provider: parseEnum(values.fornecedor || values.provider, SupplierProvider),
    query: values.busca || values.query || undefined,
    scope: parseScope(values.scope),
    status: parseEnum(values.status, SupplierSourceStatus)
  };
}

function parseScope(value: string | undefined): DropshippingDashboardFilters["scope"] {
  return value === "active" || value === "all" || value === "review" ? value : undefined;
}

function parseEnum<T extends Record<string, string>>(value: string | undefined, enumObject: T): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(enumObject).includes(value) ? value as T[keyof T] : undefined;
}
