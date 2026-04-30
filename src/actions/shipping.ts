"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const manualShippingRateSchema = z.object({
  description: z.string().trim().max(180).optional(),
  estimatedBusinessDays: z.coerce.number().int().min(1).max(60),
  isActive: z.boolean().default(false),
  maxItems: z.coerce.number().int().min(1).max(999).optional(),
  maxSubtotalCents: z.number().int().min(0).max(1_000_000).optional(),
  minItems: z.coerce.number().int().min(1).max(999).optional(),
  minSubtotalCents: z.number().int().min(0).max(1_000_000).optional(),
  name: z.string().trim().min(2).max(80),
  postalCodePrefixes: z.array(z.string().regex(/^\d{1,8}$/)).max(40),
  priceCents: z.number().int().min(0).max(100_000),
  sortOrder: z.coerce.number().int().min(0).max(9999)
});

export async function createManualShippingRate(formData: FormData): Promise<void> {
  await requireAdmin();

  const rate = readManualShippingRateForm(formData);

  try {
    await prisma.manualShippingRate.create({ data: rate });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel criar o frete manual.");
  }

  revalidateShippingPaths();
}

export async function updateManualShippingRate(rateId: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const rate = readManualShippingRateForm(formData);

  try {
    await prisma.manualShippingRate.update({
      data: rate,
      where: { id: rateId }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel atualizar o frete manual.");
  }

  revalidateShippingPaths();
}

export async function deleteManualShippingRate(rateId: string): Promise<void> {
  await requireAdmin();

  try {
    await prisma.manualShippingRate.delete({
      where: { id: rateId }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel excluir o frete manual.");
  }

  revalidateShippingPaths();
}

function readManualShippingRateForm(formData: FormData): z.infer<typeof manualShippingRateSchema> {
  const parsedRate = manualShippingRateSchema.safeParse({
    description: readOptionalText(formData, "description"),
    estimatedBusinessDays: formData.get("estimatedBusinessDays"),
    isActive: formData.get("isActive") === "on",
    maxItems: readOptionalNumber(formData, "maxItems"),
    maxSubtotalCents: readOptionalMoneyCents(formData, "maxSubtotalCents"),
    minItems: readOptionalNumber(formData, "minItems"),
    minSubtotalCents: readOptionalMoneyCents(formData, "minSubtotalCents"),
    name: formData.get("name"),
    postalCodePrefixes: readPostalCodePrefixes(formData),
    priceCents: readMoneyCents(formData, "priceCents"),
    sortOrder: formData.get("sortOrder") || "0"
  });

  if (!parsedRate.success) {
    throw new Error(parsedRate.error.issues[0]?.message ?? "Frete manual invalido.");
  }

  if (
    parsedRate.data.minSubtotalCents !== undefined
    && parsedRate.data.maxSubtotalCents !== undefined
    && parsedRate.data.minSubtotalCents > parsedRate.data.maxSubtotalCents
  ) {
    throw new Error("O subtotal minimo nao pode ser maior que o maximo.");
  }

  if (
    parsedRate.data.minItems !== undefined
    && parsedRate.data.maxItems !== undefined
    && parsedRate.data.minItems > parsedRate.data.maxItems
  ) {
    throw new Error("A quantidade minima nao pode ser maior que a maxima.");
  }

  return parsedRate.data;
}

function readText(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, fieldName: string): string | undefined {
  const value = readText(formData, fieldName);

  return value || undefined;
}

function readMoneyCents(formData: FormData, fieldName: string): number {
  const rawValue = readText(formData, fieldName).replace(/\./g, "").replace(",", ".");
  const value = Number(rawValue);

  return Number.isFinite(value) ? Math.round(value * 100) : Number.NaN;
}

function readOptionalMoneyCents(formData: FormData, fieldName: string): number | undefined {
  const rawValue = readText(formData, fieldName);

  return rawValue ? readMoneyCents(formData, fieldName) : undefined;
}

function readOptionalNumber(formData: FormData, fieldName: string): string | undefined {
  const rawValue = readText(formData, fieldName);

  return rawValue || undefined;
}

function readPostalCodePrefixes(formData: FormData): string[] {
  return readText(formData, "postalCodePrefixes")
    .split(/[\s,;]+/)
    .map((prefix) => prefix.replace(/\D/g, ""))
    .filter(Boolean);
}

function revalidateShippingPaths(): void {
  revalidatePath("/admin/fretes");
  revalidatePath("/carrinho");
}
