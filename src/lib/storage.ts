import { Client } from "minio";

const minioEndpoint = process.env.MINIO_ENDPOINT ?? "localhost";
const minioPort = Number.parseInt(process.env.MINIO_PORT ?? "9000", 10);
const minioUseSsl = process.env.MINIO_USE_SSL === "true";

export const productImageBucketName: string = process.env.MINIO_BUCKET ?? "product-images";

export const minioClient = new Client({
  endPoint: minioEndpoint,
  port: Number.isFinite(minioPort) ? minioPort : 9000,
  useSSL: minioUseSsl,
  accessKey: process.env.S3_ACCESS_KEY_ID ?? "",
  secretKey: process.env.S3_SECRET_ACCESS_KEY ?? ""
});

export async function ensureProductImageBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(productImageBucketName);

  if (!exists) {
    await minioClient.makeBucket(productImageBucketName);
  }
}

export function getProductImagePublicUrl(objectName: string): string {
  const protocol = minioUseSsl ? "https" : "http";

  return `${protocol}://${minioEndpoint}:${Number.isFinite(minioPort) ? minioPort : 9000}/${productImageBucketName}/${objectName}`;
}
