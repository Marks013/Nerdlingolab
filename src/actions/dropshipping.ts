"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PricingRoundingMode, ProductStatus, SupplierProvider, SupplierSourceStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin";
import {
  acknowledgeSourceAlert,
  applySuggestedSourcePrice,
  ensureProductSourcesFromMetafields,
  syncDueProductSources,
  syncProductSource,
  updateManualProductSourceSnapshot
} from "@/lib/dropshipping/sync";
import { importSupplierSnapshotCsv } from "@/lib/dropshipping/import";
import { buildDropshippingSourceWhere } from "@/lib/dropshipping/queries";
import { prisma } from "@/lib/prisma";

const maxImportFileSize = 2_000_000;
const sourceIdSchema = z.string().min(1);
const manualSnapshotSchema = z.object({
  note: z.string().trim().max(500).optional(),
  price: z.string().trim().optional(),
  sourceId: z.string().min(1),
  status: z.enum(["ACTIVE", "PAUSED", "CLOSED", "DELETED", "OUT_OF_STOCK", "UNKNOWN", "ERROR", "CONFIG_REQUIRED"]),
  stockQuantity: z.string().trim().optional()
});
const pricingFormSchema = z.object({
  marginFixed: z.string().trim().optional(),
  marginPercent: z.coerce.number().min(0).max(500),
  minimumMargin: z.string().trim().optional(),
  roundingMode: z.nativeEnum(PricingRoundingMode)
});
const filteredSourcesSchema = z.object({
  provider: z.nativeEnum(SupplierProvider).optional(),
  query: z.string().trim().max(120).optional(),
  scope: z.enum(["active", "all", "review"]).optional(),
  status: z.nativeEnum(SupplierSourceStatus).optional()
});
const productStorePriceSchema = z.object({
  price: z.string().trim().min(1, "Informe um preco valido."),
  productId: z.string().min(1)
});

export async function bootstrapDropshippingSourcesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  const result = await ensureProductSourcesFromMetafields(1_000);
  revalidatePath("/admin/fornecedores");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: `Links reindexados. ${result.created} origem(ns) revisadas, ${result.skipped} sem link.`,
    noticeType: "success"
  })}`);
}

export async function syncDropshippingSourceAction(sourceId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  const result = await syncProductSource(sourceIdSchema.parse(sourceId));
  revalidatePath("/admin/fornecedores");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: `Origem sincronizada como ${result.status}.`,
    noticeType: "success"
  })}`);
}

export async function syncDropshippingBatchAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  const result = await syncDueProductSources(30);
  revalidatePath("/admin/fornecedores");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: `Lote sincronizado. ${result.attempted} origem(ns), ${result.failed} falha(s) reais.`,
    noticeType: result.failed > 0 ? "warning" : "success"
  })}`);
}

export async function applySuggestedSourcePriceAction(sourceId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  try {
    await applySuggestedSourcePrice(sourceIdSchema.parse(sourceId));
  } catch {
    redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
      filters,
      notice: "Nao foi possivel aplicar o preco. Produto ou origem nao localizada.",
      noticeType: "warning"
    })}`);
  }
  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: "Preco sugerido aplicado ao produto e variacoes.",
    noticeType: "success"
  })}`);
}

export async function applySuggestedPricesToFilteredSourcesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = filteredSourcesSchema.parse({
    provider: normalizeOptionalEnum(formData.get("fornecedor")),
    query: normalizeOptionalText(formData.get("busca")),
    scope: normalizeOptionalScope(formData.get("escopo")),
    status: normalizeOptionalEnum(formData.get("status"))
  });
  const sources = await prisma.productSource.findMany({
    select: { id: true },
    take: 250,
    where: buildDropshippingSourceWhere(filters)
  });
  let applied = 0;
  let skipped = 0;

  for (const source of sources) {
    try {
      await applySuggestedSourcePrice(source.id);
      applied += 1;
    } catch {
      skipped += 1;
    }
  }

  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: `Margem aplicada em massa. ${applied} produto(s) atualizado(s), ${skipped} sem preco sugerido valido.`,
    noticeType: skipped > 0 ? "warning" : "success"
  })}`);
}

export async function updateSupplierProductStorePriceAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  const parsed = productStorePriceSchema.safeParse({
    price: formData.get("storePrice"),
    productId: formData.get("productId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Preco invalido.");
  }

  const priceCents = parseCurrencyToCents(parsed.data.price);

  if (priceCents === null || priceCents <= 0) {
    throw new Error("Informe um preco da loja maior que zero.");
  }

  const updated = await prisma.product.updateMany({
    data: {
      priceCents
    },
    where: { id: parsed.data.productId }
  });

  if (updated.count === 0) {
    redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
      filters,
      notice: "Produto nao encontrado para alterar preco.",
      noticeType: "warning"
    })}`);
  }

  await prisma.productVariant.updateMany({
    data: { priceCents },
    where: { productId: parsed.data.productId }
  });

  revalidateSupplierProductPaths();
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: "Preco da loja atualizado no produto e nas variacoes.",
    noticeType: "success"
  })}`);
}

