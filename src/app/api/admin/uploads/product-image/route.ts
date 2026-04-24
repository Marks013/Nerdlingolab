import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { ensureProductImageBucket, getProductImagePublicUrl, minioClient, productImageBucketName } from "@/lib/storage";
import { buildProductImageObjectName, validateProductImage, validateProductImageBytes } from "@/lib/uploads/product-image";

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
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Envie uma imagem." }, { status: 400 });
    }

    validateProductImage(file);
    await ensureProductImageBucket();

    const objectName = buildProductImageObjectName(file);
    const bytes = Buffer.from(await file.arrayBuffer());
    validateProductImageBytes(file, bytes);

    await minioClient.putObject(productImageBucketName, objectName, bytes, bytes.length, {
      "Content-Type": file.type
    });

    return NextResponse.json({
      url: getProductImagePublicUrl(objectName),
      objectName
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Não foi possível enviar a imagem. Confira o arquivo e tente novamente." },
      { status: 500 }
    );
  }
}
