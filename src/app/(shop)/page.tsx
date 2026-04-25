import { Gift, Headphones, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicOffersSection } from "@/features/offers/components/public-offers-section";
import { getPublicOffers } from "@/lib/offers/queries";

const highlights = [
  {
    title: "Coleções nerd",
    description: "Produtos selecionados para quem gosta de cultura geek, jogos e tecnologia.",
    icon: ShoppingBag
  },
  {
    title: "Nerdcoins",
    description: "Pontos, benefícios e resgate no checkout com histórico completo.",
    icon: Gift
  },
  {
    title: "Checkout seguro",
    description: "Pagamento simples, rápido e protegido do carrinho à confirmação.",
    icon: ShieldCheck
  }
];

const serviceItems = [
  {
    title: "Entrega acompanhada",
    description: "Acompanhe o pedido do pagamento até a chegada.",
    icon: Truck,
    image: "/shopify/nerd-icon-support.webp"
  },
  {
    title: "Carrinho inteligente",
    description: "Cupons, estoque e pontos recalculados antes do pagamento.",
    icon: ShoppingBag,
    image: "/shopify/nerd-icon-cart.webp"
  },
  {
    title: "Conta com recompensas",
    description: "Histórico de compras, endereços e benefícios em um só lugar.",
    icon: Headphones,
    image: "/shopify/nerd-icon-account.webp"
  }
];

export default async function ShopHomePage(): Promise<React.ReactElement> {
  const offers = await getPublicOffers();

  return (
    <main className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden">
        <Image
          alt=""
          className="object-cover object-center"
          fill
          priority
          sizes="100vw"
          src="/shopify/product-1.webp"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/35" />
        <div className="relative mx-auto flex min-h-[78vh] w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Image
              alt="NerdLingoLab"
              className="mb-8 h-auto w-48"
              height={120}
              priority
              src="/shopify/logo.webp"
              width={320}
            />
            <div className="mb-6 inline-flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" />
              Loja geek com recompensas
            </div>
            <h1 className="text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
              Produtos geek com cupons, Nerdcoins e compra segura.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Uma experiência própria da NerdLingoLab para comprar colecionáveis,
              acessórios e itens especiais em uma loja feita para fãs exigentes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/produtos">Ver produtos</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/programa-de-fidelidade">Ver Nerdcoins</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicOffersSection coupons={offers.coupons} products={offers.products} />

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="h-5 w-5 text-primary" />
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {serviceItems.map((item) => (
            <Card key={item.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Image alt="" className="h-9 w-9 object-contain" height={48} src={item.image} width={48} />
                </div>
                <div>
                  <item.icon className="mb-3 h-5 w-5 text-secondary" />
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Fidelidade NerdLingoLab</CardTitle>
            <CardDescription>
              Ganhe pontos em compras elegíveis e acompanhe suas recompensas no programa
              de fidelidade NerdLingoLab.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
