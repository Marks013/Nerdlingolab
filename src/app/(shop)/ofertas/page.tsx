import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, PackageCheck, Percent, ShieldCheck, TicketPercent, Truck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/features/catalog/components/product-card";
import { PublicOffersSection } from "@/features/offers/components/public-offers-section";
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
        <p className="mb-6 text-sm text-[#677279]">Página inicial › Ofertas</p>
        <div className="mb-8 overflow-hidden rounded-lg border border-primary/25 bg-white shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-black uppercase text-primary">
                <Flame className="size-3.5" />
                Central de ofertas NerdLingoLab
              </p>
              <h1 className="mt-4 text-balance text-4xl font-black tracking-normal text-black lg:text-5xl">
                Descontos com cara de campanha, não de prateleira esquecida.
              </h1>
              <p className="mt-4 max-w-3xl text-pretty text-base leading-7 text-[#4f5d65]">
                Aqui entram promoções de temporada, cupons públicos, frete especial e produtos com preço comparativo. Tudo pensado para deixar a decisão de compra mais fácil.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="#produtos-em-oferta">
                    Ver ofertas ativas
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild className="border-primary/50 bg-white text-primary hover:bg-primary/10" variant="outline">
                  <Link href="/cupons">Ver cupons</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border border-orange-100 bg-[#fff7ed] p-4">
              <CampaignPreview icon={Percent} title="Dia do Consumidor" text="Cupom percentual, mínimo inteligente e chamada de confiança." />
              <CampaignPreview icon={Flame} title="Black Friday" text="Campanha agressiva, escura, direta e com senso de oportunidade." />
              <CampaignPreview icon={Truck} title="Frete especial" text="Frete grátis ou subsidiado para destravar carrinhos indecisos." />
            </div>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <OfferPillar icon={TicketPercent} title="Cupom copiável" text="Cliente pega o código sem fricção e volta para o carrinho." />
          <OfferPillar icon={PackageCheck} title="Produto com contexto" text="Ofertas aparecem com preço comparativo e vitrine dedicada." />
          <OfferPillar icon={ShieldCheck} title="Compra segura" text="Checkout segue protegido pelo Mercado Pago e status no pedido." />
          <OfferPillar icon={Zap} title="Campanhas rápidas" text="Presets no admin ajudam a criar ações sazonais em poucos cliques." />
        </section>

        <PublicOffersSection coupons={offers.coupons} products={[]} />

        <section id="produtos-em-oferta" className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-primary">Produtos com preço especial</p>
              <h2 className="mt-1 text-balance text-3xl font-black tracking-normal text-black">Vitrine pronta para vender</h2>
            </div>
            <Button asChild className="border-primary/50 bg-white text-primary hover:bg-primary/10" variant="outline">
              <Link href="/produtos">Ver todos os produtos</Link>
            </Button>
          </div>
        {offers.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {offers.products.map((product, productIndex) => (
              <ProductCard imagePriority={productIndex < 4} key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="manga-panel rounded-lg bg-white p-8 shadow-sm">
            <div className="mx-auto max-w-2xl text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-lg border border-primary/20 bg-[#fff7ed] text-primary">
                <Flame className="size-8" />
              </span>
              <h3 className="mt-5 text-balance text-2xl font-black text-black">Nenhum produto com preço riscado agora.</h3>
              <p className="mt-3 text-pretty text-sm leading-6 text-[#4f5d65]">
                Mesmo sem itens ativos, a página continua vendendo: cupons, campanhas de frete e ações sazonais mantêm a vitrine pronta para a próxima leva.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild className="bg-primary text-white hover:bg-primary/90">
                  <Link href="/cupons">Usar cupons ativos</Link>
                </Button>
                <Button asChild className="border-primary/50 bg-white text-primary hover:bg-primary/10" variant="outline">
                  <Link href="/produtos">Explorar catálogo</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
        </section>
      </section>
    </main>
  );
}

function CampaignPreview({
  icon: Icon,
  text,
  title
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  title: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 font-black text-black">
        <Icon className="size-5 text-primary" />
        {title}
      </p>
      <p className="mt-2 text-pretty text-sm leading-5 text-[#4f5d65]">{text}</p>
    </div>
  );
}

function OfferPillar({
  icon: Icon,
  text,
  title
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  title: string;
}): React.ReactElement {
  return (
    <article className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
      <span className="flex size-11 items-center justify-center rounded-lg bg-orange-50 text-primary">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 text-balance text-lg font-black text-black">{title}</h2>
      <p className="mt-2 text-pretty text-sm leading-6 text-[#4f5d65]">{text}</p>
    </article>
  );
}
