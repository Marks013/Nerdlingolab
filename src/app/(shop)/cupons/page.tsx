import Link from "next/link";

import { PublicOffersSection } from "@/features/offers/components/public-offers-section";
import { getPublicOffers } from "@/lib/offers/queries";

export const dynamic = "force-dynamic";

export default async function CouponsPage(): Promise<React.ReactElement> {
  const offers = await getPublicOffers();

  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      <section className="mx-auto w-full max-w-[1360px] px-5 py-10">
        <p className="mb-6 text-sm text-[#677279]">Pagina inicial › Cupons</p>
        <h1 className="text-center text-4xl font-medium tracking-normal text-black">Cupons disponíveis</h1>
        {offers.coupons.length > 0 ? (
          <PublicOffersSection coupons={offers.coupons} products={[]} />
        ) : (
          <div className="mt-8 rounded-lg bg-white p-8 text-center shadow-sm">
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
