import { ProductStatus, type Category } from "@/generated/prisma/client";

import type { ProductListItem } from "@/lib/catalog/queries";

const fallbackDate = new Date("2026-04-01T12:00:00.000Z");

export const fallbackCategories: Category[] = [
  {
    createdAt: fallbackDate,
    description: "Camisetas e produtos selecionados.",
    id: "fallback-camisetas",
    imageUrl: "/brand-assets/ESTAMPAS_MAIS_VENDIDAS_-_NERDLINGOLAB.webp",
    isActive: true,
    name: "Camisetas",
    parentId: null,
    position: 1,
    slug: "camisetas",
    updatedAt: fallbackDate
  },
  {
    createdAt: fallbackDate,
    description: "Produtos para fãs de cultura geek.",
    id: "fallback-geek",
    imageUrl: "/brand-assets/SOBRE_A_LOJA_-_NERDLINGOLAB.webp",
    isActive: true,
    name: "Geek",
    parentId: null,
    position: 2,
    slug: "geek",
    updatedAt: fallbackDate
  }
];

const fallbackTitles = [
  ["Camiseta Unissex Gato", 6690],
  ["Camiseta Masculina Oversized Streetwear Oni Japonês", 7890],
  ["Camiseta Feminina Espanhol Maestra", 7490],
  ["Camiseta Pink Freud The Dark Side Of Your Mom", 7490],
  ["Camiseta You Are Offline Geek Nerd Blusa Dinossauro", 11290],
  ["Camiseta As Vezes Nem A Minha", 7390],
  ["Camisa Dragão Tokyo", 5690],
  ["Camisa - Unissex Pokemon", 6290],
  ["Camiseta Ramen Tokyo Harajuku Unissex", 6590],
  ["Camiseta Academia Turma Da Bomba", 7090]
] as const;

const fallbackImages = [
  "/brand-assets/ESTAMPAS_MAIS_VENDIDAS_-_NERDLINGOLAB.webp",
  "/brand-assets/SOBRE_A_LOJA_-_NERDLINGOLAB.webp",
  "/brand-assets/OFERTA_DE_FRETE_GRATIS_-_NERDLINGOLAB.webp",
  "/brand-assets/MASCOTE_01_NERDLINGOLAB.webp",
  "/brand-assets/MASCOTE_02_NERDLINGOLAB.webp",
  "/brand-assets/MASCOTE_03_NERDLINGOLAB.webp",
  "/brand-assets/MASCOTE_04_NERDLINGOLAB.webp",
  "/brand-assets/MASCOTE_05_NERDLINGOLAB.webp",
  "/brand-assets/MASCOTE_06_NERDLINGOLAB.webp",
  "/brand-assets/SIMBOLO_NERDLINGOLAB_TESTE.webp"
];

export const fallbackProducts: ProductListItem[] = fallbackTitles.map(([title, priceCents], index) => {
  const id = `fallback-product-${index + 1}`;
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    brand: "NerdLingoLab",
    category: fallbackCategories[index % fallbackCategories.length] ?? null,
    categoryId: fallbackCategories[index % fallbackCategories.length]?.id ?? null,
    compareAtPriceCents: priceCents + 1200,
    createdAt: fallbackDate,
    description:
      "Arte japonesa, cultura pop e estilo geek se encontram nesta peça inspirada no catálogo original da NerdLingoLab.",
    id,
    images: [fallbackImages[index % fallbackImages.length] ?? fallbackImages[0]],
    metafields: {},
    priceCents,
    publishedAt: fallbackDate,
    seoDescription: null,
    seoTitle: null,
    shortDescription: "Produto de referência para visualização local sem banco de dados.",
    slug,
    status: ProductStatus.ACTIVE,
    tags: ["novo", "tema-legado"],
    title,
    updatedAt: fallbackDate,
    variants: [
      {
        barcode: null,
        compareAtPriceCents: priceCents + 1200,
        createdAt: fallbackDate,
        id: `${id}-variant-preto-p`,
        heightCm: 3,
        isActive: true,
        lengthCm: 30,
        optionValues: { Cor: "Preto", Tamanho: "P" },
        priceCents,
        productId: id,
        reservedQuantity: 0,
        shippingLeadTimeDays: 10,
        sku: `${id.toUpperCase()}-P`,
        stockQuantity: 12,
        title: "Preto / P",
        updatedAt: fallbackDate,
        weightGrams: 180,
        widthCm: 25
      },
      {
        barcode: null,
        compareAtPriceCents: priceCents + 1200,
        createdAt: fallbackDate,
        id: `${id}-variant-preto-m`,
        heightCm: 3,
        isActive: true,
        lengthCm: 30,
        optionValues: { Cor: "Preto", Tamanho: "M" },
        priceCents,
        productId: id,
        reservedQuantity: 0,
        shippingLeadTimeDays: 10,
        sku: `${id.toUpperCase()}-M`,
        stockQuantity: 10,
        title: "Preto / M",
        updatedAt: fallbackDate,
        weightGrams: 190,
        widthCm: 25
      }
    ]
  };
});

export function shouldUseCatalogFallback(error: unknown): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);

  return message.includes("Can't reach database server") || message.includes("P1001");
}
