import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const actionsRoot = join(projectRoot, "src", "actions");
const failures = [];

for (const filePath of walk(actionsRoot)) {
  if (!filePath.endsWith(".ts")) {
    continue;
  }

  const source = readFileSync(filePath, "utf8");
  const relativePath = relative(projectRoot, filePath);
  const writesPrisma = /prisma\.[a-zA-Z]+\.(create|update|upsert|delete|deleteMany|updateMany)|prisma\.\$transaction/.test(source);

  if (!writesPrisma) {
    continue;
  }

  const hasAccessCheck = source.includes("requireAdmin(") || source.includes("auth()");
  const isAuthAction = relativePath.endsWith(join("src", "actions", "auth.ts"));
  const hasStructuredValidation = /safeParse|\.parse\(|normalizeSlides|readLimitedText/.test(source);

  if (!hasAccessCheck && !isAuthAction) {
    failures.push(`${relativePath}: escrita Prisma sem verificacao de acesso`);
  }

  if (!hasStructuredValidation) {
    failures.push(`${relativePath}: escrita Prisma sem validacao estruturada`);
  }

  if (/throw new Error\(\s*error instanceof Error \? error\.message/.test(source)) {
    failures.push(`${relativePath}: action pode expor mensagem interna`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Auditoria de server actions falhou:\n${failures.join("\n")}\n`);
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