export async function archiveSupplierProductAction(productId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  const id = sourceIdSchema.parse(productId);

  const updated = await prisma.product.updateMany({
    data: {
      publishedAt: null,
      status: ProductStatus.ARCHIVED
    },
    where: { id }
  });

  if (updated.count === 0) {
    redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
      filters,
      notice: "Produto nao encontrado para desativar.",
      noticeType: "warning"
    })}`);
  }

  revalidateSupplierProductPaths();
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: "Produto desativado na loja.",
    noticeType: "warning"
  })}`);
}

export async function deleteSupplierProductAction(productId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  const id = sourceIdSchema.parse(productId);
  const product = await prisma.product.findUnique({
    select: {
      _count: { select: { orderItems: true } }
    },
    where: { id }
  });

  if (!product) {
    redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
      filters,
      notice: "Produto nao encontrado.",
      noticeType: "warning"
    })}`);
  }

  if (product._count.orderItems > 0) {
    await prisma.product.updateMany({
      data: {
        publishedAt: null,
        status: ProductStatus.ARCHIVED
      },
      where: { id }
    });
    revalidateSupplierProductPaths();
    redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
      filters,
      notice: "Produto possui pedido vinculado e foi apenas desativado/arquivado.",
      noticeType: "warning"
    })}`);
  }

  try {
    await prisma.product.delete({ where: { id } });
    revalidateSupplierProductPaths();
    redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
      filters,
      notice: "Produto excluido definitivamente.",
      noticeType: "success"
    })}`);
  } catch {
    const updated = await prisma.product.updateMany({
      data: {
        publishedAt: null,
        status: ProductStatus.ARCHIVED
      },
      where: { id }
    });
    if (updated.count === 0) {
      redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
        filters,
        notice: "Produto nao encontrado para excluir ou arquivar.",
        noticeType: "warning"
      })}`);
    }
    revalidateSupplierProductPaths();
    redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
      filters,
      notice: "Nao foi possivel excluir sem afetar vinculos. O produto foi desativado/arquivado com seguranca.",
      noticeType: "warning"
    })}`);
  }
}

export async function acknowledgeSourceAlertAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);
  const alertId = z.string().min(1).parse(formData.get("alertId"));

  await acknowledgeSourceAlert(alertId);
  revalidatePath("/admin/fornecedores");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: "Alerta marcado como visto.",
    noticeType: "success"
  })}`);
}

export async function updateManualSourceSnapshotAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);

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

  const priceCents = parseCurrencyToCents(parsed.data.price);
  const stockQuantity = parseOptionalInteger(parsed.data.stockQuantity);
  const status = inferManualSourceStatus(parsed.data.status, priceCents);

  await updateManualProductSourceSnapshot({
    sourceId: parsed.data.sourceId,
    status,
    priceCents,
    stockQuantity,
    note: parsed.data.note
  });

  let priceNotice = priceCents !== null && priceCents > 0
    ? "Preco de origem salvo e preco sugerido recalculado."
    : "Preco sugerido recalculado.";

  if (priceCents !== null && priceCents > 0 && status === SupplierSourceStatus.ACTIVE) {
    try {
      await applySuggestedSourcePrice(parsed.data.sourceId);
      priceNotice = "Preco de origem salvo; loja e variacoes atualizadas automaticamente com a margem configurada.";
    } catch {
      priceNotice = "Preco de origem salvo, mas nao foi possivel aplicar a margem automaticamente.";
    }
  }

  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: `Validacao manual salva. ${priceNotice}`,
    noticeType: priceNotice.includes("nao foi possivel") ? "warning" : "success"
  })}`);
}

export async function importSupplierSnapshotsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);

  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Envie um arquivo CSV valido.");
  }

  if (file.size > maxImportFileSize) {
    throw new Error("Arquivo muito grande. Envie um CSV de ate 2 MB.");
  }

  if (!isCsvFile(file)) {
    throw new Error("Envie um arquivo .csv valido.");
  }

  const result = await importSupplierSnapshotCsv(await file.text());
  const details = [
    `${result.imported} importado(s)`,
    `${result.skipped} ignorado(s)`,
    `${result.invalid} invalido(s)`,
    `${result.missing} sem origem localizada`
  ].join(", ");
  const suffix = result.errors.length ? ` Primeiros erros: ${result.errors.slice(0, 3).join(" | ")}` : "";
  const params = new URLSearchParams({
    errors: String(result.errors.length),
    archived: String(result.archived),
    imported: String(result.imported),
    invalid: String(result.invalid),
    matchedByExternal: String(result.matchedByExternal),
    matchedBySourceId: String(result.matchedBySourceId),
    matchedByUrl: String(result.matchedByUrl),
    missing: String(result.missing),
    notice: `Importacao assistida concluida: ${details}.${suffix}`,
    noticeType: result.errors.length || result.invalid ? "warning" : "success",
    skipped: String(result.skipped),
    updatedPrice: String(result.updatedPrice),
    updatedStatus: String(result.updatedStatus),
    updatedStock: String(result.updatedStock),
    updatedTitle: String(result.updatedTitle)
  });
  const filterParams = buildSupplierFilterParams(filters);

  filterParams.forEach((value, key) => params.set(key, value));

  if (result.errors.length) {
    params.set("importDetails", result.errors.slice(0, 5).join(" | "));
  }

  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect(`/admin/fornecedores?${params.toString()}`);
}

export const importSupplierCsvAction = importSupplierSnapshotsAction;
export const updateManualSourceAction = updateManualSourceSnapshotAction;

export async function updateGlobalPricingRuleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const filters = readSupplierFilters(formData);

  const parsed = pricingFormSchema.safeParse({
    marginFixed: formData.get("marginFixed"),
    marginPercent: formData.get("marginPercent"),
    minimumMargin: formData.get("minimumMargin"),
    roundingMode: formData.get("roundingMode")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Regra de margem invalida.");
  }

  const marginFixedCents = parseCurrencyToCents(parsed.data.marginFixed) ?? 0;
  const minimumMarginCents = parseCurrencyToCents(parsed.data.minimumMargin) ?? 0;

  await prisma.pricingRule.upsert({
    create: {
      id: "pricing_global_default",
      scope: "GLOBAL",
      marginPercent: parsed.data.marginPercent,
      marginFixedCents,
      minimumMarginCents,
      roundingMode: parsed.data.roundingMode
    },
    update: {
      marginPercent: parsed.data.marginPercent,
      marginFixedCents,
      minimumMarginCents,
      roundingMode: parsed.data.roundingMode
    },
    where: { id: "pricing_global_default" }
  });

  revalidatePath("/admin/fornecedores");
  redirect(`/admin/fornecedores?${buildSupplierRedirectParams({
    filters,
    notice: "Regra de margem salva em reais.",
    noticeType: "success"
  })}`);
}

function readSupplierFilters(formData: FormData): z.infer<typeof filteredSourcesSchema> {
  return filteredSourcesSchema.parse({
    provider: normalizeOptionalEnum(formData.get("filterFornecedor") ?? formData.get("fornecedor")),
    query: normalizeOptionalText(formData.get("filterBusca") ?? formData.get("busca")),
    scope: normalizeOptionalScope(formData.get("filterEscopo") ?? formData.get("escopo")),
    status: normalizeOptionalEnum(formData.get("filterStatus") ?? formData.get("status"))
  });
}

function inferManualSourceStatus(status: SupplierSourceStatus, priceCents: number | null): SupplierSourceStatus {
  const autoActiveStatuses: SupplierSourceStatus[] = [
    SupplierSourceStatus.CONFIG_REQUIRED,
    SupplierSourceStatus.UNKNOWN,
    SupplierSourceStatus.ERROR
  ];

  if (
    priceCents !== null
    && priceCents > 0
    && autoActiveStatuses.includes(status)
  ) {
    return SupplierSourceStatus.ACTIVE;
  }

  return status;
}

function buildSupplierRedirectParams({
  filters,
  notice,
  noticeType
}: {
  filters: z.infer<typeof filteredSourcesSchema>;
  notice: string;
  noticeType: "success" | "warning";
}): string {
  const params = new URLSearchParams({
    notice,
    noticeType
  });

  if (filters.query) {
    params.set("busca", filters.query);
  }

  if (filters.provider) {
    params.set("fornecedor", filters.provider);
  }

  if (filters.scope) {
    params.set("escopo", filters.scope);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  return params.toString();
}

function buildSupplierFilterParams(filters: z.infer<typeof filteredSourcesSchema>): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("busca", filters.query);
  }

  if (filters.provider) {
    params.set("fornecedor", filters.provider);
  }

  if (filters.scope) {
    params.set("escopo", filters.scope);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  return params;
}

function normalizeOptionalText(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";

  return text || undefined;
}

function normalizeOptionalEnum(value: FormDataEntryValue | null): string | undefined {
  return normalizeOptionalText(value);
}

function normalizeOptionalScope(value: FormDataEntryValue | null): "active" | "all" | "review" | undefined {
  if (value !== "active" && value !== "all" && value !== "review") {
    return undefined;
  }

  return value;
}

function revalidateSupplierProductPaths(): void {
  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  revalidatePath("/ofertas");
}

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return name.endsWith(".csv") || type === "text/csv" || type === "application/vnd.ms-excel";
}

function parseCurrencyToCents(value: string | undefined): number | null {
  const normalized = value
    ?.replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  if (!normalized) {
    return null;
  }

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue * 100) : null;
}

function parseOptionalInteger(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null;
}
