import { Client } from "minio";

import { env } from "@/lib/env";

export const productImageBucketName: string = env.MINIO_BUCKET;

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.S3_ACCESS_KEY_ID ?? "",
  secretKey: env.S3_SECRET_ACCESS_KEY ?? ""
});

export async function ensureProductImageBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(productImageBucketName);

  if (!exists) {
    await minioClient.makeBucket(productImageBucketName);
  }
}

export function getProductImagePublicUrl(objectName: string): string {
  const protocol = env.MINIO_USE_SSL ? "https" : "http";

  return `${protocol}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${productImageBucketName}/${objectName}`;
}
