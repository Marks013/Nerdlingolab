import Link from "next/link";
import type { Metadata } from "next";

import { AutoCarousel } from "@/components/shop/auto-carousel";
import { SafeImage as Image } from "@/components/media/safe-image";
import { ShopTrustStrip } from "@/components/shop/shop-trust-strip";
import { ProductCard } from "@/features/catalog/components/product-card";
import { PublicOffersSection } from "@/features/offers/components/public-offers-section";
import {
  getPublicBestSellingProducts,
  getPublicNewProducts,
  getPublicProducts,
  type ProductListItem
} from "@/lib/catalog/queries";
import { getPublicOffers } from "@/lib/offers/queries";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NerdLingoLab",
  description: "Produtos geek, camisetas, oversized, action figures, cupons e NerdCoins em uma loja divertida e segura.",
  alternates: {
    canonical: "/"
  }
};

export default async function ShopHomePage(): Promise<React.ReactElement> {
  const [bestSellingProducts, newProducts, offers, products, theme] = await Promise.all([
    getPublicBestSellingProducts(6),
    getPublicNewProducts(6),
    getPublicOffers(),
    getPublicProducts({ sort: "recentes" }),
    getStorefrontTheme()
  ]);
  const storefrontSections = [
    {
      title: "Novidades",
      href: "/produtos?ordem=recentes#lista-produtos",
      products: newProducts.slice(0, 6),
      emptyMessage: "Nenhum produto entrou na regra de Novo dos últimos 30 dias."
    },
    { title: "Nossos Produtos", href: "/produtos#lista-produtos", products: products.slice(0, 6) },
    {
      title: "Mais Vendidos",
      href: "/produtos?ordem=mais-vendidos#lista-produtos",
      products: bestSellingProducts,
      emptyMessage: "O ranking aparece assim que houver pedidos pagos com estes produtos."
    }
  ];

  return (
    <main className="geek-page min-h-screen">
      <h1 className="sr-only">NerdLingoLab</h1>
      <section className="overflow-hidden bg-primary">
        <AutoCarousel
            className="bg-primary"
            items={theme.heroSlides}
            sizes="100vw"
            slideClassName="relative aspect-[1640/2048] w-full md:aspect-[2048/628]"
        />
      </section>

      <section className="relative z-10 mx-auto mt-5 w-full max-w-[1360px] px-5">
        <ShopTrustStrip />
      </section>

      <div className="mx-auto w-full max-w-[1360px] px-5 py-12">
        <section className="mb-14">
          <AutoCarousel
            className="overflow-hidden rounded-lg bg-primary shadow-sm"
            items={theme.promoSlides}
            sizes="(min-width: 1024px) 1360px, 100vw"
            slideClassName="relative aspect-[1640/2048] w-full md:aspect-[2048/628]"
          />
        </section>

        {storefrontSections.map((section, sectionIndex) => (
          <ProductShelf
            href={section.href}
            imagePriority={sectionIndex === 0}
            key={section.title}
            emptyMessage={section.emptyMessage}
            products={section.products}
            title={section.title}
          />
        ))}

        <PublicOffersSection coupons={offers.coupons} products={offers.products} />

        <section id="sobre" className="manga-panel grid gap-8 rounded-lg bg-white p-8 shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
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

function ProductShelf({
  emptyMessage,
  href,
  imagePriority,
  products,
  title
}: {
  emptyMessage?: string;
  href: string;
  imagePriority?: boolean;
  products: ProductListItem[];
  title: string;
}): React.ReactElement | null {
  if (products.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <section className="mb-14" id={title === "Mais Vendidos" ? "mais-vendidos" : undefined}>
      <div className="mb-7 flex items-end justify-between gap-4">
        <h2 className="relative pb-3 text-3xl font-medium text-black after:absolute after:bottom-0 after:left-0 after:h-1 after:w-[120px] after:rounded-full after:bg-primary">
          {title}
        </h2>
        <Link className="text-sm font-bold text-primary hover:underline" href={href}>
          Ver todos
        </Link>
      </div>
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((product, productIndex) => (
            <ProductCard
              imagePriority={Boolean(imagePriority && productIndex < 4)}
              key={`${title}-${product.id}`}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="manga-panel rounded-lg bg-white p-5 text-sm font-semibold text-[#4f5d65] shadow-sm">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
