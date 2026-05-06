import type { Metadata } from "next";
import { Heart, Sparkles } from "lucide-react";

import { FavoritesClient } from "@/features/catalog/components/favorites-client";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Favoritos"
};

export default function FavoritesPage(): React.ReactElement {
  return (
    <main className="geek-page min-h-screen">
      <section className="mx-auto w-full max-w-[1360px] px-5 py-10">
        <p className="mb-6 text-sm text-[#677279]">Página inicial › Favoritos</p>
        <div className="mb-8 overflow-hidden rounded-lg border border-primary/25 bg-white p-6 shadow-sm sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-primary">
            <Sparkles className="size-3.5" />
            Sua vitrine pessoal
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="geek-title text-balance text-4xl font-medium tracking-normal text-black">Favoritos</h1>
              <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-[#4f5d65]">
                Guarde os produtos que chamaram sua atenção, compare depois e volte direto para o carrinho quando bater aquela certeza.
              </p>
            </div>
            <span className="hidden size-16 items-center justify-center rounded-lg border border-primary/20 bg-[#fff7ed] text-primary lg:flex">
              <Heart className="size-8" />
            </span>
          </div>
        </div>
        <FavoritesClient />
      </section>
    </main>
  );
}
