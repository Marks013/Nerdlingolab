import fs from "node:fs";
import path from "node:path";

import {
  getConfiguredRemoteImageHosts,
  isRemoteImageHostAllowed
} from "../config/remote-image-patterns.mjs";

const projectRoot = process.cwd();
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const scannedRoots = ["data", "src"];
const ignoredDirectories = new Set([".git", ".next", "build", "coverage", "dist", "node_modules", "src/generated"]);

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  for (const name of fs.readdirSync(directory)) {
    const fullPath = path.join(directory, name);
    const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, "/");

    if (ignoredDirectories.has(name) || ignoredDirectories.has(relativePath)) {
      continue;
    }

    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function extractUrls(content) {
  return Array.from(content.matchAll(/https?:\/\/[^\s"'<>),]+/g), (match) => match[0]);
}

function isLikelyImageUrl(value) {
  try {
    const url = new URL(value);
    return imageExtensions.has(path.extname(url.pathname).toLowerCase());
  } catch {
    return false;
  }
}

function addViolation(violations, source, value) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    violations.push({
      reason: "remote images must use https",
      source,
      url: value
    });
    return;
  }

  if (!isRemoteImageHostAllowed(url.hostname)) {
    violations.push({
      reason: "host is not in NEXT_IMAGE_REMOTE_HOSTS",
      source,
      url: value
    });
  }
}

const violations = [];
let checkedImages = 0;

for (const root of scannedRoots) {
  for (const filePath of walk(path.join(projectRoot, root))) {
    if (!/\.(csv|json|mjs|ts|tsx)$/.test(filePath)) {
      continue;
    }

    const source = path.relative(projectRoot, filePath).replace(/\\/g, "/");
    const content = fs.readFileSync(filePath, "utf8");

    for (const url of extractUrls(content).filter(isLikelyImageUrl)) {
      checkedImages += 1;
      addViolation(violations, source, url);
    }
  }
}

if (process.env.IMAGE_AUDIT_HAR) {
  const har = JSON.parse(fs.readFileSync(process.env.IMAGE_AUDIT_HAR, "utf8"));

  for (const entry of har.log?.entries ?? []) {
    const requestUrl = entry.request?.url;

    if (!requestUrl?.includes("/_next/image")) {
      continue;
    }

    const optimizedUrl = new URL(requestUrl);
    const sourceUrl = optimizedUrl.searchParams.get("url");

    if (sourceUrl && isLikelyImageUrl(sourceUrl)) {
      checkedImages += 1;
      addViolation(violations, process.env.IMAGE_AUDIT_HAR, sourceUrl);
    }
  }
}

if (violations.length > 0) {
  console.error("Auditoria de imagens falhou.");
  console.error(`Hosts permitidos: ${getConfiguredRemoteImageHosts().join(", ")}`);

  for (const violation of violations.slice(0, 20)) {
    console.error(`- ${violation.reason}: ${violation.url} (${violation.source})`);
  }

  if (violations.length > 20) {
    console.error(`...mais ${violations.length - 20} ocorrencias.`);
  }

  console.error("Adicione hosts confiaveis em NEXT_IMAGE_REMOTE_HOSTS, separados por virgula.");
  process.exit(1);
}

console.log(`Auditoria de imagens concluida: ${checkedImages} URLs verificadas.`);
