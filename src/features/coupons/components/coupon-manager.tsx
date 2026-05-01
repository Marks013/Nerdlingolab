import { CouponType } from "@/generated/prisma/client";
import Link from "next/link";

import {
  activateCoupon,
  createCoupon,
  deactivateCoupon,
  setCouponPublicVisibility,
  updateCoupon
} from "@/actions/coupons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AdminCouponListItem, getAdminCoupons } from "@/lib/coupons/queries";

interface CouponManagerProps {
  data: Awaited<ReturnType<typeof getAdminCoupons>>;
}

export function CouponManager({ data }: CouponManagerProps): React.ReactElement {
  const activeCoupons = data.coupons.filter(isCouponCurrentlyActive);
  const inactiveCoupons = data.coupons.filter((coupon) => !isCouponCurrentlyActive(coupon));

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Comercial</p>
        <h1 className="text-3xl font-bold tracking-normal">Cupons</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Crie campanhas, edite regras, acompanhe uso, limite por cliente, validade e cupons privados de atendimento/Nerdcoins.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Cadastrados" value={String(data.metrics.totalCount)} />
        <Metric label="Ativos filtrados" value={String(data.metrics.activeCount)} />
        <Metric label="Usos totais" value={String(data.metrics.usedCount)} />
        <Metric label="Valor fixo usado" value={formatCurrency(data.metrics.fixedAmountCents)} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Públicos filtrados" value={String(data.metrics.publicCount)} />
        <Metric label="Privados filtrados" value={String(data.metrics.privateCount)} />
        <Metric label="Expirados filtrados" value={String(data.metrics.expiredCount)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Campanhas e cupons</CardTitle>
            <CardDescription>Ativos e desativados ficam separados para acompanhamento rápido.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <CouponFilters filters={data.filters} />
            <CouponGroup coupons={activeCoupons} customers={data.customers} title="Cupons ativos" />
            <CouponGroup coupons={inactiveCoupons} customers={data.customers} title="Cupons desativados e expirados" />
            {data.coupons.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum cupom encontrado.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novo cupom</CardTitle>
            <CardDescription>Configure campanha, cupom privado ou crédito pontual.</CardDescription>
          </CardHeader>
          <CardContent>
            <CouponForm customers={data.customers} submitLabel="Criar cupom" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CouponGroup({
  coupons,
  customers,
  title
}: {
  coupons: AdminCouponListItem[];
  customers: CouponManagerProps["data"]["customers"];
  title: string;
}): React.ReactElement | null {
  if (coupons.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
          {coupons.length}
        </span>
      </div>
      <div className="grid gap-3">
        {coupons.map((coupon) => (
          <CouponDetails coupon={coupon} customers={customers} key={coupon.id} />
        ))}
      </div>
    </section>
  );
}

function CouponDetails({
  coupon,
  customers
}: {
  coupon: AdminCouponListItem;
  customers: CouponManagerProps["data"]["customers"];
}): React.ReactElement {
  return (
    <details className="rounded-lg border bg-background" id={`coupon-${coupon.id}`}>
      <summary className="grid cursor-pointer list-none gap-3 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_170px] md:items-center">
        <div className="min-w-0">
          <p className="truncate font-mono font-semibold">{coupon.code}</p>
          <p className="truncate text-sm text-muted-foreground">
            {describeCouponValue(coupon)} / usado {coupon.usedCount} vez(es)
          </p>
        </div>
        <StatusPill>{getCouponStatus(coupon)}</StatusPill>
        <StatusPill>{coupon.isPublic ? "Público" : "Privado"}</StatusPill>
        <span className="text-sm text-muted-foreground md:text-right">
          {coupon.expiresAt ? formatDateTime(coupon.expiresAt) : "Sem expiração"}
        </span>
      </summary>
      <div className="grid gap-4 border-t p-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="grid content-start gap-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold">Regras atuais</h3>
            <Info label="Subtotal mínimo" value={coupon.minSubtotalCents ? formatCurrency(coupon.minSubtotalCents) : "Sem mínimo"} />
            <Info label="Desconto máximo" value={coupon.maxDiscountCents ? formatCurrency(coupon.maxDiscountCents) : "Sem teto"} />
            <Info label="Limite global" value={coupon.usageLimit ? `${coupon.usedCount}/${coupon.usageLimit}` : "Ilimitado"} />
            <Info label="Limite por cliente" value={coupon.perCustomerLimit ? String(coupon.perCustomerLimit) : "Ilimitado"} />
            <Info label="Início" value={coupon.startsAt ? formatDateTime(coupon.startsAt) : "Imediato"} />
            <Info label="Cliente vinculado" value={coupon.assignedUser?.name ?? coupon.assignedUser?.email ?? "Não vinculado"} />
          </section>

          <section className="grid content-start gap-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="font-semibold">Uso recente</h3>
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
        </div>

        <section className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Editar cupom</h3>
          <CouponForm coupon={coupon} customers={customers} submitLabel="Salvar alterações" />
        </section>

        <div className="flex flex-wrap gap-2">
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
  );
}

function CouponForm({
  coupon,
  customers,
  submitLabel
}: {
  coupon?: AdminCouponListItem;
  customers: CouponManagerProps["data"]["customers"];
  submitLabel: string;
}): React.ReactElement {
  return (
    <form action={coupon ? updateCoupon.bind(null, coupon.id) : createCoupon} className="mt-4 space-y-4">
      <Field defaultValue={coupon?.code ?? ""} label="Código" name="code" required />
      <label className="grid gap-2 text-sm font-medium">
        Tipo
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={coupon?.type ?? CouponType.PERCENTAGE} name="type">
          <option value={CouponType.PERCENTAGE}>Percentual</option>
          <option value={CouponType.FIXED_AMOUNT}>Valor fixo</option>
          <option value={CouponType.FREE_SHIPPING}>Frete grátis</option>
        </select>
      </label>
      <Field defaultValue={coupon ? formatCouponValueInput(coupon) : ""} label="Valor" name="value" placeholder="10, 15% ou 25,00" required />
      <Field defaultValue={formatMoneyInput(coupon?.minSubtotalCents)} label="Subtotal mínimo" name="minSubtotal" placeholder="99,90" />
      <Field defaultValue={formatMoneyInput(coupon?.maxDiscountCents)} label="Desconto máximo" name="maxDiscount" placeholder="50,00" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field defaultValue={formatNumberInput(coupon?.usageLimit)} label="Limite global" min={1} name="usageLimit" type="number" />
        <Field defaultValue={formatNumberInput(coupon?.perCustomerLimit)} label="Limite por cliente" min={1} name="perCustomerLimit" type="number" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field defaultValue={formatDateTimeLocal(coupon?.startsAt)} label="Início" name="startsAt" type="datetime-local" />
        <Field defaultValue={formatDateTimeLocal(coupon?.expiresAt)} label="Expiração" name="expiresAt" type="datetime-local" />
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Vincular a cliente
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={coupon?.assignedUserId ?? ""} name="assignedUserId">
          <option value="">Cupom geral</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name ?? customer.email}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input defaultChecked={coupon?.isActive ?? true} name="isActive" type="checkbox" />
        Cupom ativo
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input defaultChecked={coupon?.isPublic ?? true} name="isPublic" type="checkbox" />
        Visível na página de cupons
      </label>
      <Button className="w-full" type="submit">{submitLabel}</Button>
    </form>
  );
}

function CouponFilters({ filters }: { filters: CouponManagerProps["data"]["filters"] }): React.ReactElement {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
      <Field defaultValue={filters.query ?? ""} label="Buscar" name="busca" placeholder="Código, nome ou e-mail" />
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
          <option value="public">Públicos</option>
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
    return "Frete grátis";
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

function isCouponCurrentlyActive(coupon: { expiresAt: Date | null; isActive: boolean }): boolean {
  return coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date());
}

function formatCouponValueInput(coupon: { type: CouponType; value: number }): string {
  if (coupon.type === CouponType.PERCENTAGE) {
    return String(coupon.value);
  }

  if (coupon.type === CouponType.FREE_SHIPPING) {
    return "0";
  }

  return formatMoneyInput(coupon.value);
}

function formatMoneyInput(value?: number | null): string {
  return value === null || value === undefined
    ? ""
    : (value / 100).toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        useGrouping: false
      });
}

function formatNumberInput(value?: number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function formatDateTimeLocal(value?: Date | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return offsetDate.toISOString().slice(0, 16);
}
