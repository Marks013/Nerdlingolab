import fs from "node:fs";
import path from "node:path";

import { importSupplierSnapshotCsv } from "@/lib/dropshipping/import";

const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(args.input ?? "");

if (!inputPath || !fs.existsSync(inputPath)) {
  throw new Error(`Arquivo de entrada nao encontrado: ${inputPath || "(vazio)"}`);
}

const result = await importSupplierSnapshotCsv(fs.readFileSync(inputPath, "utf8"));

console.log(JSON.stringify({
  input: inputPath,
  ...result
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
