import { CouponType } from "@/generated/prisma/client";
import Link from "next/link";

import { activateCoupon, createCoupon, deactivateCoupon, setCouponPublicVisibility } from "@/actions/coupons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { getAdminCoupons } from "@/lib/coupons/queries";

interface CouponManagerProps {
  data: Awaited<ReturnType<typeof getAdminCoupons>>;
}

export function CouponManager({ data }: CouponManagerProps): React.ReactElement {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Comercial</p>
        <h1 className="text-3xl font-bold tracking-normal">Cupons</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Crie campanhas, acompanhe uso, limite por cliente, validade e cupons privados de atendimento/Nerdcoins.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Cadastrados" value={String(data.metrics.totalCount)} />
        <Metric label="Ativos filtrados" value={String(data.metrics.activeCount)} />
        <Metric label="Usos totais" value={String(data.metrics.usedCount)} />
        <Metric label="Valor fixo usado" value={formatCurrency(data.metrics.fixedAmountCents)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Publicos filtrados" value={String(data.metrics.publicCount)} />
        <Metric label="Privados filtrados" value={String(data.metrics.privateCount)} />
        <Metric label="Expirados filtrados" value={String(data.metrics.expiredCount)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Campanhas e cupons</CardTitle>
            <CardDescription>Filtre, expanda e acompanhe uso real em pedidos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <CouponFilters filters={data.filters} />
            <div className="grid gap-3">
              {data.coupons.map((coupon) => (
                <details className="rounded-lg border bg-background" key={coupon.id}>
                  <summary className="grid cursor-pointer list-none gap-3 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_170px] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-mono font-semibold">{coupon.code}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {describeCouponValue(coupon)} / usado {coupon.usedCount} vez(es)
                      </p>
                    </div>
                    <StatusPill>{getCouponStatus(coupon)}</StatusPill>
                    <StatusPill>{coupon.isPublic ? "Publico" : "Privado"}</StatusPill>
                    <span className="text-sm text-muted-foreground md:text-right">
                      {coupon.expiresAt ? formatDateTime(coupon.expiresAt) : "Sem expiracao"}
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t p-4 xl:grid-cols-[1fr_1fr]">
                    <section className="grid content-start gap-3 rounded-lg border bg-muted/20 p-4">
                      <h2 className="font-semibold">Regras</h2>
                      <Info label="Subtotal minimo" value={coupon.minSubtotalCents ? formatCurrency(coupon.minSubtotalCents) : "Sem minimo"} />
                      <Info label="Desconto maximo" value={coupon.maxDiscountCents ? formatCurrency(coupon.maxDiscountCents) : "Sem teto"} />
                      <Info label="Limite global" value={coupon.usageLimit ? `${coupon.usedCount}/${coupon.usageLimit}` : "Ilimitado"} />
                      <Info label="Limite por cliente" value={coupon.perCustomerLimit ? String(coupon.perCustomerLimit) : "Ilimitado"} />
                      <Info label="Inicio" value={coupon.startsAt ? formatDateTime(coupon.startsAt) : "Imediato"} />
                      <Info label="Cliente vinculado" value={coupon.assignedUser?.name ?? coupon.assignedUser?.email ?? "Não vinculado"} />
                    </section>

                    <section className="grid content-start gap-3 rounded-lg border bg-muted/20 p-4">
                      <h2 className="font-semibold">Uso recente</h2>
                      {coupon.redemptions.map((redemption) => (
                        <Link className="rounded-md border bg-background p-3 text-sm transition hover:bg-muted/40" href={`/admin/pedidos/${redemption.order.id}`} key={redemption.id}>
                          <span className="block font-semibold">{redemption.order.orderNumber}</span>
                          <span className="block text-muted-foreground">
                            {redemption.user?.name ?? redemption.user?.email ?? "Cliente"} / {formatCurrency(redemption.discountCents)}
                          </span>
                        </Link>
                      ))}
                      {coupon.redemptions.length === 0 ? (
                        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Ainda não usado.</p>
                      ) : null}
                    </section>

                    <div className="flex flex-wrap gap-2 xl:col-span-2">
                      <form action={setCouponPublicVisibility.bind(null, coupon.id, !coupon.isPublic)}>
                        <Button disabled={!coupon.isActive} size="sm" type="submit" variant="outline">
                          {coupon.isPublic ? "Tornar privado" : "Publicar"}
                        </Button>
                      </form>
                      {coupon.isActive ? (
                        <form action={deactivateCoupon.bind(null, coupon.id)}>
                          <Button size="sm" type="submit" variant="outline">Desativar</Button>
                        </form>
                      ) : (
                        <form action={activateCoupon.bind(null, coupon.id)}>
                          <Button size="sm" type="submit" variant="outline">Ativar</Button>
                        </form>
                      )}
                    </div>
                  </div>
                </details>
              ))}
              {data.coupons.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum cupom encontrado.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novo cupom</CardTitle>
            <CardDescription>Configure campanha, cupom privado ou credito pontual.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCoupon} className="space-y-4">
              <Field label="Codigo" name="code" required />
              <label className="grid gap-2 text-sm font-medium">
                Tipo
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="type">
                  <option value={CouponType.PERCENTAGE}>Percentual</option>
                  <option value={CouponType.FIXED_AMOUNT}>Valor fixo</option>
                  <option value={CouponType.FREE_SHIPPING}>Frete gratis</option>
                </select>
              </label>
              <Field label="Valor" name="value" placeholder="10, 15% ou 25,00" required />
              <Field label="Subtotal minimo" name="minSubtotal" placeholder="99,90" />
              <Field label="Desconto maximo" name="maxDiscount" placeholder="50,00" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Limite global" min={1} name="usageLimit" type="number" />
                <Field label="Limite por cliente" min={1} name="perCustomerLimit" type="number" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Inicio" name="startsAt" type="datetime-local" />
                <Field label="Expiracao" name="expiresAt" type="datetime-local" />
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Vincular a cliente
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="assignedUserId">
                  <option value="">Cupom geral</option>
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name ?? customer.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked name="isActive" type="checkbox" />
                Cupom ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked name="isPublic" type="checkbox" />
                Visivel na pagina de cupons
              </label>
              <Button className="w-full" type="submit">Criar cupom</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CouponFilters({ filters }: { filters: CouponManagerProps["data"]["filters"] }): React.ReactElement {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
      <Field defaultValue={filters.query ?? ""} label="Buscar" name="busca" placeholder="Codigo, nome ou e-mail" />
      <label className="grid gap-2 text-sm font-medium">
        Status
        <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={filters.status ?? ""} name="status">
          <option value="">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="expired">Expirados</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Visibilidade
        <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={filters.visibility ?? ""} name="visibilidade">
          <option value="">Todas</option>
          <option value="public">Publicos</option>
          <option value="private">Privados</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <Button className="w-full" type="submit" variant="secondary">Filtrar</Button>
        <Button asChild className="w-full" variant="ghost">
          <Link href="/admin/cupons">Limpar</Link>
        </Button>
      </div>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  min,
  name,
  placeholder,
  required,
  type = "text"
}: {
  defaultValue?: string;
  label: string;
  min?: number;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue} min={min} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">{children}</span>;
}

function describeCouponValue(coupon: { type: CouponType; value: number }): string {
  if (coupon.type === CouponType.PERCENTAGE) {
    return `${coupon.value}%`;
  }

  if (coupon.type === CouponType.FREE_SHIPPING) {
    return "Frete gratis";
  }

  return formatCurrency(coupon.value);
}

function getCouponStatus(coupon: { expiresAt: Date | null; isActive: boolean }): string {
  if (!coupon.isActive) {
    return "Inativo";
  }

  if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
    return "Expirado";
  }

  return "Ativo";
}
