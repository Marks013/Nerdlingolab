import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { createMediaAsset } from "@/lib/media/assets";
import { convertImageToWebp } from "@/lib/media/webp";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { ensureProductImageBucket, getProductImagePublicUrl, minioClient, productImageBucketName } from "@/lib/storage";

const uploadSchema = z.object({
  file: z.custom<File>((value) => value instanceof File)
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/ogg"]);
const maxImageSizeBytes = 5 * 1024 * 1024;
const maxVideoSizeBytes = 80 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);
    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 20,
      name: "admin-media-upload"
    });

    if (sameOriginError ?? rateLimitError) {
      return (sameOriginError ?? rateLimitError) as NextResponse;
    }

    if (!(await isAdminSession())) {
      return NextResponse.json({ message: "Acesso nao autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const parsedUpload = uploadSchema.safeParse({
      file: formData.get("file")
    });

    if (!parsedUpload.success) {
      return NextResponse.json({ message: "Envie uma midia valida." }, { status: 400 });
    }

    const file = parsedUpload.data.file;
    const bytes = Buffer.from(await file.arrayBuffer());
    validateMedia(file, bytes);
    await ensureProductImageBucket();

    const session = await auth();
    const asset = allowedImageTypes.has(file.type)
      ? await uploadImage(file, bytes, session?.user?.id ?? null)
      : await uploadVideo(file, bytes, session?.user?.id ?? null);

    return NextResponse.json({
      assetId: asset.id,
      url: asset.url
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Nao foi possivel enviar a midia. Confira o arquivo e tente novamente." },
      { status: 500 }
    );
  }
}

async function uploadImage(file: File, bytes: Buffer, userId: string | null) {
  const webpImage = await convertImageToWebp(bytes, file.name);
  const objectName = buildMediaObjectName("webp");

  await minioClient.putObject(productImageBucketName, objectName, webpImage.bytes, webpImage.bytes.length, {
    "Content-Type": webpImage.mimeType
  });

  return createMediaAsset({
    bucket: productImageBucketName,
    createdById: userId,
    fileName: webpImage.fileName,
    height: webpImage.height,
    mimeType: webpImage.mimeType,
    objectKey: objectName,
    sizeBytes: webpImage.bytes.length,
    source: "UPLOAD",
    url: getProductImagePublicUrl(objectName),
    width: webpImage.width
  });
}

async function uploadVideo(file: File, bytes: Buffer, userId: string | null) {
  const extension = getVideoExtension(file.type);
  const objectName = buildMediaObjectName(extension);

  await minioClient.putObject(productImageBucketName, objectName, bytes, bytes.length, {
    "Content-Type": file.type
  });

  return createMediaAsset({
    bucket: productImageBucketName,
    createdById: userId,
    fileName: normalizeFileName(file.name, extension),
    mimeType: file.type,
    objectKey: objectName,
    sizeBytes: bytes.length,
    source: "UPLOAD",
    url: getProductImagePublicUrl(objectName)
  });
}

function validateMedia(file: File, bytes: Buffer): void {
  if (allowedImageTypes.has(file.type)) {
    if (file.size > maxImageSizeBytes) {
      throw new Error("A imagem deve ter ate 5 MB.");
    }

    validateImageSignature(file.type, bytes);
    return;
  }

  if (allowedVideoTypes.has(file.type)) {
    if (file.size > maxVideoSizeBytes) {
      throw new Error("O video deve ter ate 80 MB.");
    }

    validateVideoSignature(file.type, bytes);
    return;
  }

  throw new Error("Envie JPG, PNG, WebP, GIF, MP4, WebM ou OGG.");
}

function validateImageSignature(mimeType: string, bytes: Buffer): void {
  const signatures: Record<string, number[]> = {
    "image/gif": [0x47, 0x49, 0x46, 0x38],
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46]
  };
  const signature = signatures[mimeType];

  if (!signature?.every((byte, index) => bytes[index] === byte)) {
    throw new Error("Arquivo de imagem invalido.");
  }
}

function validateVideoSignature(mimeType: string, bytes: Buffer): void {
  const isMp4 = mimeType === "video/mp4" && bytes.subarray(4, 8).toString("ascii") === "ftyp";
  const isWebm = mimeType === "video/webm" && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  const isOgg = mimeType === "video/ogg" && bytes.subarray(0, 4).toString("ascii") === "OggS";

  if (!isMp4 && !isWebm && !isOgg) {
    throw new Error("Arquivo de video invalido.");
  }
}

function buildMediaObjectName(extension: string): string {
  const now = new Date();
  const datePath = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("/");

  return `media/${datePath}/${crypto.randomUUID()}.${extension}`;
}

function getVideoExtension(mimeType: string): string {
  if (mimeType === "video/webm") {
    return "webm";
  }

  if (mimeType === "video/ogg") {
    return "ogv";
  }

  return "mp4";
}

function normalizeFileName(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "video";

  return `${baseName}.${extension}`;
}
