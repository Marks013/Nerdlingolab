import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.ARTIFACT_CLEANUP_DRY_RUN === "true";
const keepLimit = readPositiveInt(readArgValue("keep") ?? process.env.ARTIFACT_KEEP_LIMIT, 5);

const removableDirs = [
  ".next/cache",
  ".turbo",
  ".cache",
  ".tmp",
  "tmp",
  "temp",
  "coverage",
  "test-results",
  "playwright-report",
  "blob-report"
];

const rotatedDirs = [
  ".deploy",
  "deploy-artifacts",
  "artifacts",
  "backup",
  "backups",
  "logs",
  "ops/releases"
];

const summary = {
  missing: 0,
  removed: 0,
  retained: 0,
  scanned: 0,
  skipped: 0,
  wouldRemove: 0
};

function readArgValue(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function safeResolve(relativePath) {
  const target = path.resolve(root, relativePath);

  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe cleanup target: ${target}`);
  }

  return target;
}

function statOrNull(target) {
  try {
    return fs.statSync(target);
  } catch {
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function getTargetSize(target) {
  const stat = statOrNull(target);

  if (!stat) {
    return 0;
  }

  if (!stat.isDirectory()) {
    return stat.size;
  }

  let total = 0;
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      summary.skipped += 1;
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      const entryStat = statOrNull(entryPath);

      if (!entryStat) {
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else {
        total += entryStat.size;
      }
    }
  }

  return total;
}

function removeTarget(target) {
  const relative = path.relative(root, target);
  const size = getTargetSize(target);

  if (dryRun) {
    summary.wouldRemove += 1;
    console.log(`would remove ${relative} (${formatBytes(size)})`);
    return;
  }

  fs.rmSync(target, { recursive: true, force: true });
  summary.removed += 1;
  console.log(`removed ${relative} (${formatBytes(size)})`);
}

function cleanupRemovableDirs() {
  for (const relativePath of removableDirs) {
    summary.scanned += 1;
    const target = safeResolve(relativePath);

    if (!statOrNull(target)) {
      summary.missing += 1;
      continue;
    }

    removeTarget(target);
  }
}

function cleanupRotatedDirs() {
  for (const relativePath of rotatedDirs) {
    summary.scanned += 1;
    const target = safeResolve(relativePath);
    const stat = statOrNull(target);

    if (!stat?.isDirectory()) {
      summary.missing += 1;
      continue;
    }

    const entries = fs
      .readdirSync(target)
      .filter((name) => name !== ".gitkeep")
      .map((name) => {
        const entryPath = path.join(target, name);
        const entryStat = statOrNull(entryPath);
        return entryStat ? { name, path: entryPath, mtimeMs: entryStat.mtimeMs } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const retained = entries.slice(0, keepLimit);
    summary.retained += retained.length;

    for (const entry of entries.slice(keepLimit)) {
      removeTarget(entry.path);
    }
  }
}

try {
  console.log(`artifact cleanup root: ${root}`);
  console.log(`mode: ${dryRun ? "dry-run" : "apply"} | keep rotated entries: ${keepLimit}`);
  cleanupRemovableDirs();
  cleanupRotatedDirs();
  console.log(
    `summary: scanned=${summary.scanned} missing=${summary.missing} retained=${summary.retained} removed=${summary.removed} wouldRemove=${summary.wouldRemove} skipped=${summary.skipped}`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
