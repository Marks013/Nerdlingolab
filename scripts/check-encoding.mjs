import { TextDecoder } from "node:util";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const textFilePattern = /\.(ts|tsx|mjs|json|css|md|prisma|ya?ml|editorconfig|gitattributes)$/;
const ignoredDirectories = new Set([".git", ".next", "node_modules"]);
const decoder = new TextDecoder("utf-8", { fatal: true });
const suspiciousMojibakePatterns = [
  new RegExp("\\u00c3."),
  new RegExp("\\u00c2."),
  new RegExp("\\u00e2\\u20ac."),
  new RegExp("\\ufffd")
];
const failures = [];

for (const filePath of walk(projectRoot)) {
  if (!textFilePattern.test(filePath)) {
    continue;
  }

  const buffer = readFileSync(filePath);
  const relativePath = relative(projectRoot, filePath).replaceAll("\\", "/");

  try {
    const content = decoder.decode(buffer);

    if (content.charCodeAt(0) === 0xfeff) {
      failures.push(`${relativePath}: remova o BOM; use UTF-8 sem BOM.`);
    }

    if (suspiciousMojibakePatterns.some((pattern) => pattern.test(content))) {
      failures.push(`${relativePath}: possível texto quebrado ou mojibake.`);
    }

    if (content !== content.normalize("NFC")) {
      failures.push(`${relativePath}: normalize o texto Unicode para NFC.`);
    }
  } catch {
    failures.push(`${relativePath}: arquivo não está em UTF-8 válido.`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        yield* walk(join(directory, entry.name));
      }
      continue;
    }

    yield join(directory, entry.name);
  }
}
