import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const uiRoots = ["src/app", "src/components", "src/features"];
const forbiddenPatterns = [
  /\bdev\b/i,
  /\bbackend\b/i,
  /\bback-end\b/i,
  /\bback end\b/i,
  /\bfrontend\b/i,
  /\bfront-end\b/i,
  /\bfront end\b/i,
  /desenvolvimento/i,
  /fundação/i,
  /base pronta/i,
  /base operacional/i,
  /substituir a shopify/i,
  /revalidado[as]? no servidor/i,
  /snapshot/i,
  /configure o mercado pago/i,
  /utf-?8/i,
  /encoding/i,
  /\bNao\b|\bnao\b/,
  /\besta\b/,
  /\bpreco\b|\bprecos\b/i,
  /\bcatalogo\b/i,
  /\bdescricao\b/i,
  /\bpublicacao\b/i,
  /\bindisponivel\b/i
];
const failures = [];

for (const root of uiRoots) {
  for (const filePath of walk(join(projectRoot, root))) {
    if (!/\.tsx$/.test(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (forbiddenPatterns.some((pattern) => pattern.test(line))) {
        failures.push(`${relative(projectRoot, filePath).replaceAll("\\", "/")}:${index + 1}`);
      }
    });
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `Textos de interface com orientação técnica ou acentuação incorreta:\n${failures.join("\n")}\n`
  );
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
