import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { minioClient, productImageBucketName } from "@/lib/storage";

interface MediaRouteProps {
  params: Promise<{
    objectName: string[];
  }>;
}

export async function GET(_request: Request, { params }: MediaRouteProps): Promise<NextResponse> {
  const { objectName } = await params;
  const objectKey = objectName.map(decodeURIComponent).join("/");

  if (!isSafeObjectKey(objectKey)) {
    return NextResponse.json({ message: "Imagem inválida." }, { status: 400 });
  }

  try {
    const [metadata, stream] = await Promise.all([
      minioClient.statObject(productImageBucketName, objectKey),
      minioClient.getObject(productImageBucketName, objectKey)
    ]);

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(metadata.size),
        "Content-Type": metadata.metaData["content-type"] ?? "application/octet-stream"
      }
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { objectKey },
      tags: { feature: "media", operation: "read" }
    });

    return NextResponse.json({ message: "Imagem não encontrada." }, { status: 404 });
  }
}

function isSafeObjectKey(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 500 &&
    !value.includes("..") &&
    !value.startsWith("/") &&
    /^[a-zA-Z0-9/_=.@-]+$/.test(value)
  );
}
