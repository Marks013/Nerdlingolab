import { ProductStatus } from "@prisma/client";
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
  status: z.enum(ProductStatus).default(ProductStatus.DRAFT)
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type ProductFormInput = z.infer<typeof productFormSchema>;

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
    imagesArray: splitLinesOrCommas(input.imageUrls)
  };
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
