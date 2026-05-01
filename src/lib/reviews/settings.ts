import type { ProductReviewSettings } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const settingsKey = "default";

export async function getProductReviewSettings(): Promise<ProductReviewSettings> {
  return prisma.productReviewSettings.upsert({
    create: {
      singletonKey: settingsKey
    },
    update: {},
    where: {
      singletonKey: settingsKey
    }
  });
}

export function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsedValue = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsedValue));
}
