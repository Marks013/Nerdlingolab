"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PricingRoundingMode } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin";
import {
  acknowledgeSourceAlert,
  applySuggestedSourcePrice,
  ensureProductSourcesFromMetafields,
  syncDueProductSources,
  syncProductSource,
  updateManualProductSourceSnapshot
} from "@/lib/dropshipping/sync";
import { prisma } from "@/lib/prisma";

const sourceIdSchema = z.string().min(1);
const manualSnapshotSchema = z.object({
  note: z.string().trim().max(500).optional(),
  price: z.string().trim().optional(),
  sourceId: z.string().min(1),
  status: z.enum(["ACTIVE", "PAUSED", "CLOSED", "DELETED", "OUT_OF_STOCK", "UNKNOWN", "ERROR", "CONFIG_REQUIRED"]),
  stockQuantity: z.string().trim().optional()
});
const pricingFormSchema = z.object({
  marginFixedCents: z.coerce.number().int().min(0).max(100_000),
  marginPercent: z.coerce.number().min(0).max(500),
  minimumMarginCents: z.coerce.number().int().min(0).max(100_000),
  roundingMode: z.nativeEnum(PricingRoundingMode)
});

export async function bootstrapDropshippingSourcesAction(): Promise<void> {
  await requireAdmin();
  await ensureProductSourcesFromMetafields(1_000);
  revalidatePath("/admin/fornecedores");
}

export async function syncDropshippingSourceAction(sourceId: string): Promise<void> {
  await requireAdmin();
  await syncProductSource(sourceIdSchema.parse(sourceId));
  revalidatePath("/admin/fornecedores");
}

export async function syncDropshippingBatchAction(): Promise<void> {
  await requireAdmin();
  await syncDueProductSources(30);
  revalidatePath("/admin/fornecedores");
}

export async function applySuggestedSourcePriceAction(sourceId: string): Promise<void> {
  await requireAdmin();
  await applySuggestedSourcePrice(sourceIdSchema.parse(sourceId));
  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}

export async function acknowledgeSourceAlertAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const alertId = z.string().min(1).parse(formData.get("alertId"));

  await acknowledgeSourceAlert(alertId);
  revalidatePath("/admin/fornecedores");
}

export async function updateManualSourceSnapshotAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = manualSnapshotSchema.safeParse({
    note: formData.get("note"),
    price: formData.get("price"),
    sourceId: formData.get("sourceId"),
    status: formData.get("status"),
    stockQuantity: formData.get("stockQuantity")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Validacao manual invalida.");
  }

  await updateManualProductSourceSnapshot({
    sourceId: parsed.data.sourceId,
    status: parsed.data.status,
    priceCents: parseCurrencyToCents(parsed.data.price),
    stockQuantity: parseOptionalInteger(parsed.data.stockQuantity),
    note: parsed.data.note
  });

  revalidatePath("/admin/fornecedores");
}

export async function updateGlobalPricingRuleAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = pricingFormSchema.safeParse({
    marginFixedCents: formData.get("marginFixedCents"),
    marginPercent: formData.get("marginPercent"),
    minimumMarginCents: formData.get("minimumMarginCents"),
    roundingMode: formData.get("roundingMode")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Regra de margem invalida.");
  }

  await prisma.pricingRule.upsert({
    create: {
      id: "pricing_global_default",
      scope: "GLOBAL",
      marginPercent: parsed.data.marginPercent,
      marginFixedCents: parsed.data.marginFixedCents,
      minimumMarginCents: parsed.data.minimumMarginCents,
      roundingMode: parsed.data.roundingMode
    },
    update: {
      marginPercent: parsed.data.marginPercent,
      marginFixedCents: parsed.data.marginFixedCents,
      minimumMarginCents: parsed.data.minimumMarginCents,
      roundingMode: parsed.data.roundingMode
    },
    where: { id: "pricing_global_default" }
  });

  revalidatePath("/admin/fornecedores");
}

function parseCurrencyToCents(value: string | undefined): number | null {
  const normalized = value?.replace(/\./g, "").replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? Math.round(numberValue * 100) : null;
}

function parseOptionalInteger(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) ? numberValue : null;
}
