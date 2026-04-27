import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const routeRoot = join(projectRoot, "src", "app", "api");
const failures = [];
const mutatingMethodPattern = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;
const bodyReadPattern = /request\.(json|formData)\(\)/;
const validationPattern = /safeParse|\.parse\(/;

for (const filePath of walk(routeRoot)) {
  if (!filePath.endsWith("route.ts")) {
    continue;
  }

  const source = readFileSync(filePath, "utf8");
  const relativePath = relative(projectRoot, filePath);
  const isWebhookRoute = relativePath.includes("webhooks");

  if (mutatingMethodPattern.test(source)) {
    if (!source.includes("rateLimitRequest(") && !isWebhookRoute) {
      failures.push(`${relativePath}: POST/PATCH/PUT/DELETE sem rateLimitRequest`);
    }

    if (!source.includes("assertSameOriginRequest(") && !isWebhookRoute) {
      failures.push(`${relativePath}: POST/PATCH/PUT/DELETE sem assertSameOriginRequest`);
    }

    if (!source.includes("Sentry.captureException")) {
      failures.push(`${relativePath}: mutacao sem captura Sentry`);
    }
  }

  if (bodyReadPattern.test(source) && !validationPattern.test(source)) {
    failures.push(`${relativePath}: corpo da requisicao sem validacao estruturada`);
  }

  if (/error instanceof Error \? error\.message/.test(source)) {
    failures.push(`${relativePath}: resposta expoe mensagem interna de erro`);
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
