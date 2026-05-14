import Link from "next/link";
import { Coins } from "lucide-react";

import { SafeImage as Image } from "@/components/media/safe-image";
import { getPrimaryImageUrl } from "@/features/catalog/image-utils";
import { getProductBadgeClass, getProductBadges } from "@/lib/catalog/badges";
import { formatCurrency } from "@/lib/format";
import type { ProductListItem } from "@/lib/catalog/queries";

import { FavoriteButton } from "./favorite-button";

interface ProductCardProps {
  imagePriority?: boolean;
  nerdcoinsEstimate?: number;
  product: ProductListItem;
  variant?: "grid" | "list";
}

export function ProductCard({ imagePriority = false, nerdcoinsEstimate = 0, product, variant = "grid" }: ProductCardProps): React.ReactElement {
  const imageUrl = getPrimaryImageUrl(product.images);
  const hasDiscount = Boolean(product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents);
  const badges = getProductBadges(product);
  const categoryName = product.category?.name ?? product.categories[0]?.category.name ?? "Produto NerdLingoLab";
  const showNerdcoinsBadge = nerdcoinsEstimate > 0;

  if (variant === "list") {
    return (
      <article className="manga-panel group relative overflow-hidden rounded-lg bg-white shadow-sm transition-colors duration-150 hover:border-primary/45">
        <div className="grid min-h-[112px] grid-cols-[88px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[104px_minmax(0,1fr)_minmax(150px,180px)] sm:items-center sm:gap-4 sm:p-4">
          <Link className="relative aspect-square w-[88px] overflow-hidden rounded-md bg-[#f7f7f7] sm:w-[104px]" href={`/produtos/${product.slug}`}>
            {imageUrl ? (
              <Image
                alt={`Imagem de ${product.title}`}
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                fill
                loading={imagePriority ? "eager" : undefined}
                preload={imagePriority}
                sizes="104px"
                src={imageUrl}
              />
            ) : null}
          </Link>

          <Link className="min-w-0 py-1" href={`/produtos/${product.slug}`}>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {badges.slice(0, 2).map((badge) => (
                <span className={getProductBadgeClass(badge.tone)} key={badge.label}>
                  {badge.label}
                </span>
              ))}
            </div>
            <h3 className="line-clamp-2 text-sm font-black leading-snug text-black sm:text-base">
              {product.title}
            </h3>
            <p className="mt-1 truncate text-xs font-semibold text-[#677279]">
              {categoryName}
            </p>
          </Link>

          <div className="col-span-2 flex items-center justify-between gap-3 border-t border-primary/10 pt-3 sm:col-span-1 sm:border-t-0 sm:pt-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-[#4f5d65]">Preço</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <p className="text-lg font-black leading-none text-primary sm:text-xl">{formatCurrency(product.priceCents)}</p>
              {hasDiscount ? (
                <p className="text-xs font-semibold text-[#677279] line-through">
                  {formatCurrency(product.compareAtPriceCents ?? 0)}
                </p>
              ) : null}
              </div>
              {showNerdcoinsBadge ? <NerdcoinsBadge points={nerdcoinsEstimate} compact /> : null}
            </div>
            <FavoriteButton
              product={{
                id: product.id,
                imageUrl,
                priceCents: product.priceCents,
                slug: product.slug,
                title: product.title
              }}
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="manga-panel group relative flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-colors duration-150 hover:border-primary/45">
      <Link className="flex h-full flex-col" href={`/produtos/${product.slug}`}>
        <div className="relative aspect-[4/4.1] overflow-hidden bg-[#f7f7f7]">
          {imageUrl ? (
            <Image
              alt={`Imagem de ${product.title}`}
              className="object-cover transition duration-300 group-hover:scale-[1.035]"
              fill
              loading={imagePriority ? "eager" : undefined}
              preload={imagePriority}
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              src={imageUrl}
            />
          ) : null}
          {badges.length > 0 ? (
            <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5 sm:left-4">
              {badges.slice(0, 2).map((badge) => (
                <span className={`inline-flex h-7 items-center rounded-full px-3 text-[11px] font-black uppercase tracking-normal shadow-sm ${getProductBadgeClass(badge.tone)}`} key={badge.label}>
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
          <h3 className="line-clamp-2 min-h-[42px] text-sm font-black leading-snug text-black sm:text-base">
            {product.title}
          </h3>
          <div className="mt-auto pt-4">
            <p className="text-xs font-semibold uppercase text-[#4f5d65]">Preço</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p className="text-xl font-black leading-none text-primary sm:text-2xl">{formatCurrency(product.priceCents)}</p>
              {hasDiscount ? (
                <p className="text-sm font-semibold text-[#677279] line-through">
                  {formatCurrency(product.compareAtPriceCents ?? 0)}
                </p>
              ) : null}
            </div>
            {showNerdcoinsBadge ? <NerdcoinsBadge points={nerdcoinsEstimate} /> : null}
          </div>
        </div>
      </Link>
      <span className="absolute right-3 top-3 z-10">
        <FavoriteButton
          product={{
            id: product.id,
            imageUrl,
            priceCents: product.priceCents,
            slug: product.slug,
            title: product.title
          }}
        />
      </span>
    </article>
  );
}

function NerdcoinsBadge({ compact = false, points }: { compact?: boolean; points: number }): React.ReactElement {
  return (
    <span
      className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-orange-50 px-2.5 py-1 font-black text-primary shadow-sm ${
        compact ? "text-[11px]" : "text-xs"
      }`}
      title={`Esta compra pode render ${points} NerdCoins`}
    >
      <Coins className="size-3.5 shrink-0" />
      <span className="truncate">+{points} NerdCoins</span>
    </span>
  );
}
