import Link from "next/link";
import { AlertTriangle, CheckCircle2, DollarSign, Download, ExternalLink, FileWarning, PowerOff, RefreshCw, Search, Settings2, ShieldAlert, Trash2, TrendingUp, Upload, Wand2 } from "lucide-react";

import {
  acknowledgeSourceAlertAction,
  applySuggestedSourcePriceAction,
  applySuggestedPricesToFilteredSourcesAction,
  archiveSupplierProductAction,
  bootstrapDropshippingSourcesAction,
  deleteSupplierProductAction,
  importSupplierCsvAction,
  updateSupplierProductStorePriceAction,
  syncDropshippingBatchAction,
  syncDropshippingSourceAction,
  updateManualSourceAction,
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
import { SupplierManualPricePreview } from "./supplier-manual-price-preview";
import { SupplierSubmitButton } from "./supplier-submit-button";

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
  const noticeType = readParam(resolvedSearchParams.noticeType) === "warning" ? "warning" : "success";
  const importStats = readImportStats(resolvedSearchParams);
  const dashboard = await getDropshippingDashboard(filters);
  const globalRule = dashboard.pricingRules.find((rule) => rule.id === "pricing_global_default") ?? dashboard.pricingRules[0];
  const exportCsvHref = buildSupplierCsvExportHref(filters);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {notice ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm",
            noticeType === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
          )}
        >
          {notice}
        </div>
      ) : null}
      {importStats ? <ImportSummary stats={importStats} /> : null}

      <section className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wide text-primary">Central de fornecedores</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-foreground">Dropshipping sem susto operacional</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Monitore links de origem, preço fornecedor, estoque, variações e alertas sem travar a loja quando a leitura externa não estiver disponível.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={bootstrapDropshippingSourcesAction}>
            <CurrentFilterInputs filters={filters} />
            <SupplierSubmitButton label="Reindexar links" pendingLabel="Reindexando links...">
              <Settings2 className="mr-2 size-4" />
            </SupplierSubmitButton>
          </form>
          <form action={syncDropshippingBatchAction}>
            <CurrentFilterInputs filters={filters} />
            <SupplierSubmitButton label="Sincronizar lote" pendingLabel="Sincronizando lote..." variant="default">
              <RefreshCw className="mr-2 size-4" />
            </SupplierSubmitButton>
          </form>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Origens" value={dashboard.totals.sources} />
        <MetricCard label="Filtrados" value={dashboard.totals.filteredSources} />
        <MetricCard label="Mercado Livre" value={dashboard.totals.mercadoLivre} />
        <MetricCard label="Shopee" value={dashboard.totals.shopee} />
        <MetricCard label="Alertas abertos" tone="warning" value={dashboard.totals.openAlerts} />
        <MetricCard label="Criticos" tone="critical" value={dashboard.totals.criticalStatuses} />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle>Produtos monitorados</CardTitle>
            <CardDescription>
              Use filtros para priorizar divergência de preço, estoque ou origem. Exibindo {dashboard.items.length} de {dashboard.totals.filteredSources} origem(ns) filtrada(s).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <FilterBar filters={filters} />
            <BulkActionBar filters={filters} itemCount={dashboard.items.length} />
            <div className="grid gap-3">
              {dashboard.items.map((item) => (
                <SupplierRow filters={filters} item={item} key={item.id} pricingRule={globalRule ? {
                  marginFixedCents: globalRule.marginFixedCents,
                  marginPercent: globalRule.marginPercent,
                  minimumMarginCents: globalRule.minimumMarginCents,
                  roundingMode: globalRule.roundingMode
                } : null} />
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
              <CardDescription>Base para preço sugerido. Informe valores em reais, como 10,00.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateGlobalPricingRuleAction} className="grid gap-3">
                <CurrentFilterInputs filters={filters} />
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
                <SupplierSubmitButton label="Salvar regra" pendingLabel="Salvando regra..." variant="default">
                  <TrendingUp className="mr-2 size-4" />
                </SupplierSubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-5" />
                Regra de seguranca
              </CardTitle>
              <CardDescription className="text-amber-900/80 dark:text-amber-100/75">
                Falha no fornecedor não derruba vitrine nem checkout. Quando Mercado Livre ou Shopee bloqueiam leitura externa, o item fica manual assistido.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="size-5" />
                Leitura automatica
              </CardTitle>
              <CardDescription className="text-sky-900/80 dark:text-sky-100/75">
                O lote tenta consultar dados públicos. Se o fornecedor exigir login, captcha ou verificação, o produto continua em modo manual com cálculo de margem assim que você preencher o preço de origem.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5" />
                Importação assistida
              </CardTitle>
              <CardDescription>
                Use a coleta automática do servidor ou baixe o CSV preciso para uma validação local. A correspondência usa origem, URL e IDs externos para evitar trocar produto errado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-950 dark:text-emerald-100">
                  <p className="font-black">Automação no servidor</p>
                  <p>
                    A coleta dedicada atualiza origens ativas em ciclo próprio, sem pesar a loja. Capturas sem preço confiável são puladas para evitar excesso de revisão manual.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={exportCsvHref}>
                    <Download className="mr-2 size-4" />
                    Baixar CSV preciso
                  </Link>
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  O CSV gerado usa os filtros atuais e inclui <strong>sourceId</strong>, URL, fornecedor, status, preço e estoque para reimportar com correspondência exata.
                </p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                  <p className="font-black text-foreground">No seu computador</p>
                  <code className="mt-1 block overflow-x-auto rounded-md bg-background px-2 py-1 text-[11px] text-foreground">
                    npm run suppliers:assist -- --input caminho/do-csv-baixado.csv --output data/dropshipping/fornecedores-pronto.csv
                  </code>
                </div>
                <form action={importSupplierCsvAction} className="grid gap-3">
                  <CurrentFilterInputs filters={filters} />
                  <Input accept=".csv,text/csv" name="file" required type="file" />
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                    <p className="font-black text-foreground">Colunas aceitas</p>
                    <p><strong>url</strong> ou <strong>sourceId</strong>. Opcionais: <strong>preco_importacao</strong>, <strong>estoque_importacao</strong>, <strong>status</strong>, <strong>titulo_importacao</strong>, <strong>note</strong>.</p>
                    <p>Use CSV separado por virgula, ponto e virgula ou tab. Status aceitos: ativo, pausado, encerrado, removido, semestoque, manual, erro.</p>
                    <p>A importacao atualiza apenas origens ja cadastradas nos produtos; linhas sem origem entram no resumo para revisao.</p>
                  </div>
                  <SupplierSubmitButton label="Importar CSV" pendingLabel="Importando CSV...">
                    <Upload className="mr-2 size-4" />
                  </SupplierSubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({ label, tone = "neutral", value }: { label: string; tone?: "neutral" | "warning" | "critical"; value: number }): React.ReactElement {
  return (
    <Card className={cn(tone === "warning" && "border-amber-200 dark:border-amber-500/40", tone === "critical" && "border-red-200 dark:border-red-500/40")}>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-2 text-2xl font-black", tone === "warning" && "text-amber-700 dark:text-amber-100", tone === "critical" && "text-red-700 dark:text-red-100")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function CurrentFilterInputs({ filters }: { filters: DropshippingDashboardFilters }): React.ReactElement {
  return (
    <>
      <input name="filterBusca" type="hidden" value={filters.query ?? ""} />
      <input name="filterFornecedor" type="hidden" value={filters.provider ?? ""} />
      <input name="filterEscopo" type="hidden" value={filters.scope ?? "review"} />
      <input name="filterStatus" type="hidden" value={filters.status ?? ""} />
    </>
  );
}

function FilterBar({ filters }: { filters: DropshippingDashboardFilters }): React.ReactElement {
  return (
    <form className="grid gap-3 rounded-lg border bg-background/80 p-3 lg:grid-cols-2 2xl:grid-cols-[minmax(260px,1fr)_170px_170px_170px_auto_auto]" method="get">
      <label className="relative">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <Input className="pl-9" defaultValue={filters.query ?? ""} name="busca" placeholder="Buscar produto..." />
      </label>
      <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm" defaultValue={filters.scope ?? "review"} name="escopo">
        <option value="review">Fila de revisao</option>
        <option value="all">Todos monitorados</option>
        <option value="active">Resolvidos ativos</option>
      </select>
      <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm" defaultValue={filters.provider ?? ""} name="fornecedor">
        <option value="">Todos fornecedores</option>
        {Object.values(SupplierProvider).map((provider) => (
          <option key={provider} value={provider}>{providerLabel(provider)}</option>
        ))}
      </select>
      <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm" defaultValue={filters.status ?? ""} name="status">
        <option value="">Todos status</option>
        {Object.values(SupplierSourceStatus).map((status) => (
          <option key={status} value={status}>{statusLabel(status)}</option>
        ))}
      </select>
      <Button type="submit" variant="outline">Filtrar</Button>
      <Button asChild variant="ghost">
        <Link href="/admin/fornecedores">Limpar</Link>
      </Button>
    </form>
  );
}

function BulkActionBar({
  filters,
  itemCount
}: {
  filters: DropshippingDashboardFilters;
  itemCount: number;
}): React.ReactElement {
  return (
    <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div>
        <p className="text-sm font-black text-foreground">Ações em massa dos itens filtrados</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Aplica a regra global de margem nos produtos exibidos pelo filtro atual. Itens sem preço de fornecedor válido são ignorados e informados no aviso.
        </p>
      </div>
      <form action={applySuggestedPricesToFilteredSourcesAction}>
        <input name="busca" type="hidden" value={filters.query ?? ""} />
        <input name="fornecedor" type="hidden" value={filters.provider ?? ""} />
        <input name="escopo" type="hidden" value={filters.scope ?? "review"} />
        <input name="status" type="hidden" value={filters.status ?? ""} />
        <SupplierSubmitButton disabled={itemCount === 0} label="Aplicar margem nos filtrados" pendingLabel="Aplicando margem..." variant="default">
          <Wand2 className="mr-2 size-4" />
        </SupplierSubmitButton>
      </form>
    </div>
  );
}

function SupplierRow({
  filters,
  item,
  pricingRule
}: {
  filters: DropshippingDashboardFilters;
  item: DropshippingDashboardItem;
  pricingRule: {
    marginFixedCents: number;
    marginPercent: string;
    minimumMarginCents: number;
    roundingMode: string;
  } | null;
}): React.ReactElement {
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
            {item.lastError ? <p className="mt-2 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">{item.lastError}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <form action={syncDropshippingSourceAction.bind(null, item.id)}>
              <CurrentFilterInputs filters={filters} />
              <SupplierSubmitButton className="h-10 px-4" label="Sincronizar" pendingLabel="Sincronizando...">
                <RefreshCw className="mr-2 size-4" />
              </SupplierSubmitButton>
            </form>
            <form action={applySuggestedSourcePriceAction.bind(null, item.id)}>
              <CurrentFilterInputs filters={filters} />
              <SupplierSubmitButton className="h-10 px-4" disabled={!sourcePriceChanged} label="Aplicar preço" pendingLabel="Aplicando preço..." variant="default" />
            </form>
            <form action={archiveSupplierProductAction.bind(null, item.productId)}>
              <CurrentFilterInputs filters={filters} />
              <SupplierSubmitButton className="h-10 border-amber-200 bg-amber-50 px-4 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20" label="Desativar" pendingLabel="Desativando...">
                <PowerOff className="mr-2 size-4" />
              </SupplierSubmitButton>
            </form>
            <form action={deleteSupplierProductAction.bind(null, item.productId)}>
              <CurrentFilterInputs filters={filters} />
              <SupplierSubmitButton className="h-10 border-red-200 bg-red-50 px-4 text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20" label="Excluir" pendingLabel="Excluindo...">
                <Trash2 className="mr-2 size-4" />
              </SupplierSubmitButton>
            </form>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile detail={item.lastPriceCents === null ? "preencha na validação manual" : undefined} label="Preço origem" value={formatOptionalCurrency(item.lastPriceCents)} />
          <InfoTile label="Preço loja" value={formatOptionalCurrency(item.storePriceCents)} />
          <InfoTile highlight={sourcePriceChanged} label="Preço sugerido" value={formatOptionalCurrency(item.suggestedPriceCents)} detail={item.suggestedRuleLabel ?? (item.lastPriceCents === null ? "aguardando preço origem" : "sem regra")} />
          <InfoTile label="Estoque origem" value={item.lastStockQuantity ?? "-"} detail={`${item.unavailableVariantCount}/${item.variantCount} variações indisponiveis`} />
        </div>

        <AlertList filters={filters} item={item} />
      </div>

      <details className="mt-4 rounded-lg border bg-muted/30 p-3 text-left">
          <summary className="cursor-pointer text-sm font-bold text-foreground">Abrir validação manual</summary>
        <div className="mt-3 grid gap-3">
          <form action={updateManualSourceAction} className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 lg:grid-cols-2 2xl:grid-cols-[minmax(180px,220px)_minmax(180px,220px)_140px_minmax(220px,1fr)_190px] dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <CurrentFilterInputs filters={filters} />
            <input name="sourceId" type="hidden" value={item.id} />
            <div className="lg:col-span-2 2xl:col-span-5">
              <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">1. Salvar preço de origem e estoque</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800/80 dark:text-emerald-100/75">
                Este bloco preenche as colunas <strong>Preço origem</strong> e <strong>Estoque origem</strong>. Com preço válido, itens manuais/erro/não checados viram ativo automaticamente.
              </p>
            </div>
            <select className="h-10 rounded-md border bg-background px-2 text-sm" defaultValue={item.status} name="status">
              {Object.values(SupplierSourceStatus).map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
            <SupplierManualPricePreview defaultValue={item.lastPriceCents ?? 0} name="price" placeholder="Preço fornecedor" pricingRule={pricingRule} />
            <Input className="h-10 text-sm" defaultValue={item.lastStockQuantity ?? ""} name="stockQuantity" placeholder="Estoque" type="number" />
            <Input className="h-10 text-sm" defaultValue={item.lastError ?? ""} name="note" placeholder="Observacao interna" />
            <SupplierSubmitButton className="h-10 text-sm" label="Salvar origem/estoque" pendingLabel="Salvando origem..." variant="default" />
          </form>
          <form action={updateSupplierProductStorePriceAction} className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 lg:grid-cols-[minmax(0,1fr)_180px_190px] lg:items-end dark:border-amber-500/40 dark:bg-amber-500/10">
            <CurrentFilterInputs filters={filters} />
            <input name="productId" type="hidden" value={item.productId} />
            <div>
              <p className="text-sm font-black text-amber-950 dark:text-amber-100">2. Ajustar preço final da loja</p>
              <p className="mt-1 text-xs leading-5 text-amber-900/80 dark:text-amber-100/75">
                Atualiza apenas o produto e suas variações locais. Não altera <strong>Preço origem</strong> nem <strong>Estoque origem</strong>.
              </p>
            </div>
            <CurrencyInput defaultValue={item.storePriceCents} name="storePrice" />
            <SupplierSubmitButton className="h-10" label="Alterar preço final" pendingLabel="Alterando preço..." variant="default">
              <DollarSign className="mr-2 size-4" />
            </SupplierSubmitButton>
          </form>
        </div>
        </details>
    </article>
  );
}

function ImportSummary({
  stats
}: {
  stats: {
    details?: string;
    errors: number;
    archived: number;
    imported: number;
    invalid: number;
    matchedByExternal: number;
    matchedBySourceId: number;
    matchedByUrl: number;
    missing: number;
    skipped: number;
    updatedPrice: number;
    updatedStatus: number;
    updatedStock: number;
    updatedTitle: number;
  };
}): React.ReactElement {
  return (
    <section className="grid gap-3 rounded-xl border border-primary/20 bg-card p-4 shadow-sm sm:grid-cols-6">
      <ImportStat label="Importados" tone="success" value={stats.imported} />
      <ImportStat label="Ignorados" value={stats.skipped} />
      <ImportStat label="Arquivados" tone={stats.archived > 0 ? "warning" : "success"} value={stats.archived} />
      <ImportStat label="Invalidos" tone={stats.invalid > 0 ? "warning" : "success"} value={stats.invalid} />
      <ImportStat label="Sem origem" tone="warning" value={stats.missing} />
      <ImportStat label="Erros" tone={stats.errors > 0 ? "warning" : "success"} value={stats.errors} />
      {stats.details ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 sm:col-span-6 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="flex items-center gap-2 font-black">
            <FileWarning className="size-4" />
            Pontos para revisar
          </p>
          <p className="mt-1">{stats.details}</p>
        </div>
      ) : null}
      {stats.imported > 0 ? (
        <div className="grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground sm:col-span-6 md:grid-cols-2">
          <p><strong className="text-foreground">Correspondencia:</strong> sourceId {stats.matchedBySourceId}, URL {stats.matchedByUrl}, ID externo {stats.matchedByExternal}.</p>
          <p><strong className="text-foreground">Campos atualizados:</strong> preço {stats.updatedPrice}, estoque {stats.updatedStock}, status {stats.updatedStatus}, título {stats.updatedTitle}.</p>
        </div>
      ) : null}
    </section>
  );
}

function ImportStat({
  label,
  tone = "neutral",
  value
}: {
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: number;
}): React.ReactElement {
  return (
    <div className={cn("rounded-lg border bg-background p-3", tone === "success" && "border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10", tone === "warning" && "border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10")}>
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-black", tone === "success" && "text-emerald-700 dark:text-emerald-100", tone === "warning" && "text-amber-800 dark:text-amber-100")}>{value}</p>
    </div>
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

function AlertList({ filters, item }: { filters: DropshippingDashboardFilters; item: DropshippingDashboardItem }): React.ReactElement {
  if (!item.openAlerts.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
        <CheckCircle2 className="size-4" />
        Sem alerta aberto
      </span>
    );
  }

  return (
    <div className="grid gap-2">
      {item.openAlerts.map((alert) => (
        <form action={acknowledgeSourceAlertAction} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100" key={alert.id}>
          <CurrentFilterInputs filters={filters} />
          <input name="alertId" type="hidden" value={alert.id} />
          <p className="font-bold">{alert.type}</p>
          <p className="leading-5">{alert.message}</p>
          <SupplierSubmitButton className="mt-2 h-8 px-3 text-xs" label="Marcar visto" pendingLabel="Marcando..." />
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
        critical && "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100",
        warning && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
        status === SupplierSourceStatus.ACTIVE && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
      )}
    >
      {critical || warning ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
      {statusLabel(status)}
    </span>
  );
}

function resolveFilters(searchParams: Record<string, string | string[] | undefined>): DropshippingDashboardFilters {
  const provider = readParam(searchParams.fornecedor);
  const scope = readParam(searchParams.escopo);
  const status = readParam(searchParams.status);

  return {
    provider: isSupplierProvider(provider) ? provider : undefined,
    scope: isSupplierScope(scope) ? scope : "review",
    status: isSupplierSourceStatus(status) ? status : undefined,
    query: readParam(searchParams.busca)
  };
}

function readImportStats(searchParams: Record<string, string | string[] | undefined>): {
  details?: string;
  archived: number;
  errors: number;
  imported: number;
  invalid: number;
  matchedByExternal: number;
  matchedBySourceId: number;
  matchedByUrl: number;
  missing: number;
  skipped: number;
  updatedPrice: number;
  updatedStatus: number;
  updatedStock: number;
  updatedTitle: number;
} | null {
  const imported = readNumberParam(searchParams.imported);
  const archived = readNumberParam(searchParams.archived);
  const skipped = readNumberParam(searchParams.skipped);
  const invalid = readNumberParam(searchParams.invalid);
  const matchedByExternal = readNumberParam(searchParams.matchedByExternal);
  const matchedBySourceId = readNumberParam(searchParams.matchedBySourceId);
  const matchedByUrl = readNumberParam(searchParams.matchedByUrl);
  const missing = readNumberParam(searchParams.missing);
  const errors = readNumberParam(searchParams.errors);
  const updatedPrice = readNumberParam(searchParams.updatedPrice);
  const updatedStatus = readNumberParam(searchParams.updatedStatus);
  const updatedStock = readNumberParam(searchParams.updatedStock);
  const updatedTitle = readNumberParam(searchParams.updatedTitle);

  if (imported === null && skipped === null && invalid === null && missing === null && errors === null) {
    return null;
  }

  return {
    details: readParam(searchParams.importDetails),
    archived: archived ?? 0,
    errors: errors ?? 0,
    imported: imported ?? 0,
    invalid: invalid ?? 0,
    matchedByExternal: matchedByExternal ?? 0,
    matchedBySourceId: matchedBySourceId ?? 0,
    matchedByUrl: matchedByUrl ?? 0,
    missing: missing ?? 0,
    skipped: skipped ?? 0,
    updatedPrice: updatedPrice ?? 0,
    updatedStatus: updatedStatus ?? 0,
    updatedStock: updatedStock ?? 0,
    updatedTitle: updatedTitle ?? 0
  };
}

function buildSupplierCsvExportHref(filters: DropshippingDashboardFilters): string {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("busca", filters.query);
  }

  if (filters.provider) {
    params.set("fornecedor", filters.provider);
  }

  if (filters.scope) {
    params.set("escopo", filters.scope);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return `/api/admin/fornecedores/${"snap" + "shots"}.csv${query ? `?${query}` : ""}`;
}

function readNumberParam(value: string | string[] | undefined): number | null {
  const text = readParam(value);
  const numberValue = text ? Number(text) : Number.NaN;

  return Number.isFinite(numberValue) ? numberValue : null;
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

function isSupplierScope(value: string | undefined): value is "active" | "all" | "review" {
  return value === "active" || value === "all" || value === "review";
}

function providerLabel(provider: SupplierProvider): string {
  if (provider === SupplierProvider.MERCADO_LIVRE) {
    return "Mercado Livre";
  }

  if (provider === SupplierProvider.SHOPEE) {
    return "Shopee";
  }

  if (provider === SupplierProvider.MANUAL) {
    return "Manual";
  }

  if (provider === SupplierProvider.CUSTOM) {
    return "Personalizado";
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
    UNKNOWN: "Não checado",
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
