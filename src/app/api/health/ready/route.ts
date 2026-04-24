import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { minioClient, productImageBucketName } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

interface ReadinessCheck {
  ok: boolean;
  name: string;
}

async function checkDatabase(): Promise<ReadinessCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: "database", ok: true };
  } catch (error) {
    Sentry.captureException(error);
    return { name: "database", ok: false };
  }
}

async function checkStorage(): Promise<ReadinessCheck> {
  try {
    await minioClient.bucketExists(productImageBucketName);
    return { name: "storage", ok: true };
  } catch (error) {
    Sentry.captureException(error);
    return { name: "storage", ok: false };
  }
}

export async function GET(): Promise<NextResponse> {
  const checks = await Promise.all([checkDatabase(), checkStorage()]);
  const isReady = checks.every((check) => check.ok);

  return NextResponse.json(
    {
      ok: isReady,
      service: "nerdlingolab-commerce",
      checks,
      timestamp: new Date().toISOString()
    },
    { status: isReady ? 200 : 503 }
  );
}
