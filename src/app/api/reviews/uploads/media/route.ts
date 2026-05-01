import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { createMediaAsset } from "@/lib/media/assets";
import { convertImageToWebp } from "@/lib/media/webp";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { ensureProductImageBucket, getProductImagePublicUrl, minioClient, productImageBucketName } from "@/lib/storage";
import { getProductReviewSettings } from "@/lib/reviews/settings";

const uploadSchema = z.object({
  file: z.custom<File>((value) => value instanceof File)
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/ogg"]);
const maxImageSizeBytes = 5 * 1024 * 1024;
const maxVideoSizeBytes = 80 * 1024 * 1024;
const maxUploadRequestBytes = maxVideoSizeBytes + 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);
    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 12,
      name: "review-media-upload"
    });

    if (sameOriginError ?? rateLimitError) {
      return (sameOriginError ?? rateLimitError) as NextResponse;
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Entre na sua conta para enviar mídias." }, { status: 401 });
    }

    const settings = await getProductReviewSettings();

    if (!settings.isEnabled) {
      return NextResponse.json({ message: "Avaliações temporariamente indisponíveis." }, { status: 403 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (Number.isFinite(contentLength) && contentLength > maxUploadRequestBytes) {
      return NextResponse.json({ message: "A mídia deve ter até 80 MB." }, { status: 413 });
    }

    const formData = await request.formData();
    const parsedUpload = uploadSchema.safeParse({
      file: formData.get("file")
    });

    if (!parsedUpload.success) {
      return NextResponse.json({ message: "Envie uma mídia válida." }, { status: 400 });
    }

    const file = parsedUpload.data.file;
    const bytes = Buffer.from(await file.arrayBuffer());
    validateMedia(file, bytes, settings.allowImages, settings.allowVideos);
    await ensureProductImageBucket();

    const asset = allowedImageTypes.has(file.type)
      ? await uploadImage(file, bytes, session.user.id)
      : await uploadVideo(file, bytes, session.user.id);

    return NextResponse.json({
      assetId: asset.id,
      mimeType: asset.mimeType,
      url: asset.url
    });
  } catch (error) {
    if (error instanceof ReviewMediaUploadValidationError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Não foi possível enviar a mídia. Confira o arquivo e tente novamente." },
      { status: 500 }
    );
  }
}

async function uploadImage(file: File, bytes: Buffer, userId: string) {
  const webpImage = await convertImageToWebp(bytes, file.name);
  const objectName = buildReviewMediaObjectName("webp");

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
    source: "REVIEW",
    url: getProductImagePublicUrl(objectName),
    width: webpImage.width
  });
}

async function uploadVideo(file: File, bytes: Buffer, userId: string) {
  const extension = getVideoExtension(file.type);
  const objectName = buildReviewMediaObjectName(extension);

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
    source: "REVIEW",
    url: getProductImagePublicUrl(objectName)
  });
}

function validateMedia(file: File, bytes: Buffer, allowImages: boolean, allowVideos: boolean): void {
  if (allowedImageTypes.has(file.type)) {
    if (!allowImages) {
      throw new ReviewMediaUploadValidationError("O envio de imagens está desativado.");
    }

    if (file.size > maxImageSizeBytes) {
      throw new ReviewMediaUploadValidationError("A imagem deve ter até 5 MB.", 413);
    }

    validateImageSignature(file.type, bytes);
    return;
  }

  if (allowedVideoTypes.has(file.type)) {
    if (!allowVideos) {
      throw new ReviewMediaUploadValidationError("O envio de vídeos está desativado.");
    }

    if (file.size > maxVideoSizeBytes) {
      throw new ReviewMediaUploadValidationError("O vídeo deve ter até 80 MB.", 413);
    }

    validateVideoSignature(file.type, bytes);
    return;
  }

  throw new ReviewMediaUploadValidationError("Envie JPG, PNG, WebP, GIF, MP4, WebM ou OGG.");
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
    throw new ReviewMediaUploadValidationError("Arquivo de imagem inválido.");
  }
}

function validateVideoSignature(mimeType: string, bytes: Buffer): void {
  const isMp4 = mimeType === "video/mp4" && bytes.subarray(4, 8).toString("ascii") === "ftyp";
  const isWebm = mimeType === "video/webm" && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  const isOgg = mimeType === "video/ogg" && bytes.subarray(0, 4).toString("ascii") === "OggS";

  if (!isMp4 && !isWebm && !isOgg) {
    throw new ReviewMediaUploadValidationError("Arquivo de vídeo inválido.");
  }
}

function buildReviewMediaObjectName(extension: string): string {
  const now = new Date();
  const datePath = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("/");

  return `reviews/${datePath}/${crypto.randomUUID()}.${extension}`;
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
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "review";

  return `${baseName}.${extension}`;
}

class ReviewMediaUploadValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReviewMediaUploadValidationError";
    this.status = status;
  }
}
