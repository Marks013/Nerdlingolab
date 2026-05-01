import type { Metadata } from "next";

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
        <p className="mb-6 text-sm text-[#677279]">Pagina inicial › Favoritos</p>
        <div className="mb-8 text-center">
          <h1 className="geek-title text-4xl font-medium tracking-normal text-black">Favoritos</h1>
        </div>
        <FavoritesClient />
      </section>
    </main>
  );
}
