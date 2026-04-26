"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { FavoriteButton } from "@/features/catalog/components/favorite-button";
import {
  ProductPurchasePanel,
  type ProductVariantOption
} from "@/features/catalog/components/product-purchase-panel";

interface ProductDetailShellProps {
  description: string;
  images: string[];
  primaryImage: string | null;
  productId: string;
  productSlug: string;
  productTitle: string;
  variants: ProductVariantOption[];
}

export function ProductDetailShell({
  description,
  images,
  primaryImage,
  productId,
  productSlug,
  productTitle,
  variants
}: ProductDetailShellProps): React.ReactElement {
  const initialVariant = getInitialVariant(variants);
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? "");
  const [selectedImageUrl, setSelectedImageUrl] = useState(
    getVariantDisplayImage(initialVariant, variants) ?? primaryImage ?? images[0] ?? null
  );
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const activeImageUrl = selectedImageUrl ?? selectedVariant?.imageUrl ?? primaryImage;
  const galleryImages = useMemo(
    () => unique([activeImageUrl, ...variants.map((variant) => variant.imageUrl), ...images]),
    [activeImageUrl, images, variants]
  );

  function handleVariantSelect(variantId: string): void {
    const nextVariant = variants.find((variant) => variant.id === variantId);

    setSelectedVariantId(variantId);

    setSelectedImageUrl(getVariantDisplayImage(nextVariant, variants) ?? primaryImage ?? images[0] ?? null);
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg bg-white p-4 shadow-sm sm:p-7">
          <div className={galleryImages.length > 1 ? "grid gap-5 md:grid-cols-[72px_1fr]" : "grid gap-5"}>
            {galleryImages.length > 1 ? (
              <div className="grid grid-cols-5 gap-3 md:grid-cols-1 md:content-start md:gap-4">
                {galleryImages.slice(0, 8).map((imageUrl, imageIndex) => (
                  <button
                    aria-label={`Ver imagem ${imageIndex + 1} de ${productTitle}`}
                    className={[
                      "relative aspect-square overflow-hidden rounded-lg border-2 bg-[#f7f7f7] transition",
                      activeImageUrl === imageUrl ? "border-primary" : "border-primary/15 hover:border-primary/50"
                    ].join(" ")}
                    key={imageUrl}
                    onClick={() => setSelectedImageUrl(imageUrl)}
                    type="button"
                  >
                    <Image
                      alt={`Miniatura ${imageIndex + 1} de ${productTitle}`}
                      className="object-cover"
                      fill
                      sizes="72px"
                      src={imageUrl}
                    />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="relative min-h-[360px] overflow-hidden rounded-lg bg-[#f7f7f7] sm:min-h-[520px]">
              {activeImageUrl ? (
                <Image
                  alt={`Imagem principal de ${productTitle}`}
                  className="object-contain p-4"
                  fill
                  loading="eager"
                  priority
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  src={activeImageUrl}
                />
              ) : null}
              <span className="absolute right-4 top-4">
                <FavoriteButton
                  product={{
                    id: productId,
                    imageUrl: activeImageUrl,
                    priceCents: selectedVariant?.priceCents ?? 0,
                    slug: productSlug,
                    title: productTitle
                  }}
                />
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm text-[#4f5d65]">Novo | Produto disponível</p>
          <h1 className="mt-2 text-2xl font-medium leading-tight text-black sm:text-3xl">{productTitle}</h1>
          <p className="mt-4 inline-flex rounded bg-primary px-3 py-1 text-sm font-bold text-white">
            Vendido e entregue pela Nerdlingolab©
          </p>
          <ProductPurchasePanel
            imageUrl={activeImageUrl}
            onVariantSelect={handleVariantSelect}
            productId={productId}
            productSlug={productSlug}
            productTitle={productTitle}
            selectedVariantId={selectedVariant?.id ?? selectedVariantId}
            variants={variants}
          />
        </section>
      </div>

      <section className="mt-8 rounded-lg bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-2xl font-medium text-black">Descrição</h2>
        <div className="mt-6 whitespace-pre-line text-base leading-8 text-[#4f5d65]">{description}</div>
      </section>
    </>
  );
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getInitialVariant(variants: ProductVariantOption[]): ProductVariantOption | undefined {
  return (
    variants.find((variant) => variant.availableStock > 0 && Boolean(getVariantDisplayImage(variant, variants))) ??
    variants.find((variant) => variant.availableStock > 0) ??
    variants[0]
  );
}

function getVariantDisplayImage(
  variant: ProductVariantOption | undefined,
  variants: ProductVariantOption[]
): string | null {
  if (!variant) {
    return null;
  }

  if (variant.imageUrl) {
    return variant.imageUrl;
  }

  const color = getVariantColor(variant);

  if (!color) {
    return null;
  }

  return variants.find((candidate) => candidate.imageUrl && getVariantColor(candidate) === color)?.imageUrl ?? null;
}

function getVariantColor(variant: ProductVariantOption): string | null {
  return getOptionValue(variant, "Cor") ?? getOptionValue(variant, "Color");
}

function getOptionValue(variant: ProductVariantOption, key: string): string | null {
  if (!variant.optionValues || typeof variant.optionValues !== "object" || Array.isArray(variant.optionValues)) {
    return null;
  }

  const targetKey = normalizeOptionKey(key);
  const entry = Object.entries(variant.optionValues as Record<string, unknown>).find(
    ([optionKey]) => normalizeOptionKey(optionKey) === targetKey
  );
  const value = entry?.[1];

  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeOptionKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
