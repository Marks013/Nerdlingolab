import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run") || process.env.OPTIONAL_WASM_CLEAN_DRY_RUN === "true";

const optionalWasmTargets = [
  ".next/server/**/*.wasm",
  ".next/standalone/**/*.wasm"
];

const blockedSegments = new Set(["node_modules", "prisma", "public"]);
const summary = { removed: 0, scanned: 0, wouldRemove: 0 };

function safeResolve(relativePath) {
  const target = path.resolve(root, relativePath);

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe WASM cleanup target: ${target}`);
  }

  return target;
}

function walkForWasm(startDir) {
  const target = safeResolve(startDir);

  if (!fs.existsSync(target)) {
    return [];
  }

  const found = [];
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    const relativeParts = path.relative(root, current).split(path.sep);
    if (relativeParts.some((part) => blockedSegments.has(part))) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".wasm")) {
        found.push(entryPath);
      }
    }
  }

  return found;
}

function removeFile(target) {
  const relative = path.relative(root, target);
  summary.scanned += 1;

  if (dryRun) {
    summary.wouldRemove += 1;
    console.log(`would remove optional wasm ${relative}`);
    return;
  }

  fs.rmSync(target, { force: true });
  summary.removed += 1;
  console.log(`removed optional wasm ${relative}`);
}

try {
  console.log(`optional wasm cleanup root: ${root}`);
  console.log(`mode: ${dryRun ? "dry-run" : "apply"}`);

  for (const pattern of optionalWasmTargets) {
    const startDir = pattern.split("**")[0].replace(/[\\/]+$/, "");
    for (const target of walkForWasm(startDir)) {
      removeFile(target);
    }
  }

  console.log(`summary: scanned=${summary.scanned} removed=${summary.removed} wouldRemove=${summary.wouldRemove}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
