import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Search, Settings2, ShieldAlert, TrendingUp } from "lucide-react";

import {
  acknowledgeSourceAlertAction,
  applySuggestedSourcePriceAction,
  bootstrapDropshippingSourcesAction,
  syncDropshippingBatchAction,
  syncDropshippingSourceAction,
  updateManualSourceSnapshotAction,
  updateGlobalPricingRuleAction
} from "@/actions/dropshipping";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  SupplierProvider,
  SupplierSourceStatus
} from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin";
import {
  formatOptionalCurrency,
  getDropshippingDashboard,
  type DropshippingDashboardFilters,
  type DropshippingDashboardItem
} from "@/lib/dropshipping/queries";
import { ensureProductSourcesFromMetafields } from "@/lib/dropshipping/sync";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const criticalStatuses: SupplierSourceStatus[] = [
  SupplierSourceStatus.PAUSED,
  SupplierSourceStatus.CLOSED,
  SupplierSourceStatus.DELETED,
  SupplierSourceStatus.OUT_OF_STOCK
];
const warningStatuses: SupplierSourceStatus[] = [
  SupplierSourceStatus.ERROR,
  SupplierSourceStatus.CONFIG_REQUIRED,
  SupplierSourceStatus.UNKNOWN
];

export default async function AdminSuppliersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  await requireAdmin();
  await ensureProductSourcesFromMetafields(1_000);

  const resolvedSearchParams = await searchParams;
  const filters = resolveFilters(resolvedSearchParams);
  const notice = readParam(resolvedSearchParams.notice);
  const dashboard = await getDropshippingDashboard(filters);
  const globalRule = dashboard.pricingRules.find((rule) => rule.id === "pricing_global_default") ?? dashboard.pricingRules[0];

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm">
          {notice}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wide text-primary">Central de fornecedores</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-foreground">Dropshipping sem susto operacional</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Monitore links de origem, preco fornecedor, estoque, variacoes e alertas sem travar a loja quando a leitura externa nao estiver disponivel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={bootstrapDropshippingSourcesAction}>
            <Button type="submit" variant="outline">
              <Settings2 className="mr-2 size-4" />
              Reindexar links
            </Button>
          </form>
          <form action={syncDropshippingBatchAction}>
            <Button type="submit">
              <RefreshCw className="mr-2 size-4" />
              Sincronizar lote
            </Button>
          </form>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Origens" value={dashboard.totals.sources} />
        <MetricCard label="Mercado Livre" value={dashboard.totals.mercadoLivre} />
        <MetricCard label="Shopee" value={dashboard.totals.shopee} />
        <MetricCard label="Alertas abertos" tone="warning" value={dashboard.totals.openAlerts} />
        <MetricCard label="Criticos" tone="critical" value={dashboard.totals.criticalStatuses} />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle>Produtos monitorados</CardTitle>
            <CardDescription>Use filtros para priorizar itens com divergencia de preco, estoque ou origem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <FilterBar filters={filters} />
            <div className="grid gap-3">
              {dashboard.items.map((item) => (
                <SupplierRow item={item} key={item.id} />
              ))}
              {dashboard.items.length === 0 ? (
                <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma origem encontrada para os filtros atuais.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Regra global de margem</CardTitle>
              <CardDescription>Base para preco sugerido. Informe valores em reais, como 10,00.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateGlobalPricingRuleAction} className="grid gap-3">
                <label className="grid gap-1 text-sm font-semibold">
                  Margem percentual
                  <Input defaultValue={globalRule?.marginPercent ?? "35"} name="marginPercent" type="number" step="0.01" min="0" />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Acrescimo fixo
                  <CurrencyInput defaultValue={globalRule?.marginFixedCents ?? 0} name="marginFixed" />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Margem minima
                  <CurrencyInput defaultValue={globalRule?.minimumMarginCents ?? 1000} name="minimumMargin" />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Arredondamento
                  <select
                    className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
                    defaultValue={globalRule?.roundingMode ?? "END_90"}
                    name="roundingMode"
                  >
                    <option value="END_90">Terminar em ,90</option>
                    <option value="END_99">Terminar em ,99</option>
                    <option value="INTEGER">Inteiro acima</option>
                    <option value="NONE">Sem arredondar</option>
                  </select>
                </label>
                <Button type="submit">
                  <TrendingUp className="mr-2 size-4" />
                  Salvar regra
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50 text-amber-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-5" />
                Regra de seguranca
              </CardTitle>
              <CardDescription className="text-amber-900/80">
                Falha no fornecedor nao derruba vitrine nem checkout. Quando Mercado Livre ou Shopee bloqueiam leitura externa, o item fica manual assistido.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-sky-200 bg-sky-50 text-sky-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="size-5" />
                Leitura automatica
              </CardTitle>
              <CardDescription className="text-sky-900/80">
                O lote tenta consultar dados publicos. Se o fornecedor exigir login, captcha ou verificacao, o produto continua em modo manual com calculo de margem assim que voce preencher o preco de origem.
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({ label, tone = "neutral", value }: { label: string; tone?: "neutral" | "warning" | "critical"; value: number }): React.ReactElement {
  return (
    <Card className={cn(tone === "warning" && "border-amber-200", tone === "critical" && "border-red-200")}>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-2 text-2xl font-black", tone === "warning" && "text-amber-700", tone === "critical" && "text-red-700")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterBar({ filters }: { filters: DropshippingDashboardFilters }): React.ReactElement {
  return (
    <form className="grid gap-3 rounded-lg border bg-background/80 p-3 md:grid-cols-[1fr_170px_170px_120px]">
      <label className="relative">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <Input className="pl-9" defaultValue={filters.query ?? ""} name="busca" placeholder="Buscar produto..." />
      </label>
      <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm" defaultValue={filters.provider ?? ""} name="fornecedor">
        <option value="">Todos fornecedores</option>
        <option value="MERCADO_LIVRE">Mercado Livre</option>
        <option value="SHOPEE">Shopee</option>
      </select>
      <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm" defaultValue={filters.status ?? ""} name="status">
        <option value="">Todos status</option>
        {Object.values(SupplierSourceStatus).map((status) => (
          <option key={status} value={status}>{statusLabel(status)}</option>
        ))}
      </select>
      <Button type="submit" variant="outline">Filtrar</Button>
    </form>
  );
}

function SupplierRow({ item }: { item: DropshippingDashboardItem }): React.ReactElement {
  const sourcePriceChanged = item.suggestedPriceCents !== null && item.suggestedPriceCents !== item.storePriceCents;

  return (
    <article className="overflow-hidden rounded-xl border bg-background p-4 shadow-sm">
      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border px-2 py-1 text-xs font-bold">{providerLabel(item.provider)}</span>
              <StatusPill status={item.status} />
            </div>
            <Link className="mt-3 block max-w-3xl text-base font-black leading-snug text-foreground hover:text-primary" href={`/admin/produtos/${item.productId}/editar`}>
              {item.productTitle}
            </Link>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
              <a className="inline-flex items-center gap-1 hover:text-primary" href={item.originalUrl} rel="noreferrer" target="_blank">
                Abrir origem <ExternalLink className="size-3" />
              </a>
              <Link className="hover:text-primary" href={`/produtos/${item.productSlug}`} target="_blank">Ver vitrine</Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Ultima checagem: {formatDate(item.lastCheckedAt)}</p>
            {item.lastError ? <p className="mt-2 max-w-3xl rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-800">{item.lastError}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <form action={syncDropshippingSourceAction.bind(null, item.id)}>
              <Button className="h-10 px-4" type="submit" variant="outline">
                <RefreshCw className="mr-2 size-4" />
                Sincronizar
              </Button>
            </form>
            <form action={applySuggestedSourcePriceAction.bind(null, item.id)}>
              <Button className="h-10 px-4" disabled={!sourcePriceChanged} type="submit">
                Aplicar preco
              </Button>
            </form>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile detail={item.lastPriceCents === null ? "preencha na validacao manual" : undefined} label="Preco origem" value={formatOptionalCurrency(item.lastPriceCents)} />
          <InfoTile label="Preco loja" value={formatOptionalCurrency(item.storePriceCents)} />
          <InfoTile highlight={sourcePriceChanged} label="Preco sugerido" value={formatOptionalCurrency(item.suggestedPriceCents)} detail={item.suggestedRuleLabel ?? (item.lastPriceCents === null ? "aguardando preco origem" : "sem regra")} />
          <InfoTile label="Estoque origem" value={item.lastStockQuantity ?? "-"} detail={`${item.unavailableVariantCount}/${item.variantCount} variacoes indisponiveis`} />
        </div>

        <AlertList item={item} />
      </div>

      <details className="mt-4 rounded-lg border bg-muted/30 p-3 text-left">
          <summary className="cursor-pointer text-sm font-bold text-foreground">Validacao manual</summary>
          <form action={updateManualSourceSnapshotAction} className="mt-3 grid gap-3 lg:grid-cols-[180px_180px_140px_minmax(220px,1fr)_140px]">
            <input name="sourceId" type="hidden" value={item.id} />
            <select className="h-10 rounded-md border bg-background px-2 text-sm" defaultValue={item.status} name="status">
              {Object.values(SupplierSourceStatus).map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
            <CurrencyInput defaultValue={item.lastPriceCents ?? 0} name="price" placeholder="Preco fornecedor" />
            <Input className="h-10 text-sm" defaultValue={item.lastStockQuantity ?? ""} name="stockQuantity" placeholder="Estoque" type="number" />
            <Input className="h-10 text-sm" defaultValue={item.lastError ?? ""} name="note" placeholder="Observacao interna" />
            <Button className="h-10 text-sm" type="submit" variant="outline">Salvar</Button>
          </form>
        </details>
    </article>
  );
}

function InfoTile({ detail, highlight = false, label, value }: { detail?: string; highlight?: boolean; label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-muted/30 p-3", highlight && "border-primary/40 bg-primary/10")}>
      <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 break-words text-base font-black text-foreground", highlight && "text-primary")}>{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function AlertList({ item }: { item: DropshippingDashboardItem }): React.ReactElement {
  if (!item.openAlerts.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="size-4" />
        Sem alerta aberto
      </span>
    );
  }

  return (
    <div className="grid gap-2">
      {item.openAlerts.map((alert) => (
        <form action={acknowledgeSourceAlertAction} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950" key={alert.id}>
          <input name="alertId" type="hidden" value={alert.id} />
          <p className="font-bold">{alert.type}</p>
          <p className="leading-5">{alert.message}</p>
          <button className="mt-1 text-xs font-bold text-amber-800 underline" type="submit">Marcar visto</button>
        </form>
      ))}
    </div>
  );
}

function CurrencyInput({
  defaultValue,
  name,
  placeholder = "0,00"
}: {
  defaultValue: number;
  name: string;
  placeholder?: string;
}): React.ReactElement {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
      <Input className="h-10 pl-9 text-sm" defaultValue={formatCurrencyInput(defaultValue)} inputMode="decimal" name={name} placeholder={placeholder} />
    </div>
  );
}

function StatusPill({ status }: { status: SupplierSourceStatus }): React.ReactElement {
  const critical = criticalStatuses.includes(status);
  const warning = warningStatuses.includes(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold",
        critical && "border-red-200 bg-red-50 text-red-700",
        warning && "border-amber-200 bg-amber-50 text-amber-800",
        status === SupplierSourceStatus.ACTIVE && "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {critical || warning ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
      {statusLabel(status)}
    </span>
  );
}

function resolveFilters(searchParams: Record<string, string | string[] | undefined>): DropshippingDashboardFilters {
  const provider = readParam(searchParams.fornecedor);
  const status = readParam(searchParams.status);

  return {
    provider: isSupplierProvider(provider) ? provider : undefined,
    status: isSupplierSourceStatus(status) ? status : undefined,
    query: readParam(searchParams.busca)
  };
}

function readParam(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();

  return trimmed || undefined;
}

function isSupplierProvider(value: string | undefined): value is SupplierProvider {
  return Boolean(value && Object.values(SupplierProvider).includes(value as SupplierProvider));
}

function isSupplierSourceStatus(value: string | undefined): value is SupplierSourceStatus {
  return Boolean(value && Object.values(SupplierSourceStatus).includes(value as SupplierSourceStatus));
}

function providerLabel(provider: SupplierProvider): string {
  if (provider === SupplierProvider.MERCADO_LIVRE) {
    return "Mercado Livre";
  }

  if (provider === SupplierProvider.SHOPEE) {
    return "Shopee";
  }

  return provider;
}

function statusLabel(status: SupplierSourceStatus): string {
  const labels: Record<SupplierSourceStatus, string> = {
    ACTIVE: "Ativo",
    PAUSED: "Pausado",
    CLOSED: "Encerrado",
    DELETED: "Removido",
    OUT_OF_STOCK: "Sem estoque",
    UNKNOWN: "Nao checado",
    ERROR: "Erro",
    CONFIG_REQUIRED: "Manual"
  };

  return labels[status];
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "Nunca checado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value);
}

function formatCurrencyInput(value: number): string {
  if (!value) {
    return "";
  }

  return (value / 100).toFixed(2).replace(".", ",");
}
