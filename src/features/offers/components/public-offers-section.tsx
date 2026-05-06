import { Gift, ShoppingBag, Sparkles, TicketPercent } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
    <section id="ofertas-cupons" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
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
          {coupons.map((coupon) => (
            <article className="overflow-hidden rounded-lg border-2 border-primary/20 bg-white shadow-sm" key={coupon.code}>
              <div className="border-b border-primary/15 bg-primary px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <TicketPercent className="size-5" />
                  <p className="text-sm font-black uppercase">Cupom ativo</p>
                </div>
                <p className="mt-2 text-2xl font-black">{formatPublicCouponBenefit(coupon)}</p>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-[#4f5d65]">Digite no carrinho:</p>
                <p className="mt-2 inline-flex rounded-lg border-2 border-dashed border-primary/50 bg-[#fff7ed] px-4 py-2 font-mono text-base font-black text-primary">
                  {coupon.code}
                </p>
                <div className="mt-4 grid gap-2 text-sm text-[#4f5d65]">
                  {coupon.minSubtotalCents ? (
                    <p>🎯 Pedido mínimo: {formatCurrency(coupon.minSubtotalCents)}</p>
                  ) : (
                    <p>🎯 Sem pedido mínimo configurado.</p>
                  )}
                  {coupon.expiresAt ? (
                    <p>⏳ Válido até {coupon.expiresAt.toLocaleDateString("pt-BR")}.</p>
                  ) : (
                    <p>⏳ Válido enquanto estiver ativo no site.</p>
                  )}
                </div>
                <Button asChild className="mt-5 w-full">
                  <Link href="/carrinho">
                    <Gift className="mr-2 size-4" />
                    Usar no carrinho
                  </Link>
                </Button>
              </div>
            </article>
          ))}
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
