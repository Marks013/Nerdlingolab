import { randomUUID } from "node:crypto";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "minio";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { convertImageToWebp } from "../src/lib/media/webp";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBytes = 12 * 1024 * 1024;
const productImageBucketName = process.env.MINIO_BUCKET ?? "product-images";
const minioEndpoint = process.env.MINIO_ENDPOINT ?? "localhost";
const minioPort = Number.parseInt(process.env.MINIO_PORT ?? "9000", 10);
const minioClient = new Client({
  accessKey: process.env.S3_ACCESS_KEY_ID ?? "",
  endPoint: minioEndpoint,
  port: Number.isFinite(minioPort) ? minioPort : 9000,
  secretKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  useSSL: process.env.MINIO_USE_SSL === "true"
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab"
  })
});

async function main(): Promise<void> {
  await ensureProductImageBucket();

  const importedUrlMap = new Map<string, string>();

  const products = await prisma.product.findMany({
    include: { variants: true }
  });

  for (const product of products) {
    const nextImages = await importUrlList(readImageUrls(product.images), importedUrlMap);

    await prisma.product.update({
      where: { id: product.id },
      data: { images: nextImages }
    });
    await syncMediaUsages({
      fieldName: "images",
      ownerId: product.id,
      ownerType: "PRODUCT",
      productId: product.id,
      urls: nextImages
    });

    for (const variant of product.variants) {
      const optionValues = normalizeRecord(variant.optionValues);
      const imageUrl = typeof optionValues._imageUrl === "string" ? optionValues._imageUrl : null;

      if (!imageUrl || !shouldImportUrl(imageUrl)) {
        continue;
      }

      optionValues._imageUrl = await importExternalUrl(imageUrl, importedUrlMap);
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { optionValues: optionValues as Prisma.InputJsonValue }
      });
    }
  }

  const theme = await prisma.storefrontTheme.findUnique({ where: { singletonKey: "default" } });

  if (theme) {
    const heroSlides = await importSlides(theme.heroSlides, importedUrlMap);
    const promoSlides = await importSlides(theme.promoSlides, importedUrlMap);

    await prisma.storefrontTheme.update({
      where: { id: theme.id },
      data: {
        heroSlides: heroSlides as Prisma.InputJsonValue,
        promoSlides: promoSlides as Prisma.InputJsonValue
      }
    });
    await syncMediaUsages({
      fieldName: "heroSlides",
      ownerId: "default",
      ownerType: "STOREFRONT_THEME",
      urls: extractSlideUrls(heroSlides)
    });
    await syncMediaUsages({
      fieldName: "promoSlides",
      ownerId: "default",
      ownerType: "STOREFRONT_THEME",
      urls: extractSlideUrls(promoSlides)
    });
  }

  const popups = await prisma.marketingPopup.findMany({
    where: { imageUrl: { not: null } }
  });

  for (const popup of popups) {
    if (!popup.imageUrl || !shouldImportUrl(popup.imageUrl)) {
      continue;
    }

    const imageUrl = await importExternalUrl(popup.imageUrl, importedUrlMap);
    await prisma.marketingPopup.update({
      where: { id: popup.id },
      data: { imageUrl }
    });
    await syncMediaUsages({
      fieldName: "imageUrl",
      ownerId: popup.id,
      ownerType: "MARKETING_POPUP",
      urls: [imageUrl]
    });
  }

  console.log(`Importação concluída. ${importedUrlMap.size} URL(s) externa(s) internalizada(s).`);
}

async function importUrlList(urls: string[], importedUrlMap: Map<string, string>): Promise<string[]> {
  const nextUrls: string[] = [];

  for (const url of urls) {
    nextUrls.push(shouldImportUrl(url) ? await importExternalUrl(url, importedUrlMap) : url);
  }

  return Array.from(new Set(nextUrls));
}

async function importSlides(value: unknown, importedUrlMap: Map<string, string>): Promise<unknown> {
  if (!Array.isArray(value)) {
    return value;
  }

  const slides = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const slide = { ...(item as Record<string, unknown>) };

    for (const key of ["desktop", "mobile", "src"]) {
      const url = slide[key];

      if (typeof url === "string" && shouldImportUrl(url)) {
        slide[key] = await importExternalUrl(url, importedUrlMap);
      }
    }

    slides.push(slide);
  }

  return slides;
}

