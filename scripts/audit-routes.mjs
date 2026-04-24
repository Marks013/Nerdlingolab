import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const routeRoot = join(projectRoot, "src", "app", "api");
const failures = [];
const mutatingMethodPattern = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;

for (const filePath of walk(routeRoot)) {
  if (!filePath.endsWith("route.ts")) {
    continue;
  }

  const source = readFileSync(filePath, "utf8");
  const relativePath = relative(projectRoot, filePath);

  if (mutatingMethodPattern.test(source)) {
    if (!source.includes("rateLimitRequest(") && !relativePath.includes("webhooks")) {
      failures.push(`${relativePath}: POST/PATCH/PUT/DELETE sem rateLimitRequest`);
    }

    if (!source.includes("Sentry.captureException")) {
      failures.push(`${relativePath}: mutação sem captura Sentry`);
    }
  }

  if (/error instanceof Error \? error\.message/.test(source)) {
    failures.push(`${relativePath}: resposta expõe mensagem interna de erro`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Auditoria de rotas falhou:\n${failures.join("\n")}\n`);
  process.exit(1);
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walk(filePath);
      continue;
    }

    yield filePath;
  }
}
