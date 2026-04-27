"use client";

import { Heart, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";

import { SafeImage as Image } from "@/components/media/safe-image";
import { formatCurrency } from "@/lib/format";

import { useFavorites } from "./favorite-button";

export function FavoritesClient(): React.ReactElement {
  const favorites = useFavorites();

  if (favorites.length === 0) {
    return (
      <div className="manga-panel rounded-lg bg-white p-8 text-center shadow-sm">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="h-8 w-8" />
        </span>
        <p className="mt-5 text-xl font-black text-black">Sua lista de favoritos está pronta para começar.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#677279]">
          Salve camisetas, coleções e ofertas para comparar depois. Os melhores achados ficam a um clique do carrinho.
        </p>
        <Link className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white" href="/produtos">
          <ShoppingBag className="h-4 w-4" />
          Explorar produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="manga-panel rounded-lg bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-primary">
            <Sparkles className="h-4 w-4" />
            Lista de desejo ativa
          </p>
          <h2 className="mt-2 text-2xl font-black text-black">{favorites.length} favorito(s) salvos</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#677279]">
            Compare preços, escolha sua estampa e finalize antes que o estoque acabe.
          </p>
        </div>
        <Link className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-primary px-5 text-sm font-black text-primary transition hover:bg-primary hover:text-white sm:mt-0" href="/produtos">
          Ver mais opções
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {favorites.map((product) => (
          <article className="motion-lift manga-panel overflow-hidden rounded-lg bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={product.id}>
            <Link href={`/produtos/${product.slug}`}>
              <div className="relative aspect-square overflow-hidden bg-[#f7f7f7]">
                {product.imageUrl ? (
                  <Image
                    alt={product.title}
                    className="object-cover transition duration-300 hover:scale-105"
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    src={product.imageUrl}
                  />
                ) : null}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-primary shadow-sm">
                  <Heart className="h-3.5 w-3.5 fill-primary" />
                  Salvo
                </span>
              </div>
            </Link>
            <div className="grid gap-3 p-4">
              <Link className="line-clamp-2 min-h-[44px] text-base font-black text-black hover:text-primary" href={`/produtos/${product.slug}`}>
                {product.title}
              </Link>
              <p className="text-xl font-black text-primary">{formatCurrency(product.priceCents)}</p>
              <div className="grid gap-2">
                <Link className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-black text-white transition hover:bg-primary/90" href={`/produtos/${product.slug}`}>
                  Comprar agora
                </Link>
                <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-primary/30 px-4 text-sm font-black text-primary transition hover:border-primary" href={`/produtos/${product.slug}`}>
                  Ver detalhes
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
