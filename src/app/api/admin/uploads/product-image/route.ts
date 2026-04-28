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
import { buildProductImageObjectName, validateProductImage, validateProductImageBytes } from "@/lib/uploads/product-image";

const uploadSchema = z.object({
  file: z.custom<File>((value) => value instanceof File)
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);
    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 20,
      name: "product-image-upload"
    });

    if (sameOriginError ?? rateLimitError) {
      return (sameOriginError ?? rateLimitError) as NextResponse;
    }

    if (!(await isAdminSession())) {
      return NextResponse.json({ message: "Acesso não autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const parsedUpload = uploadSchema.safeParse({
      file: formData.get("file")
    });

    if (!parsedUpload.success) {
      return NextResponse.json({ message: "Envie uma imagem." }, { status: 400 });
    }

    const file = parsedUpload.data.file;

    validateProductImage(file);
    await ensureProductImageBucket();

    const objectName = buildProductImageObjectName(file);
    const bytes = Buffer.from(await file.arrayBuffer());
    validateProductImageBytes(file, bytes);
    const webpImage = await convertImageToWebp(bytes, file.name);

    await minioClient.putObject(productImageBucketName, objectName, webpImage.bytes, webpImage.bytes.length, {
      "Content-Type": webpImage.mimeType
    });
    const session = await auth();
    const url = getProductImagePublicUrl(objectName);
    const asset = await createMediaAsset({
      bucket: productImageBucketName,
      createdById: session?.user?.id ?? null,
      fileName: webpImage.fileName,
      height: webpImage.height,
      mimeType: webpImage.mimeType,
      objectKey: objectName,
      sizeBytes: webpImage.bytes.length,
      source: "UPLOAD",
      url,
      width: webpImage.width
    });

    return NextResponse.json({
      assetId: asset.id,
      objectName,
      url
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Não foi possível enviar a imagem. Confira o arquivo e tente novamente." },
      { status: 500 }
    );
  }
}
