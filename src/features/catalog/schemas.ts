import { ProductStatus } from "@/generated/prisma/client";
import { z } from "zod";

import { parseCurrencyToCents, slugify } from "@/lib/format";

const optionalStringSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined));

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria."),
  slug: z.string().trim().optional(),
  description: optionalStringSchema.optional(),
  imageUrl: optionalStringSchema.optional(),
  isActive: z.boolean().default(true)
});

export const productFormSchema = z.object({
  title: z.string().trim().min(2, "Informe o título do produto."),
  slug: z.string().trim().optional(),
  shortDescription: optionalStringSchema.optional(),
  description: z.string().trim().min(10, "Descreva melhor o produto."),
  categoryId: optionalStringSchema.optional(),
  brand: optionalStringSchema.optional(),
  tags: z.string().trim().optional(),
  imageUrls: z.string().trim().optional(),
  price: z.string().trim().min(1, "Informe o preço."),
  compareAtPrice: z.string().trim().optional(),
  sku: z.string().trim().min(2, "Informe o SKU inicial."),
  stockQuantity: z.coerce.number().int().min(0),
  variants: z.string().trim().optional(),
  status: z.enum(ProductStatus).default(ProductStatus.DRAFT)
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type ProductFormInput = z.infer<typeof productFormSchema>;

export interface NormalizedProductVariantInput {
  barcode?: string;
  compareAtPriceCents?: number;
  isActive: boolean;
  optionValues: Record<string, string>;
  priceCents: number;
  sku: string;
  stockQuantity: number;
  title: string;
  weightGrams?: number;
}

export function normalizeCategoryInput(input: CategoryFormInput): CategoryFormInput & { slug: string } {
  return {
    ...input,
    slug: input.slug ? slugify(input.slug) : slugify(input.name)
  };
}

export function normalizeProductInput(input: ProductFormInput): ProductFormInput & {
  slug: string;
  priceCents: number;
  compareAtPriceCents?: number;
  tagsArray: string[];
  imagesArray: string[];
  variantsArray: NormalizedProductVariantInput[];
} {
  const compareAtPriceCents = input.compareAtPrice
    ? parseCurrencyToCents(input.compareAtPrice)
    : undefined;

  return {
    ...input,
    slug: input.slug ? slugify(input.slug) : slugify(input.title),
    priceCents: parseCurrencyToCents(input.price),
    compareAtPriceCents: compareAtPriceCents && compareAtPriceCents > 0 ? compareAtPriceCents : undefined,
    tagsArray: splitLinesOrCommas(input.tags),
    imagesArray: splitLinesOrCommas(input.imageUrls),
    variantsArray: parseProductVariants(input)
  };
}

function parseProductVariants(input: ProductFormInput): NormalizedProductVariantInput[] {
  const fallbackPriceCents = parseCurrencyToCents(input.price);
  const fallbackCompareAtPriceCents = input.compareAtPrice
    ? parseCurrencyToCents(input.compareAtPrice)
    : undefined;
  const lines = splitLines(input.variants);
  const variantLines = lines.length > 0
    ? lines
    : [`Padrão | ${input.sku} | ${input.price} | ${input.stockQuantity}`];

  return variantLines.map((line, index) => {
    const [
      titleValue,
      skuValue,
      priceValue,
      stockValue,
      compareAtPriceValue,
      barcodeValue,
      weightGramsValue,
      activeValue,
      optionValuesValue
    ] = line.split("|").map((part) => part.trim());
    const sku = skuValue || (index === 0 ? input.sku : "");

    if (!sku) {
      throw new Error("Informe o SKU de todas as variantes.");
    }

    const priceCents = priceValue ? parseCurrencyToCents(priceValue) : fallbackPriceCents;
    const compareAtPriceCents = compareAtPriceValue
      ? parseCurrencyToCents(compareAtPriceValue)
      : fallbackCompareAtPriceCents;
    const stockQuantity = stockValue ? Number.parseInt(stockValue, 10) : input.stockQuantity;
    const weightGrams = weightGramsValue ? Number.parseInt(weightGramsValue, 10) : undefined;

    return {
      barcode: barcodeValue || undefined,
      compareAtPriceCents: compareAtPriceCents && compareAtPriceCents > 0 ? compareAtPriceCents : undefined,
      isActive: parseActiveValue(activeValue),
      optionValues: parseOptionValues(optionValuesValue),
      priceCents,
      sku,
      stockQuantity: Number.isFinite(stockQuantity) && stockQuantity > 0 ? stockQuantity : 0,
      title: titleValue || "Padrão",
      weightGrams: weightGrams && weightGrams > 0 ? weightGrams : undefined
    };
  });
}

function splitLinesOrCommas(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseActiveValue(value: string | undefined): boolean {
  if (!value) {
    return true;
  }

  return !["0", "false", "inativo", "não", "nao"].includes(value.toLowerCase());
}

function parseOptionValues(value: string | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  if (value.startsWith("{")) {
    const parsedValue = JSON.parse(value) as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsedValue)
        .filter(([, optionValue]) => optionValue !== null && optionValue !== undefined)
        .map(([optionName, optionValue]) => [optionName, String(optionValue)])
    );
  }

  return Object.fromEntries(
    value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [name, optionValue] = item.split(/[:=]/).map((part) => part.trim());
        return [name, optionValue ?? ""];
      })
      .filter(([name, optionValue]) => name && optionValue)
  );
}
