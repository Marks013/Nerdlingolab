import type { Metadata } from "next";

import { ProductCard } from "@/features/catalog/components/product-card";
import { getPublicOffers } from "@/lib/offers/queries";

export const metadata: Metadata = {
  alternates: {
    canonical: "/ofertas"
  },
  description: "Produtos geek em oferta na NerdLingoLab, com camisetas, colecionáveis e novidades selecionadas.",
  title: "Ofertas NerdLingoLab"
};

export const dynamic = "force-dynamic";

export default async function OffersPage(): Promise<React.ReactElement> {
  const offers = await getPublicOffers();

  return (
    <main className="geek-page min-h-screen">
      <section className="mx-auto w-full max-w-[1360px] px-5 py-10">
        <p className="mb-6 text-sm text-[#677279]">Pagina inicial › Ofertas</p>
        <div className="mb-8 text-center">
          <h1 className="geek-title text-4xl font-medium tracking-normal text-black">Produtos em oferta</h1>
        </div>
        {offers.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {offers.products.map((product, productIndex) => (
              <ProductCard imagePriority={productIndex < 4} key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="manga-panel rounded-lg bg-white p-8 text-center text-lg font-semibold text-black shadow-sm">
            Nenhum produto em oferta no momento.
          </div>
        )}
      </section>
    </main>
  );
}
