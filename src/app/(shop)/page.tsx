import Image from "next/image";
import Link from "next/link";

import { AutoCarousel } from "@/components/shop/auto-carousel";
import { ShopTrustStrip } from "@/components/shop/shop-trust-strip";
import { ProductCard } from "@/features/catalog/components/product-card";
import { PublicOffersSection } from "@/features/offers/components/public-offers-section";
import { getPublicProducts } from "@/lib/catalog/queries";
import { getPublicOffers } from "@/lib/offers/queries";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

const storefrontSections = [
  { title: "Novidades", href: "/produtos?ordem=recentes" },
  { title: "Nossos Produtos", href: "/produtos" },
  { title: "Mais Vendidos", href: "/produtos?ordem=maior-valor" }
];

export default async function ShopHomePage(): Promise<React.ReactElement> {
  const [offers, products, theme] = await Promise.all([
    getPublicOffers(),
    getPublicProducts({ sort: "recentes" }),
    getStorefrontTheme()
  ]);
  const featuredProducts = products.filter((product) => !product.compareAtPriceCents).slice(0, 10);

  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      <h1 className="sr-only">NerdLingoLab</h1>
      <section className="overflow-hidden bg-primary">
        <AutoCarousel
          className="bg-primary"
          items={theme.heroSlides}
          sizes="100vw"
          slideClassName="relative aspect-[2048/628] w-full"
        />
      </section>

      <section className="bg-white px-5 py-5">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-black">Produtos geek com cupons</h2>
            <p className="mt-1 text-sm font-semibold text-[#677279]">Loja geek com recompensas e Carrinho inteligente</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-black text-white" href="/produtos">
              Ver produtos
            </Link>
            <Link className="inline-flex h-10 items-center rounded-lg border px-5 text-sm font-black text-primary" href="/programa-de-fidelidade">
              Ver Nerdcoins
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 w-full max-w-[1360px] px-5">
        <ShopTrustStrip />
      </section>

      <div className="mx-auto w-full max-w-[1360px] px-5 py-12">
        <section className="mb-14">
          <AutoCarousel
            className="rounded-lg bg-white shadow-sm"
            items={theme.promoSlides}
            sizes="(min-width: 1024px) 560px, 100vw"
            slideClassName="relative aspect-square w-full md:aspect-[16/7]"
          />
        </section>

        {storefrontSections.map((section, sectionIndex) => (
          <section className="mb-14" key={section.title}>
            <div className="mb-7 flex items-end justify-between gap-4">
              <h2 className="relative pb-3 text-3xl font-medium text-black after:absolute after:bottom-0 after:left-0 after:h-1 after:w-[120px] after:rounded-full after:bg-primary">
                {section.title}
              </h2>
              <Link className="text-sm font-bold text-primary hover:underline" href={section.href}>
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {featuredProducts.slice(sectionIndex, sectionIndex + 6).map((product, productIndex) => (
                <ProductCard
                  imagePriority={sectionIndex === 0 && productIndex < 4}
                  key={`${section.title}-${product.id}`}
                  product={product}
                />
              ))}
            </div>
          </section>
        ))}

        <PublicOffersSection coupons={offers.coupons} products={offers.products} />

        <section id="sobre" className="grid gap-8 rounded-lg bg-white p-8 shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative min-h-[260px] overflow-hidden rounded-lg bg-[#f7f7f7]">
            <Image
              alt="Mascote NerdLingoLab"
              className="object-contain p-8"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              src="/brand-assets/SIMBOLO_NERDLINGOLAB_TESTE.webp"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-black text-black">
              Bem-vindo ao laboratório onde nerdice, idiomas e estilo se misturam!
            </h2>
            <p className="mt-5 text-base leading-7 text-[#677279]">
              A NerdLingoLab une moda, cultura pop e universo dos idiomas em produtos criativos,
              divertidos e cheios de personalidade.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