async function importExternalUrl(url: string, importedUrlMap: Map<string, string>): Promise<string> {
  const normalizedUrl = normalizeRemoteUrl(url);

  if (!normalizedUrl) {
    return url;
  }

  const existingUrl = importedUrlMap.get(normalizedUrl);

  if (existingUrl) {
    return existingUrl;
  }

  const existingAsset = await prisma.mediaAsset.findFirst({
    where: { originalUrl: normalizedUrl, deletedAt: null }
  });

  if (existingAsset) {
    importedUrlMap.set(normalizedUrl, existingAsset.url);
    return existingAsset.url;
  }

  const response = await fetch(normalizedUrl, {
    headers: { "User-Agent": "NerdLingoLab media importer" }
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar ${normalizedUrl}: HTTP ${response.status}`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";

  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error(`Tipo de imagem não permitido em ${normalizedUrl}: ${mimeType}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length > maxBytes) {
    throw new Error(`Imagem muito grande em ${normalizedUrl}`);
  }

  const webpImage = await convertImageToWebp(bytes, getFileName(normalizedUrl, "imported.webp"));
  const objectKey = `imported/${new Date().toISOString().slice(0, 10).replace(/-/g, "/")}/${randomUUID()}.webp`;

  await minioClient.putObject(productImageBucketName, objectKey, webpImage.bytes, webpImage.bytes.length, {
    "Content-Type": webpImage.mimeType
  });

  const internalUrl = getProductImagePublicUrl(objectKey);

  await createMediaAsset({
    bucket: productImageBucketName,
    fileName: webpImage.fileName,
    height: webpImage.height,
    mimeType: webpImage.mimeType,
    objectKey,
    originalUrl: normalizedUrl,
    sizeBytes: webpImage.bytes.length,
    source: "EXTERNAL_IMPORT",
    url: internalUrl,
    width: webpImage.width
  });

  importedUrlMap.set(normalizedUrl, internalUrl);
  console.log(`${normalizedUrl} -> ${internalUrl}`);

  return internalUrl;
}

function shouldImportUrl(value: string): boolean {
  return Boolean(normalizeRemoteUrl(value));
}

function normalizeRemoteUrl(value: string): string | null {
  const rawValue = value.trim();

  if (!rawValue || rawValue.startsWith("/") || rawValue.startsWith("/api/media/")) {
    return null;
  }

  try {
    const url = new URL(rawValue.startsWith("//") ? `https:${rawValue}` : rawValue);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function readImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
        return item.url;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function extractSlideUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((slide) => {
    if (!slide || typeof slide !== "object" || Array.isArray(slide)) {
      return [];
    }

    const record = slide as Record<string, unknown>;
    return [record.desktop, record.mobile, record.src].filter((url): url is string => typeof url === "string");
  });
}

function getFileName(url: string, objectKey: string): string {
  const fileName = path.basename(new URL(url).pathname);
  return fileName || path.basename(objectKey);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function ensureProductImageBucket(): Promise<void> {
  if (!(await minioClient.bucketExists(productImageBucketName))) {
    await minioClient.makeBucket(productImageBucketName);
  }
}

function getProductImagePublicUrl(objectName: string): string {
  return `/api/media/${objectName.split("/").map(encodeURIComponent).join("/")}`;
}

async function createMediaAsset(input: {
  bucket: string;
  fileName: string;
  height?: number | null;
  mimeType: string;
  objectKey: string;
  originalUrl: string;
  sizeBytes: number;
  source: string;
  url: string;
  width?: number | null;
}): Promise<void> {
  await prisma.mediaAsset.upsert({
    where: { objectKey: input.objectKey },
    create: input,
    update: {
      originalUrl: input.originalUrl,
      url: input.url
    }
  });
}

async function syncMediaUsages({
  fieldName,
  ownerId,
  ownerType,
  productId,
  urls
}: {
  fieldName: string;
  ownerId: string;
  ownerType: string;
  productId?: string | null;
  urls: string[];
}): Promise<void> {
  const assets = await prisma.mediaAsset.findMany({
    select: { id: true, url: true },
    where: { deletedAt: null, url: { in: urls } }
  });
  const assetByUrl = new Map(assets.map((asset) => [asset.url, asset]));

  await prisma.mediaAssetUsage.deleteMany({
    where: { fieldName, ownerId, ownerType }
  });

  const rows = urls.flatMap((url, index) => {
    const asset = assetByUrl.get(url);
    return asset
      ? [{
          assetId: asset.id,
          fieldName,
          ownerId,
          ownerType,
          productId: productId ?? null,
          sortOrder: index
        }]
      : [];
  });

  if (rows.length > 0) {
    await prisma.mediaAssetUsage.createMany({ data: rows, skipDuplicates: true });
  }
}
