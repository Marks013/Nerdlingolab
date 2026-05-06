import Link from "next/link";
import type { Metadata } from "next";
import { Coins, Gift, Sparkles, TicketPercent } from "lucide-react";

import { SafeImage } from "@/components/media/safe-image";
import { PublicOffersSection } from "@/features/offers/components/public-offers-section";
import { auth } from "@/lib/auth";
import { getPublicOffers } from "@/lib/offers/queries";

export const metadata: Metadata = {
  alternates: {
    canonical: "/cupons"
  },
  description: "Cupons ativos da NerdLingoLab para economizar em camisetas, action figures e produtos geek.",
  title: "Cupons"
};

export const dynamic = "force-dynamic";

export default async function CouponsPage(): Promise<React.ReactElement> {
  const session = await auth();
  const offers = await getPublicOffers({
    couponLimit: 12,
    onlyHighlightedCoupons: false,
    userId: session?.user?.id
  });

  return (
    <main className="geek-page min-h-screen">
      <section className="mx-auto w-full max-w-[1360px] px-5 py-10">
        <p className="mb-6 text-sm text-[#677279]">Página inicial › Cupons</p>
        <div className="rounded-lg border border-primary/25 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase text-primary">Central de cupons NerdLingoLab</p>
          <h1 className="mt-2 text-balance text-4xl font-black tracking-normal text-black">
            Desconto bom não fica escondido.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-[#4f5d65]">
            Pegue um código ativo, coloque no carrinho e acompanhe o desconto antes de fechar o pagamento.
          </p>
        </div>
        <section className="mt-6 overflow-hidden rounded-lg border border-primary/25 bg-[#fff7ed] shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[220px_1fr_320px] lg:items-center">
            <div className="flex justify-center lg:justify-start">
              <div className="relative size-36 rounded-lg border border-primary/20 bg-white p-4 shadow-sm">
                <SafeImage
                  alt="Logo NerdCoins"
                  className="object-contain p-3"
                  fill
                  sizes="144px"
                  src="/brand-assets/nerd-icon-nerdcoins.webp"
                />
              </div>
            </div>
            <div>
              <p className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-primary">
                <Sparkles className="mr-1.5 size-3.5" />
                Clube NerdCoins
              </p>
              <h2 className="mt-3 text-balance text-3xl font-black tracking-normal text-black">
                Cupom agora, NerdCoins nas próximas compras.
              </h2>
              <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-[#4f5d65]">
                Além dos cupons públicos, o programa NerdCoins transforma compras aprovadas, indicações e recompensas em benefícios para usar depois.
              </p>
            </div>
            <div className="grid gap-3 rounded-lg border border-primary/20 bg-white p-4">
              <NerdCoinsPoint icon={TicketPercent} text="Use cupons ativos no carrinho." />
              <NerdCoinsPoint icon={Coins} text="Acumule pontos em compras aprovadas." />
              <NerdCoinsPoint icon={Gift} text="Crie sua conta e acompanhe seus benefícios." />
              <Link
                className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-black text-white transition hover:bg-primary/90"
                href="/programa-de-fidelidade"
              >
                Conhecer NerdCoins
              </Link>
            </div>
          </div>
        </section>
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

function NerdCoinsPoint({
  icon: Icon,
  text
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-[#3a2a1c]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff7ed] text-primary">
        <Icon className="size-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
