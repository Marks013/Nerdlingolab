import Image from "next/image";
import Link from "next/link";

import { getPrimaryImageUrl } from "@/features/catalog/image-utils";
import { formatCurrency } from "@/lib/format";
import type { ProductListItem } from "@/lib/catalog/queries";

import { FavoriteButton } from "./favorite-button";

interface ProductCardProps {
  imagePriority?: boolean;
  product: ProductListItem;
}

export function ProductCard({ imagePriority = false, product }: ProductCardProps): React.ReactElement {
  const imageUrl = getPrimaryImageUrl(product.images);
  const isRemoteImage = Boolean(imageUrl?.startsWith("http://") || imageUrl?.startsWith("https://"));
  const hasDiscount = Boolean(product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
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
              unoptimized={isRemoteImage}
            />
          ) : null}
          <span className="absolute left-3 top-3 inline-flex h-7 items-center rounded-full bg-[#237f34] px-3 text-[11px] font-black uppercase tracking-normal text-white shadow-sm sm:left-4">
            {hasDiscount ? "Oferta" : "Novo"}
          </span>
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
