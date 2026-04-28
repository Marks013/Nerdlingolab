import { randomUUID } from "node:crypto";
import path from "node:path";

import { createMediaAsset } from "@/lib/media/assets";
import { convertImageToWebp } from "@/lib/media/webp";
import { ensureProductImageBucket, getProductImagePublicUrl, minioClient, productImageBucketName } from "@/lib/storage";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBytes = 12 * 1024 * 1024;

export async function internalizeExternalMediaUrl(url: string, source = "EXTERNAL_IMPORT"): Promise<string> {
  const normalizedUrl = normalizeExternalMediaUrl(url);

  if (!normalizedUrl) {
    return url;
  }

  const existingAsset = await findExistingImportedAsset(normalizedUrl);

  if (existingAsset) {
    return existingAsset.url;
  }

  const response = await fetch(normalizedUrl, {
    headers: { "User-Agent": "NerdLingoLab media importer" },
    signal: AbortSignal.timeout(30_000)
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem externa: HTTP ${response.status}`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";

  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error(`Tipo de imagem externa nao permitido: ${mimeType || "desconhecido"}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length > maxBytes) {
    throw new Error("Imagem externa acima do limite de 12 MB.");
  }

  await ensureProductImageBucket();

  const webpImage = await convertImageToWebp(bytes, getFileName(normalizedUrl, "imported.webp"));
  const objectKey = `imported/${new Date().toISOString().slice(0, 10).replace(/-/g, "/")}/${randomUUID()}.webp`;
  const internalUrl = getProductImagePublicUrl(objectKey);

  await minioClient.putObject(productImageBucketName, objectKey, webpImage.bytes, webpImage.bytes.length, {
    "Content-Type": webpImage.mimeType
  });
  await createMediaAsset({
    bucket: productImageBucketName,
    fileName: webpImage.fileName,
    height: webpImage.height,
    mimeType: webpImage.mimeType,
    objectKey,
    originalUrl: normalizedUrl,
    sizeBytes: webpImage.bytes.length,
    source,
    url: internalUrl,
    width: webpImage.width
  });

  return internalUrl;
}

export async function internalizeExternalMediaUrls(urls: string[], source = "EXTERNAL_IMPORT"): Promise<string[]> {
  const cache = new Map<string, string>();
  const nextUrls: string[] = [];

  for (const url of urls) {
    const normalizedUrl = normalizeExternalMediaUrl(url);

    if (!normalizedUrl) {
      nextUrls.push(url);
      continue;
    }

    const cachedUrl = cache.get(normalizedUrl);

    if (cachedUrl) {
      nextUrls.push(cachedUrl);
      continue;
    }

    const internalUrl = await internalizeExternalMediaUrl(normalizedUrl, source);
    cache.set(normalizedUrl, internalUrl);
    nextUrls.push(internalUrl);
  }

  return Array.from(new Set(nextUrls));
}

function normalizeExternalMediaUrl(value: string): string | null {
  const rawValue = value.trim();

  if (!rawValue || rawValue.startsWith("/") || rawValue.startsWith("/api/media/")) {
    return null;
  }

  try {
    const url = new URL(rawValue.startsWith("//") ? `https:${rawValue}` : rawValue);

    if (!["http:", "https:"].includes(url.protocol) || url.pathname.startsWith("/api/media/")) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function findExistingImportedAsset(originalUrl: string): Promise<{ url: string } | null> {
  const { prisma } = await import("@/lib/prisma");

  return prisma.mediaAsset.findFirst({
    select: { url: true },
    where: { deletedAt: null, originalUrl }
  });
}

function getFileName(url: string, objectKey: string): string {
  const fileName = path.basename(new URL(url).pathname);
  return fileName || path.basename(objectKey);
}
