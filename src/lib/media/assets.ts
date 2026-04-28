import type { MediaAsset } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError } from "@/lib/prisma-errors";
import { removeProductImageObject } from "@/lib/storage";

export interface CreateMediaAssetInput {
  altText?: string | null;
  bucket: string;
  createdById?: string | null;
  fileName: string;
  height?: number | null;
  mimeType: string;
  objectKey: string;
  originalUrl?: string | null;
  sizeBytes: number;
  source?: string;
  url: string;
  width?: number | null;
}

export async function createMediaAsset(input: CreateMediaAssetInput): Promise<MediaAsset> {
  return prisma.mediaAsset.upsert({
    where: { objectKey: input.objectKey },
    create: {
      altText: input.altText ?? null,
      bucket: input.bucket,
      createdById: input.createdById ?? null,
      fileName: input.fileName,
      height: input.height ?? null,
      mimeType: input.mimeType,
      objectKey: input.objectKey,
      originalUrl: input.originalUrl ?? null,
      sizeBytes: input.sizeBytes,
      source: input.source ?? "UPLOAD",
      url: input.url,
      width: input.width ?? null
    },
    update: {
      altText: input.altText ?? undefined,
      originalUrl: input.originalUrl ?? undefined,
      url: input.url
    }
  });
}

export async function syncMediaUsages({
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
  try {
    const assets = await prisma.mediaAsset.findMany({
      select: { id: true, url: true },
      where: {
        deletedAt: null,
        url: { in: urls }
      }
    });
    const assetByUrl = new Map(assets.map((asset) => [asset.url, asset]));

    await prisma.mediaAssetUsage.deleteMany({
      where: { fieldName, ownerId, ownerType }
    });

    const usageRows = urls
      .map((url, index) => {
        const asset = assetByUrl.get(url);

        if (!asset) {
          return null;
        }

        return {
          assetId: asset.id,
          fieldName,
          ownerId,
          ownerType,
          productId: productId ?? null,
          sortOrder: index
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (usageRows.length > 0) {
      await prisma.mediaAssetUsage.createMany({
        data: usageRows,
        skipDuplicates: true
      });
    }
  } catch (error) {
    if (isPrismaMissingTableError(error, "MediaAsset") || isPrismaMissingTableError(error, "MediaAssetUsage")) {
      return;
    }

    throw error;
  }
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  const asset = await prisma.mediaAsset.findUnique({
    include: {
      usages: {
        take: 1
      }
    },
    where: { id: assetId }
  });

  if (!asset) {
    return;
  }

  if (asset.usages.length > 0) {
    throw new Error("Remova a imagem dos produtos, slides ou popups antes de excluir.");
  }

  await removeProductImageObject(asset.objectKey);
  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { deletedAt: new Date() }
  });
}

export async function deleteUnusedMediaAssets(assetIds: string[]): Promise<void> {
  const uniqueAssetIds = Array.from(new Set(assetIds));

  for (const assetId of uniqueAssetIds) {
    const asset = await prisma.mediaAsset.findUnique({
      include: {
        usages: { take: 1 }
      },
      where: { id: assetId }
    });

    if (!asset || asset.deletedAt || asset.usages.length > 0) {
      continue;
    }

    await removeProductImageObject(asset.objectKey);
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date() }
    });
  }
}
