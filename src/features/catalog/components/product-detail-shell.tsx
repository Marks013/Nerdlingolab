"use client";

import { useMemo, useState } from "react";
import { Palette, Ruler, ShieldCheck, Star } from "lucide-react";

import { SafeImage as Image } from "@/components/media/safe-image";
import { FavoriteButton } from "@/features/catalog/components/favorite-button";
import {
  ProductPurchasePanel,
  type ProductVariantOption
} from "@/features/catalog/components/product-purchase-panel";
import { getProductBadgeClass, type ProductBadge } from "@/lib/catalog/badges";
import type { PaymentTerms } from "@/lib/payments/installments";
import { sanitizeRichTextHtml } from "@/lib/security/html";

interface ProductDetailShellProps {
  description: string;
  freeShippingThresholdCents: number;
  images: string[];
  loyaltyProgram: {
    campaign: {
      bonusPoints: number;
      id: string;
      name: string;
      pointsMultiplier: number;
    } | null;
    isEnabled: boolean;
    minRedeemPoints: number;
    pointsPerReal: number;
    redeemCentsPerPoint: number;
    tierMultiplierPercent: number;
  };
  paymentTerms: PaymentTerms;
  primaryImage: string | null;
  productBadges: ProductBadge[];
  productId: string;
  productSlug: string;
  productTitle: string;
  productUrl: string;
  reviewSummary: {
    averageRating: number;
    count: number;
  };
  variants: ProductVariantOption[];
}

export function ProductDetailShell({
  description,
  freeShippingThresholdCents,
  images,
  loyaltyProgram,
  paymentTerms,
  primaryImage,
  productBadges,
  productId,
  productSlug,
  productTitle,
  productUrl,
  reviewSummary,
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start">
        <div className="grid gap-5">
        <section className="manga-panel rounded-lg bg-white p-4 shadow-sm sm:p-7">
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

        <ProductDescription description={description} productTitle={productTitle} />
        </div>

        <section className="manga-panel rounded-lg bg-white p-5 shadow-sm sm:p-8 lg:sticky lg:top-5">
          <div className="flex flex-wrap items-center gap-2">
            {(productBadges.length > 0 ? productBadges : [{ label: "Produto disponível", tone: "orange" as const }]).map((badge) => (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${getProductBadgeClass(badge.tone)}`}
                key={badge.label}
              >
                {badge.label}
              </span>
            ))}
            <ProductRatingPill summary={reviewSummary} />
          </div>
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
            productUrl={productUrl}
            freeShippingThresholdCents={freeShippingThresholdCents}
            loyaltyProgram={loyaltyProgram}
            paymentTerms={paymentTerms}
            selectedVariantId={selectedVariant?.id ?? selectedVariantId}
            variants={variants}
          />
        </section>
      </div>

  );
}

function ProductRatingPill({
  summary
}: {
  summary: {
    averageRating: number;
    count: number;
  };
}): React.ReactElement {
  if (summary.count === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-primary/25 bg-[#fff7ed] px-3 py-1 text-xs font-black text-primary">
        <Star className="mr-1.5 size-3.5" />
        Seja o primeiro a avaliar
      </span>
    );
  }

  return (
    <a
      className="inline-flex items-center rounded-full border border-primary/25 bg-[#fff7ed] px-3 py-1 text-xs font-black text-primary transition hover:border-primary"
      href="#avaliacoes"
    >
      <Star className="mr-1.5 size-3.5 fill-current" />
      {summary.averageRating.toFixed(1)} · {summary.count} avaliação(ões)
    </a>
  );
}

function ProductDescription({
  description,
  productTitle
}: {
  description: string;
  productTitle: string;
}): React.ReactElement {
  const paragraphs = getDescriptionParagraphs(description);
  const hasRichHtml = /<[^>]+>/.test(description);

  return (
    <section className="manga-panel rounded-lg bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-primary">Detalhes com personalidade</p>
          <h2 className="mt-1 text-2xl font-medium text-black">Descrição</h2>
        </div>
        <span className="rounded-full border border-primary/25 bg-[#fff7ed] px-3 py-1 text-xs font-black text-primary">
          Curadoria NerdLingoLab
        </span>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-lg border border-primary/20 bg-[#fff7ed] p-4">
          <p className="text-pretty text-base font-semibold leading-7 text-[#3a2a1c]">
            {productTitle} chega para dar mais presença ao seu visual geek, com aquele toque divertido que combina com coleção, presente e uso no dia a dia.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <DescriptionHighlight icon={Palette} title="Visual" text="Arte com atitude para deixar o look menos óbvio." />
          <DescriptionHighlight icon={Ruler} title="Escolha certa" text="Confira cor, tamanho e variação antes de finalizar." />
          <DescriptionHighlight icon={ShieldCheck} title="Experiência" text="Pedido acompanhado, checkout seguro e suporte por perto." />
        </div>

        {hasRichHtml ? (
          <div
            className="text-base leading-8 text-[#4f5d65] [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_iframe]:my-5 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-lg [&_img]:my-5 [&_img]:max-h-[620px] [&_img]:rounded-lg [&_img]:object-contain [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_strong]:font-bold [&_ul]:ml-6 [&_ul]:list-disc [&_video]:my-5 [&_video]:w-full [&_video]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(description) }}
          />
        ) : (
          <div className="rounded-lg border bg-white p-4 text-base leading-8 text-[#4f5d65]">
            {paragraphs.map((paragraph, index) => (
              <p className="text-pretty [&:not(:last-child)]:mb-4" key={`${paragraph}-${index}`}>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DescriptionHighlight({
  icon: Icon,
  text,
  title
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  title: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-primary/15 bg-white p-4">
      <Icon className="size-5 text-primary" />
      <h3 className="mt-2 font-black text-[#1c1c1c]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#4f5d65]">{text}</p>
    </div>
  );
}

function getDescriptionParagraphs(description: string): string[] {
  const normalized = description
    .replace(/\r/g, "")
    .split(/\n{2,}|\n|(?<=\.)\s+(?=[A-Z])/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : ["Produto selecionado pela NerdLingoLab para quem gosta de comprar com estilo, segurança e personalidade."];
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
  const semanticColor = getOptionEntries(variant)
    .map(([, value]) => value)
    .find(isColorValue);

  return semanticColor ?? getOptionValue(variant, "Cor") ?? getOptionValue(variant, "Color");
}

function getOptionValue(variant: ProductVariantOption, key: string): string | null {
  const targetKey = normalizeOptionKey(key);
  const entry = getOptionEntries(variant).find(
    ([optionKey, value]) => normalizeOptionKey(optionKey) === targetKey && !isGenderValue(value)
  );

  return entry?.[1] ?? null;
}

function getOptionEntries(variant: ProductVariantOption): Array<[string, string]> {
  if (!variant.optionValues || typeof variant.optionValues !== "object" || Array.isArray(variant.optionValues)) {
    return [];
  }

  return Object.entries(variant.optionValues as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
    .map(([optionKey, value]) => [optionKey, value.trim()]);
}

function normalizeOptionKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isGenderValue(value: string): boolean {
  return ["feminino", "feminina", "mulher", "masculino", "masculina", "homem", "unissex"].includes(
    normalizeOptionKey(value)
  );
}

function isColorValue(value: string): boolean {
  return [
    "amarelo",
    "azul",
    "bege",
    "branco",
    "caqui",
    "cinza",
    "creme",
    "laranja",
    "marrom",
    "off white",
    "preto",
    "rosa",
    "roxo",
    "verde",
    "vermelho",
    "vinho"
  ].includes(normalizeOptionKey(value).replace(/\s+/g, " "));
}
