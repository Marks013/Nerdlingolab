import Link from "next/link";
import type { Metadata } from "next";

import { PublicOffersSection } from "@/features/offers/components/public-offers-section";
import { getPublicOffers } from "@/lib/offers/queries";

export const metadata: Metadata = {
  alternates: {
    canonical: "/cupons"
  },
  description: "Cupons ativos da NerdLingoLab para economizar em camisetas, action figures e produtos geek.",
  title: "Cupons NerdLingoLab"
};

export const dynamic = "force-dynamic";

export default async function CouponsPage(): Promise<React.ReactElement> {
  const offers = await getPublicOffers();

  return (
    <main className="geek-page min-h-screen">
      <section className="mx-auto w-full max-w-[1360px] px-5 py-10">
        <p className="mb-6 text-sm text-[#677279]">Pagina inicial › Cupons</p>
        <div className="rounded-lg border border-primary/25 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase text-primary">Central de cupons NerdLingoLab</p>
          <h1 className="mt-2 text-balance text-4xl font-black tracking-normal text-black">
            Desconto bom não fica escondido.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-[#4f5d65]">
            Pegue um código ativo, coloque no carrinho e acompanhe o desconto antes de fechar o pagamento.
          </p>
        </div>
        {offers.coupons.length > 0 ? (
          <PublicOffersSection coupons={offers.coupons} products={[]} />
        ) : (
          <div className="manga-panel mt-8 rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black text-black">Nenhum cupom ativo no momento.</p>
            <Link className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-black text-white" href="/produtos">
              Ver produtos
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
