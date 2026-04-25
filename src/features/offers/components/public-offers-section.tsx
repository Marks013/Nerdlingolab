import { TicketPercent } from "lucide-react";
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
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Seleção especial</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal">Ofertas NerdLingoLab</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Produtos e cupons ativos, com valores conferidos novamente no carrinho.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/produtos">Ver catálogo</Link>
        </Button>
      </div>

      {coupons.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {coupons.map((coupon) => (
            <article className="rounded-md border bg-card p-4" key={coupon.code}>
              <div className="flex items-center gap-2 text-primary">
                <TicketPercent className="h-5 w-5" />
                <p className="font-semibold">{formatPublicCouponBenefit(coupon)}</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Use o cupom no carrinho:</p>
              <p className="mt-2 w-fit rounded-md border bg-background px-3 py-2 font-mono text-sm font-semibold">
                {coupon.code}
              </p>
              {coupon.minSubtotalCents ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Pedido mínimo: {formatCurrency(coupon.minSubtotalCents)}
                </p>
              ) : null}
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
