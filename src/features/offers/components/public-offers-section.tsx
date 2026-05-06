import { CalendarDays, Flame, Gift, Percent, ShoppingBag, Sparkles, TicketPercent, Truck, Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CouponCopyButton } from "@/features/coupons/components/coupon-copy-button";
import { ProductCard } from "@/features/catalog/components/product-card";
import {
  formatPublicCouponBenefit,
  type PublicOfferCoupon
} from "@/lib/offers/queries";
import type { ProductListItem } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/format";

interface PublicOffersSectionProps {
  coupons: PublicOfferCoupon[];
  products: ProductListItem[];
}

export function PublicOffersSection({
  coupons,
  products
}: PublicOffersSectionProps): React.ReactElement | null {
  if (coupons.length === 0 && products.length === 0) {
    return null;
  }

  return (
    <section id="ofertas-cupons" className="w-full py-12">
      <div className="mb-7 rounded-lg border border-primary/25 bg-[#fff7ed] p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-primary">
              <Sparkles className="mr-1.5 size-3.5" />
              Garimpo de economia
            </p>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-normal text-[#1c1c1c]">
              Cupons para transformar vontade em carrinho.
            </h2>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[#4f5d65]">
              Use os códigos ativos no checkout e confira o desconto antes do pagamento. Os valores são validados novamente no carrinho.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/produtos">
              <ShoppingBag className="mr-2 size-4" />
              Ver catálogo
            </Link>
          </Button>
        </div>
      </div>

      {coupons.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {coupons.map((coupon) => {
            const campaign = getCouponCampaign(coupon);

            return (
            <article className={`flex min-h-[340px] flex-col overflow-hidden rounded-lg border-2 bg-white shadow-sm ${campaign.borderClass}`} key={coupon.code}>
              <div className={`border-b px-4 py-4 text-white ${campaign.headerClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <campaign.icon className="size-5" />
                    <p className="text-sm font-black uppercase">{campaign.label}</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-black">
                    {campaign.badge}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black">{formatPublicCouponBenefit(coupon)}</p>
                <p className="mt-2 text-sm font-semibold text-white/90">{campaign.pitch}</p>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-sm font-semibold text-[#4f5d65]">Digite no carrinho:</p>
                <p className="mt-2 inline-flex w-fit rounded-lg border-2 border-dashed border-primary/50 bg-[#fff7ed] px-4 py-2 font-mono text-base font-black text-primary">
                  {coupon.code}
                </p>
                <div className="mt-4 grid gap-2 text-sm text-[#4f5d65]">
                  {coupon.minSubtotalCents ? (
                    <CouponRule icon={TicketPercent} text={`Pedido mínimo: ${formatCurrency(coupon.minSubtotalCents)}`} />
                  ) : (
                    <CouponRule icon={TicketPercent} text="Sem pedido mínimo configurado." />
                  )}
                  {coupon.expiresAt ? (
                    <CouponRule icon={CalendarDays} text={`Válido até ${coupon.expiresAt.toLocaleDateString("pt-BR")}.`} />
                  ) : (
                    <CouponRule icon={CalendarDays} text="Válido enquanto estiver ativo no site." />
                  )}
                </div>
                <div className="mt-auto grid gap-2 pt-5">
                  <CouponCopyButton className="w-full border-primary/50 bg-white text-primary hover:bg-primary/10" code={coupon.code} />
                  <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link href="/carrinho">
                      <Gift className="mr-2 size-4" />
                      Usar no carrinho
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CouponRule({
  icon: Icon,
  text
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}): React.ReactElement {
  return (
    <p className="flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      <span>{text}</span>
    </p>
  );
}

function getCouponCampaign(coupon: PublicOfferCoupon): {
  badge: string;
  borderClass: string;
  headerClass: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  pitch: string;
} {
  const code = coupon.code.toLowerCase();

  if (code.includes("black") || code.includes("bf")) {
    return {
      badge: "campanha",
      borderClass: "border-zinc-900",
      headerClass: "border-zinc-800 bg-zinc-950",
      icon: Flame,
      label: "Black Friday Nerd",
      pitch: "Oferta agressiva para decidir rápido e levar antes do estoque girar."
    };
  }

  if (code.includes("consumidor") || code.includes("cliente")) {
    return {
      badge: "especial",
      borderClass: "border-emerald-300",
      headerClass: "border-emerald-700 bg-emerald-700",
      icon: Percent,
      label: "Dia do Consumidor",
      pitch: "Uma vantagem pensada para transformar visita em compra segura."
    };
  }

  if (coupon.type === "FREE_SHIPPING" || code.includes("frete")) {
    return {
      badge: "entrega",
      borderClass: "border-sky-300",
      headerClass: "border-sky-700 bg-sky-700",
      icon: Truck,
      label: "Frete em destaque",
      pitch: "Perfeito para tirar o peso da entrega e fechar o carrinho com tranquilidade."
    };
  }

  if (code.includes("flash") || code.includes("relampago")) {
    return {
      badge: "rápido",
      borderClass: "border-amber-300",
      headerClass: "border-amber-700 bg-amber-700",
      icon: Zap,
      label: "Oferta relâmpago",
      pitch: "Campanha curta, direta e pronta para criar senso de oportunidade."
    };
  }

  return {
    badge: "ativo",
    borderClass: "border-primary/20",
    headerClass: "border-primary/15 bg-primary",
    icon: TicketPercent,
    label: "Cupom ativo",
    pitch: "Desconto pronto para deixar a compra mais leve no checkout."
  };
}
