"use client";

import Image from "next/image";
import Link from "next/link";

import { formatCurrency } from "@/lib/format";

import { useFavorites } from "./favorite-button";

export function FavoritesClient(): React.ReactElement {
  const favorites = useFavorites();

  if (favorites.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-black text-black">Sua lista de favoritos está vazia.</p>
        <Link className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-black text-white" href="/produtos">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {favorites.map((product) => (
        <Link className="rounded-lg bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href={`/produtos/${product.slug}`} key={product.id}>
          <div className="relative aspect-square overflow-hidden rounded-md bg-[#f7f7f7]">
            {product.imageUrl ? (
              <Image alt={product.title} className="object-cover" fill sizes="(min-width: 1024px) 25vw, 50vw" src={product.imageUrl} />
            ) : null}
          </div>
          <h2 className="mt-4 line-clamp-2 min-h-[44px] text-base font-black text-black">{product.title}</h2>
          <p className="mt-3 text-xl font-black text-primary">{formatCurrency(product.priceCents)}</p>
        </Link>
      ))}
    </div>
  );
}
