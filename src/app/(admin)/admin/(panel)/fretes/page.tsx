import { createManualShippingRate, deleteManualShippingRate, updateManualShippingRate } from "@/actions/shipping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";
import { formatCurrency } from "@/lib/format";
import { getAdminManualShippingRates } from "@/lib/shipping/manual-rates";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const [rates, theme] = await Promise.all([
    getAdminManualShippingRates(),
    getStorefrontTheme()
  ]);

  return (
    <main>
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 border-b pb-5">
          <p className="text-sm text-muted-foreground">Operacao / Fretes</p>
          <h1 className="text-2xl font-bold tracking-normal">Fretes manuais</h1>
          <p className="max-w-3xl text-sm text-muted-foreground text-pretty">
            Configure opções de entrega usadas quando o Melhor Envio não estiver ativo, ou como fallback operacional.
            O frete gratis continua valendo acima de {formatCurrency(theme.freeShippingThresholdCents)}.
          </p>
        </div>

        <section className="rounded-lg border bg-background p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-normal">Novo frete manual</h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Use prefixos de CEP para limitar regioes. Deixe vazio para atender todo o Brasil.
              </p>
            </div>
          </div>
          <ManualShippingRateForm action={createManualShippingRate} submitLabel="Criar frete" />
        </section>

        <section className="rounded-lg border bg-background p-5">
          <h2 className="text-base font-semibold tracking-normal">Fretes cadastrados</h2>
          <div className="mt-4 grid gap-4">
            {rates.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Nenhum frete manual cadastrado. Enquanto essa lista estiver vazia, o sistema usa as opcoes manuais padrao como contingencia.
              </div>
            ) : null}
            {rates.map((rate) => (
              <details className="group rounded-lg border bg-background" key={rate.id}>
                <summary className="grid cursor-pointer list-none gap-3 p-4 transition hover:bg-muted/40 md:grid-cols-[minmax(220px,1fr)_120px_120px_minmax(180px,0.8fr)_24px] md:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold tracking-normal">{rate.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {rate.description || "Sem descrição exibida no checkout"}
                    </p>
                  </div>
                  <StatusPill active={rate.isActive} />
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(rate.priceCents)}</span>
                  <span className="text-sm text-muted-foreground">
                    {rate.estimatedBusinessDays} dia(s) uteis · ordem {rate.sortOrder}
                  </span>
                  <span className="text-xl text-muted-foreground transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>

                <div className="border-t p-4">
                  <div className="mb-4 grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Subtotal" value={formatRange(rate.minSubtotalCents, rate.maxSubtotalCents, formatCurrency)} />
                    <Info label="Quantidade" value={formatRange(rate.minItems, rate.maxItems, String)} />
                    <Info label="CEPs" value={rate.postalCodePrefixes.length > 0 ? rate.postalCodePrefixes.join(", ") : "Todo o Brasil"} />
                    <Info label="Status" value={rate.isActive ? "Ativo no checkout" : "Oculto no checkout"} />
                  </div>
                  <ManualShippingRateForm
                    action={updateManualShippingRate.bind(null, rate.id)}
                    defaultValues={{
                      description: rate.description ?? "",
                      estimatedBusinessDays: String(rate.estimatedBusinessDays),
                      isActive: rate.isActive,
                      maxItems: rate.maxItems ? String(rate.maxItems) : "",
                      maxSubtotalCents: rate.maxSubtotalCents ? moneyInputValue(rate.maxSubtotalCents) : "",
                      minItems: rate.minItems ? String(rate.minItems) : "",
                      minSubtotalCents: rate.minSubtotalCents ? moneyInputValue(rate.minSubtotalCents) : "",
                      name: rate.name,
                      postalCodePrefixes: rate.postalCodePrefixes.join(", "),
                      priceCents: moneyInputValue(rate.priceCents),
                      sortOrder: String(rate.sortOrder)
                    }}
                    submitLabel="Salvar alteracoes"
                  />
                  <form action={deleteManualShippingRate.bind(null, rate.id)} className="mt-4 border-t pt-4">
                    <Button type="submit" variant="destructive">
                      Excluir frete
                    </Button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

interface ManualShippingRateFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    description: string;
    estimatedBusinessDays: string;
    isActive: boolean;
    maxItems: string;
    maxSubtotalCents: string;
    minItems: string;
    minSubtotalCents: string;
    name: string;
    postalCodePrefixes: string;
    priceCents: string;
    sortOrder: string;
  };
  submitLabel: string;
}

function ManualShippingRateForm({
  action,
  defaultValues,
  submitLabel
}: ManualShippingRateFormProps): React.ReactElement {
  const values = defaultValues ?? {
    description: "",
    estimatedBusinessDays: "5",
    isActive: true,
    maxItems: "",
    maxSubtotalCents: "",
    minItems: "",
    minSubtotalCents: "",
    name: "",
    postalCodePrefixes: "",
    priceCents: "",
    sortOrder: "0"
  };

  return (
    <form action={action} className="mt-4 grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <TextField defaultValue={values.name} label="Nome" name="name" placeholder="Entrega padrao" required />
        <TextField defaultValue={values.priceCents} label="Valor" name="priceCents" placeholder="14,90" required />
        <TextField defaultValue={values.estimatedBusinessDays} label="Prazo em dias uteis" name="estimatedBusinessDays" type="number" required />
      </div>
      <TextField defaultValue={values.description} label="Descrição exibida no checkout" name="description" placeholder="Opção com melhor custo para sua região." />
      <div className="grid gap-4 lg:grid-cols-4">
        <TextField defaultValue={values.minSubtotalCents} label="Subtotal minimo" name="minSubtotalCents" placeholder="0,00" />
        <TextField defaultValue={values.maxSubtotalCents} label="Subtotal maximo" name="maxSubtotalCents" placeholder="99,89" />
        <TextField defaultValue={values.minItems} label="Qtd. minima" name="minItems" type="number" />
        <TextField defaultValue={values.maxItems} label="Qtd. maxima" name="maxItems" type="number" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px]">
        <TextField defaultValue={values.postalCodePrefixes} label="Prefixos de CEP" name="postalCodePrefixes" placeholder="01, 02, 87" />
        <TextField defaultValue={values.sortOrder} label="Ordem" name="sortOrder" type="number" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input defaultChecked={values.isActive} name="isActive" type="checkbox" />
          Frete ativo
        </label>
        <Button className="w-full sm:w-auto" type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  placeholder,
  required = false,
  type = "text"
}: {
  defaultValue: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function StatusPill({ active }: { active: boolean }): React.ReactElement {
  return (
    <span className={active
      ? "w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800"
      : "w-fit rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800"
    }>
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="truncate font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatRange(
  minValue: number | null,
  maxValue: number | null,
  formatter: (value: number) => string
): string {
  if (minValue === null && maxValue === null) {
    return "Sem limite";
  }

  if (minValue !== null && maxValue !== null) {
    return `${formatter(minValue)} a ${formatter(maxValue)}`;
  }

  return minValue !== null ? `A partir de ${formatter(minValue)}` : `Até ${formatter(maxValue ?? 0)}`;
}

function moneyInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
