import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";

import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "minio";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { convertImageToWebp } from "../src/lib/media/webp";

const productImageBucketName = process.env.MINIO_BUCKET ?? "product-images";
const minioPort = Number.parseInt(process.env.MINIO_PORT ?? "9000", 10);
const minioClient = new Client({
  accessKey: process.env.S3_ACCESS_KEY_ID ?? "",
  endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
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
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "asc" },
    where: {
      deletedAt: null,
      mimeType: { in: ["image/jpeg", "image/png", "image/gif"] }
    }
  });
  let convertedCount = 0;

  for (const asset of assets) {
    const oldUrl = asset.url;
    const bucketName = asset.bucket || productImageBucketName;
    const object = await minioClient.getObject(bucketName, asset.objectKey);
    const sourceBytes = await streamToBuffer(object);
    const webpImage = await convertImageToWebp(sourceBytes, asset.fileName);
    const nextObjectKey = await getAvailableWebpObjectKey(asset.objectKey, asset.id);
    const nextUrl = getProductImagePublicUrl(nextObjectKey);

    await minioClient.putObject(bucketName, nextObjectKey, webpImage.bytes, webpImage.bytes.length, {
      "Content-Type": webpImage.mimeType
    });

    await replaceMediaUrlEverywhere(oldUrl, nextUrl);
    await prisma.mediaAsset.update({
      data: {
        fileName: webpImage.fileName,
        height: webpImage.height,
        mimeType: webpImage.mimeType,
        objectKey: nextObjectKey,
        sizeBytes: webpImage.bytes.length,
        url: nextUrl,
        width: webpImage.width
      },
      where: { id: asset.id }
    });

    if (asset.objectKey !== nextObjectKey) {
      await minioClient.removeObject(bucketName, asset.objectKey).catch(() => undefined);
    }

    convertedCount += 1;
    console.log(`${oldUrl} -> ${nextUrl}`);
  }

  console.log(`Conversão concluída. ${convertedCount} mídia(s) convertida(s) para WebP.`);
}

async function replaceMediaUrlEverywhere(oldUrl: string, nextUrl: string): Promise<void> {
  const products = await prisma.product.findMany({
    select: { id: true, images: true }
  });

  for (const product of products) {
    const images = replaceJsonString(product.images, oldUrl, nextUrl);

    if (images.changed) {
      await prisma.product.update({
        data: { images: images.value as Prisma.InputJsonValue },
        where: { id: product.id }
      });
    }
  }

  const variants = await prisma.productVariant.findMany({
    select: { id: true, optionValues: true }
  });

  for (const variant of variants) {
    const optionValues = replaceJsonString(variant.optionValues, oldUrl, nextUrl);

    if (optionValues.changed) {
      await prisma.productVariant.update({
        data: { optionValues: optionValues.value as Prisma.InputJsonValue },
        where: { id: variant.id }
      });
    }
  }

  const themes = await prisma.storefrontTheme.findMany({
    select: { heroSlides: true, id: true, promoSlides: true }
  });

  for (const theme of themes) {
    const heroSlides = replaceJsonString(theme.heroSlides, oldUrl, nextUrl);
    const promoSlides = replaceJsonString(theme.promoSlides, oldUrl, nextUrl);

    if (heroSlides.changed || promoSlides.changed) {
      await prisma.storefrontTheme.update({
        data: {
          heroSlides: heroSlides.value as Prisma.InputJsonValue,
          promoSlides: promoSlides.value as Prisma.InputJsonValue
        },
        where: { id: theme.id }
      });
    }
  }

  await prisma.marketingPopup.updateMany({
    data: { imageUrl: nextUrl },
    where: { imageUrl: oldUrl }
  });
}

function replaceJsonString(value: unknown, oldUrl: string, nextUrl: string): { changed: boolean; value: unknown } {
  if (typeof value === "string") {
    return value === oldUrl ? { changed: true, value: nextUrl } : { changed: false, value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const nextValue = value.map((item) => {
      const result = replaceJsonString(item, oldUrl, nextUrl);
      changed ||= result.changed;
      return result.value;
    });

    return { changed, value: nextValue };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const nextValue: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      const result = replaceJsonString(item, oldUrl, nextUrl);
      changed ||= result.changed;
      nextValue[key] = result.value;
    }

    return { changed, value: nextValue };
  }

  return { changed: false, value };
}

async function getAvailableWebpObjectKey(objectKey: string, currentAssetId: string): Promise<string> {
  const parsedKey = path.parse(objectKey);
  const baseObjectKey = `${parsedKey.dir ? `${parsedKey.dir}/` : ""}${parsedKey.name}.webp`;
  const existingAsset = await prisma.mediaAsset.findUnique({
    select: { id: true },
    where: { objectKey: baseObjectKey }
  });

  if (!existingAsset || existingAsset.id === currentAssetId) {
    return baseObjectKey;
  }

  return `${parsedKey.dir ? `${parsedKey.dir}/` : ""}${parsedKey.name}-${randomUUID()}.webp`;
}

function getProductImagePublicUrl(objectName: string): string {
  return `/api/media/${objectName.split("/").map(encodeURIComponent).join("/")}`;
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
