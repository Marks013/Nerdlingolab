import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDirectory = process.cwd();
const requiredFiles = [
  ".env.example",
  "docker-compose.yml",
  "prisma/schema.prisma",
  "prisma.config.ts",
  "src/proxy.ts",
  "src/app/api/health/route.ts",
  "src/app/api/health/ready/route.ts",
  "playwright.config.ts",
  "tests/e2e/public-flow.spec.ts"
];

const requiredPackageScripts = [
  "validate:encoding",
  "validate:ui-copy",
  "validate:project",
  "prisma:generate",
  "db:migrate",
  "db:seed",
  "test:e2e",
  "check:operational"
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function assertRequiredFiles() {
  const missingFiles = requiredFiles.filter((filePath) => !existsSync(resolve(rootDirectory, filePath)));

  if (missingFiles.length > 0) {
    throw new Error(`Arquivos ausentes: ${missingFiles.join(", ")}`);
  }
}

function assertPackageScripts() {
  const packageJson = readJson(resolve(rootDirectory, "package.json"));
  const scripts = packageJson.scripts ?? {};
  const missingScripts = requiredPackageScripts.filter((scriptName) => !scripts[scriptName]);

  if (missingScripts.length > 0) {
    throw new Error(`Scripts ausentes: ${missingScripts.join(", ")}`);
  }
}

function assertPrismaClientGeneration() {
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", "npm exec prisma generate"], {
      cwd: rootDirectory,
      stdio: "pipe"
    });
    return;
  }

  execFileSync("npm", ["exec", "prisma", "generate"], {
    cwd: rootDirectory,
    stdio: "pipe"
  });
}

try {
  assertRequiredFiles();
  assertPackageScripts();
  assertPrismaClientGeneration();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
