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

  const filters = resolveFilters(await searchParams);
  const dashboard = await getDropshippingDashboard(filters);
  const globalRule = dashboard.pricingRules.find((rule) => rule.id === "pricing_global_default") ?? dashboard.pricingRules[0];

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wide text-primary">Central de fornecedores</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-foreground">Dropshipping sem susto operacional</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Monitore links de origem, preco fornecedor, estoque, variacoes e alertas sem travar a loja quando uma API externa falhar.
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

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle>Produtos monitorados</CardTitle>
            <CardDescription>Use filtros para priorizar itens com divergencia de preco, estoque ou origem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <FilterBar filters={filters} />
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">Sugerido</th>
                    <th className="px-4 py-3">Estoque</th>
                    <th className="px-4 py-3">Alertas</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dashboard.items.map((item) => (
                    <SupplierRow item={item} key={item.id} />
                  ))}
                  {dashboard.items.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={9}>
                        Nenhuma origem encontrada para os filtros atuais.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Regra global de margem</CardTitle>
              <CardDescription>Base para preco sugerido. Aplicacao continua manual e assistida.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateGlobalPricingRuleAction} className="grid gap-3">
                <label className="grid gap-1 text-sm font-semibold">
                  Margem percentual
                  <Input defaultValue={globalRule?.marginPercent ?? "35"} name="marginPercent" type="number" step="0.01" min="0" />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Acrescimo fixo em centavos
                  <Input defaultValue={globalRule?.marginFixedCents ?? 0} name="marginFixedCents" type="number" min="0" />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Margem minima em centavos
                  <Input defaultValue={globalRule?.minimumMarginCents ?? 1000} name="minimumMarginCents" type="number" min="0" />
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
                Falha no fornecedor nao derruba vitrine nem checkout. Links de terceiros ficam em modo assistido quando nao houver leitura publica confiavel.
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
    <tr className="align-top">
      <td className="max-w-[280px] px-4 py-4">
        <Link className="font-bold text-foreground hover:text-primary" href={`/admin/produtos/${item.productId}/editar`}>
          {item.productTitle}
        </Link>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <a className="inline-flex items-center gap-1 hover:text-primary" href={item.originalUrl} rel="noreferrer" target="_blank">
            Origem <ExternalLink className="size-3" />
          </a>
          <Link className="hover:text-primary" href={`/produtos/${item.productSlug}`} target="_blank">Vitrine</Link>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="rounded-full border px-2 py-1 text-xs font-bold">{providerLabel(item.provider)}</span>
      </td>
      <td className="px-4 py-4">
        <StatusPill status={item.status} />
        <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.lastCheckedAt)}</p>
        {item.lastError ? <p className="mt-1 max-w-[220px] text-xs text-red-700">{item.lastError}</p> : null}
      </td>
      <td className="px-4 py-4">
        <p className="font-bold">{formatOptionalCurrency(item.lastPriceCents)}</p>
        <p className="text-xs text-muted-foreground">preco origem</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-bold">{formatOptionalCurrency(item.storePriceCents)}</p>
        <p className="text-xs text-muted-foreground">preco loja</p>
      </td>
      <td className="px-4 py-4">
        <p className={cn("font-bold", sourcePriceChanged && "text-primary")}>{formatOptionalCurrency(item.suggestedPriceCents)}</p>
        <p className="text-xs text-muted-foreground">{item.suggestedRuleLabel ?? "sem regra"}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-bold">{item.lastStockQuantity ?? "-"}</p>
        <p className="text-xs text-muted-foreground">{item.unavailableVariantCount}/{item.variantCount} variacoes indisponiveis</p>
      </td>
      <td className="max-w-[260px] px-4 py-4">
        {item.openAlerts.length ? (
          <div className="grid gap-2">
            {item.openAlerts.map((alert) => (
              <form action={acknowledgeSourceAlertAction} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950" key={alert.id}>
                <input name="alertId" type="hidden" value={alert.id} />
                <p className="font-bold">{alert.type}</p>
                <p>{alert.message}</p>
                <button className="mt-1 text-xs font-bold text-amber-800 underline" type="submit">Marcar visto</button>
              </form>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-4" />
            Sem alerta aberto
          </span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <form action={syncDropshippingSourceAction.bind(null, item.id)}>
            <Button className="h-9" type="submit" variant="outline">
              <RefreshCw className="mr-2 size-4" />
              Sync
            </Button>
          </form>
          <form action={applySuggestedSourcePriceAction.bind(null, item.id)}>
            <Button className="h-9" disabled={!sourcePriceChanged} type="submit">
              Aplicar
            </Button>
          </form>
        </div>
        <details className="mt-2 rounded-lg border bg-muted/30 p-2 text-left">
          <summary className="cursor-pointer text-xs font-bold text-foreground">Validacao manual</summary>
          <form action={updateManualSourceSnapshotAction} className="mt-3 grid gap-2">
            <input name="sourceId" type="hidden" value={item.id} />
            <select className="h-9 rounded-md border bg-background px-2 text-xs" defaultValue={item.status} name="status">
              {Object.values(SupplierSourceStatus).map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-9 text-xs" defaultValue={item.lastPriceCents ? (item.lastPriceCents / 100).toFixed(2).replace(".", ",") : ""} name="price" placeholder="Preco R$" />
              <Input className="h-9 text-xs" defaultValue={item.lastStockQuantity ?? ""} name="stockQuantity" placeholder="Estoque" type="number" />
            </div>
            <Input className="h-9 text-xs" defaultValue={item.lastError ?? ""} name="note" placeholder="Observacao interna" />
            <Button className="h-9 text-xs" type="submit" variant="outline">Salvar validacao</Button>
          </form>
        </details>
      </td>
    </tr>
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
    CONFIG_REQUIRED: "Configurar"
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
