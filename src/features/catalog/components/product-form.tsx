"use client";

import { useMemo, useRef, useState } from "react";
import type { Category } from "@/generated/prisma/client";
import {
  Bold,
  Boxes,
  ClipboardList,
  Code2,
  ImageIcon,
  Italic,
  Layers3,
  Link2,
  List,
  ListOrdered,
  Plus,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Type,
  Video
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductImageUploader } from "@/features/catalog/components/product-image-uploader";
import { getImageUrls } from "@/features/catalog/image-utils";
import { MediaLibraryPicker } from "@/features/media/components/media-library-picker";
import type { ProductListItem } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/format";

interface ProductFormProps {
  action: (formData: FormData) => Promise<void>;
  categories: Category[];
  product?: ProductListItem;
}

interface VariantOptionRow {
  name: string;
  value: string;
}

interface VariantFormRow {
  barcode: string;
  compareAtPrice: string;
  id: string;
  imageUrl: string;
  isActive: boolean;
  options: VariantOptionRow[];
  price: string;
  sku: string;
  stockQuantity: string;
  title: string;
  weightGrams: string;
}

interface MetafieldFormRow {
  id: string;
  key: string;
  namespace: string;
  type: string;
  value: string;
}

const metafieldTypes = [
  "Texto curto",
  "Texto longo",
  "Numero",
  "URL",
  "Cor",
  "Booleano",
  "Referencia"
];

const optionNameSuggestions = ["Cor", "Tamanho", "Sexo", "Material", "Estilo", "Modelo", "Idade", "Idioma"];
const optionValueSuggestions = [
  "Azul",
  "Preto",
  "Branco",
  "Vermelho",
  "Rosa",
  "Verde",
  "Amarelo",
  "P",
  "M",
  "G",
  "GG",
  "Masculino",
  "Feminino",
  "Unissex",
  "Adulto",
  "Infantil"
];

const productStatusOptions = [
  { label: "Rascunho", value: "DRAFT" },
  { label: "Ativo", value: "ACTIVE" },
  { label: "Arquivado", value: "ARCHIVED" }
];

export function ProductForm({ categories, product, action }: ProductFormProps): React.ReactElement {
  const imageUrls = getImageUrls(product?.images).join("\n");
  const [variants, setVariants] = useState<VariantFormRow[]>(() => getInitialVariantRows(product));
  const [metafields, setMetafields] = useState<MetafieldFormRow[]>(() => getInitialMetafields(product?.metafields));
  const [descriptionHtml, setDescriptionHtml] = useState(product?.description ?? "");
  const [descriptionMediaIntent, setDescriptionMediaIntent] = useState<"image" | "video" | null>(null);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const firstVariant = variants[0] ?? createVariantRow();
  const totalStock = variants.reduce((sum, variant) => sum + (Number.parseInt(variant.stockQuantity, 10) || 0), 0);
  const activeVariants = variants.filter((variant) => variant.isActive).length;
  const variantsPayload = useMemo(() => serializeVariants(variants), [variants]);
  const metafieldsPayload = useMemo(() => serializeMetafields(metafields), [metafields]);

  function syncDescriptionFromEditor(): void {
    const nextDescription = descriptionEditorRef.current?.innerHTML ?? "";

    setDescriptionHtml(nextDescription);
    if (descriptionInputRef.current) {
      descriptionInputRef.current.value = nextDescription;
    }
  }

  function runEditorCommand(command: string, value?: string): void {
    descriptionEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncDescriptionFromEditor();
  }

  function insertEditorHtml(html: string): void {
    descriptionEditorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncDescriptionFromEditor();
  }

  function insertPromptedLink(): void {
    const url = window.prompt("URL do link");

    if (url) {
      runEditorCommand("createLink", url);
    }
  }

  function insertMediaFromLibrary(url: string, kind: "image" | "video"): void {
    if (kind === "image") {
      insertEditorHtml(`<img src="${escapeAttribute(url)}" alt="" />`);
    } else {
      insertEditorHtml(`<video controls src="${escapeAttribute(url)}"></video>`);
    }

    setDescriptionMediaIntent(null);
  }

  function syncDescriptionBeforeSubmit(): void {
    if (showHtmlSource) {
      if (descriptionInputRef.current) {
        descriptionInputRef.current.value = descriptionHtml;
      }
      return;
    }

    syncDescriptionFromEditor();
  }

  function updateVariant(id: string, patch: Partial<VariantFormRow>): void {
    setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
  }

  function updateVariantOption(variantId: string, optionIndex: number, patch: Partial<VariantOptionRow>): void {
    setVariants((current) =>
      current.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }

        const options = variant.options.map((option, index) =>
          index === optionIndex ? { ...option, ...patch } : option
        );

        return { ...variant, options };
      })
    );
  }

  function removeVariant(id: string): void {
    setVariants((current) => (current.length > 1 ? current.filter((variant) => variant.id !== id) : current));
  }

  function duplicateVariant(id: string): void {
    setVariants((current) => {
      const source = current.find((variant) => variant.id === id);

      if (!source) {
        return current;
      }

      return [
        ...current,
        createVariantRow({
          ...source,
          id: createRowId("variant"),
          sku: source.sku ? `${source.sku}-COPIA` : "",
          title: `${source.title || "Variacao"} copia`
        })
      ];
    });
  }

  function updateMetafield(id: string, patch: Partial<MetafieldFormRow>): void {
    setMetafields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }

  function removeMetafield(id: string): void {
    setMetafields((current) => current.filter((field) => field.id !== id));
  }

  return (
    <form action={action} className="grid gap-6" onSubmit={syncDescriptionBeforeSubmit}>
      <input name="sku" type="hidden" value={firstVariant.sku} />
      <input name="stockQuantity" type="hidden" value={firstVariant.stockQuantity || "0"} />
      <textarea className="hidden" defaultValue={descriptionHtml} name="description" readOnly ref={descriptionInputRef} />
      <textarea className="hidden" name="variants" readOnly value={variantsPayload} />
      <textarea className="hidden" name="metafields" readOnly value={metafieldsPayload} />
      <datalist id="product-variant-option-names">
        {optionNameSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="product-variant-option-values">
        {optionValueSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Catalogo / Produtos</p>
          <h1 className="text-2xl font-bold tracking-normal">{product ? "Editar produto" : "Novo produto"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            Estruture conteudo, midia, organizacao, variacoes, estoque e metacampos em um fluxo visual.
          </p>
        </div>
        <Button className="w-full sm:w-auto" type="submit">Salvar produto</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={ClipboardList} title="Dados principais" />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium lg:col-span-2">
                Titulo
                <Input defaultValue={product?.title} name="title" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input defaultValue={product?.slug} name="slug" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Marca / fornecedor
                <Input defaultValue={product?.brand ?? ""} name="brand" />
              </label>
              <label className="grid gap-2 text-sm font-medium lg:col-span-2">
                Descricao curta
                <Input defaultValue={product?.shortDescription ?? ""} name="shortDescription" />
              </label>
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Type} title="Descricao completa" />
            <div className="mt-4 overflow-hidden rounded-md border">
              <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2">
                <EditorButton label="Negrito" icon={Bold} onClick={() => runEditorCommand("bold")} />
                <EditorButton label="Italico" icon={Italic} onClick={() => runEditorCommand("italic")} />
                <EditorButton label="Titulo" icon={Type} onClick={() => runEditorCommand("formatBlock", "h3")} />
                <EditorButton label="Lista" icon={List} onClick={() => runEditorCommand("insertUnorderedList")} />
                <EditorButton label="Lista numerada" icon={ListOrdered} onClick={() => runEditorCommand("insertOrderedList")} />
                <EditorButton label="Link" icon={Link2} onClick={insertPromptedLink} />
                <EditorButton
                  label="Imagem da midia"
                  icon={ImageIcon}
                  onClick={() => setDescriptionMediaIntent((current) => (current === "image" ? null : "image"))}
                  pressed={descriptionMediaIntent === "image"}
                />
                <EditorButton
                  label="Video da midia"
                  icon={Video}
                  onClick={() => setDescriptionMediaIntent((current) => (current === "video" ? null : "video"))}
                  pressed={descriptionMediaIntent === "video"}
                />
                <EditorButton
                  label="HTML"
                  icon={Code2}
                  onClick={() => setShowHtmlSource((current) => !current)}
                  pressed={showHtmlSource}
                />
              </div>
              {descriptionMediaIntent ? (
                <div className="border-b bg-background p-3">
                  <MediaLibraryPicker
                    accept={descriptionMediaIntent}
                    buttonLabel={descriptionMediaIntent === "image" ? "Escolher imagem da Midia" : "Escolher video da Midia"}
                    onSelect={(url) => insertMediaFromLibrary(url, descriptionMediaIntent)}
                  />
                </div>
              ) : null}
              {showHtmlSource ? (
                <Textarea
                  className="min-h-[280px] rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
                  onChange={(event) => {
                    setDescriptionHtml(event.target.value);
                    if (descriptionInputRef.current) {
                      descriptionInputRef.current.value = event.target.value;
                    }
                  }}
                  value={descriptionHtml}
                />
              ) : (
                <div
                  className="min-h-[280px] bg-background p-4 text-sm leading-7 outline-none text-pretty [&_a]:font-semibold [&_a]:text-primary [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_iframe]:aspect-video [&_iframe]:w-full [&_img]:my-4 [&_img]:max-h-[520px] [&_img]:rounded-md [&_img]:object-contain [&_ol]:ml-5 [&_ol]:list-decimal [&_strong]:font-bold [&_ul]:ml-5 [&_ul]:list-disc [&_video]:my-4 [&_video]:w-full [&_video]:rounded-md"
                  contentEditable
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  onBlur={syncDescriptionFromEditor}
                  ref={descriptionEditorRef}
                  suppressContentEditableWarning
                />
              )}
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={ImageIcon} title="Midia" />
            <div className="mt-4">
              <ProductImageUploader defaultValue={imageUrls} />
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading icon={Layers3} title="Variacoes e estoque" />
              <Button
                className="w-full sm:w-auto"
                onClick={() => setVariants((current) => [...current, createVariantRow({ title: `Variacao ${current.length + 1}` })])}
                type="button"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar variacao
              </Button>
            </div>
            <div className="mt-4 grid gap-4">
              {variants.map((variant, index) => (
                <div className="rounded-lg border bg-muted/20 p-4" key={variant.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Variacao {index + 1}</p>
                      <p className="text-xs text-muted-foreground">Preco, estoque, SKU, midia e ate 3 opcoes de vitrine.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          checked={variant.isActive}
                          onChange={(event) => updateVariant(variant.id, { isActive: event.target.checked })}
                          type="checkbox"
                        />
                        Ativa
                      </label>
                      <Button onClick={() => duplicateVariant(variant.id)} size="sm" type="button" variant="outline">
                        Duplicar
                      </Button>
                      <Button
                        aria-label="Remover variacao"
                        disabled={variants.length === 1}
                        onClick={() => removeVariant(variant.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Nome">
                      <Input value={variant.title} onChange={(event) => updateVariant(variant.id, { title: event.target.value })} required />
                    </Field>
                    <Field label="SKU">
                      <Input value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} required />
                    </Field>
                    <Field label="Preco">
                      <Input value={variant.price} onChange={(event) => updateVariant(variant.id, { price: event.target.value })} required />
                    </Field>
                    <Field label="Estoque">
                      <Input min={0} type="number" value={variant.stockQuantity} onChange={(event) => updateVariant(variant.id, { stockQuantity: event.target.value })} />
                    </Field>
                    <Field label="Preco comparativo">
                      <Input value={variant.compareAtPrice} onChange={(event) => updateVariant(variant.id, { compareAtPrice: event.target.value })} />
                    </Field>
                    <Field label="Codigo de barras">
                      <Input value={variant.barcode} onChange={(event) => updateVariant(variant.id, { barcode: event.target.value })} />
                    </Field>
                    <Field label="Peso (g)">
                      <Input min={0} type="number" value={variant.weightGrams} onChange={(event) => updateVariant(variant.id, { weightGrams: event.target.value })} />
                    </Field>
                    <Field label="Imagem da variacao">
                      <Input readOnly value={variant.imageUrl} placeholder="Selecione no modulo Midia" />
                      <div className="grid gap-2">
                        <MediaLibraryPicker
                          accept="image"
                          buttonLabel="Vincular imagem da Midia"
                          onSelect={(url) => updateVariant(variant.id, { imageUrl: url })}
                        />
                        {variant.imageUrl ? (
                          <Button onClick={() => updateVariant(variant.id, { imageUrl: "" })} type="button" variant="ghost">
                            Limpar imagem
                          </Button>
                        ) : null}
                      </div>
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {variant.options.map((option, optionIndex) => (
                      <div className="grid gap-2 rounded-md border bg-background p-3" key={`${variant.id}-${optionIndex}`}>
                        <span className="text-xs font-semibold text-muted-foreground">Opcao {optionIndex + 1}</span>
                        <Input
                          aria-label={`Nome da opcao ${optionIndex + 1}`}
                          list="product-variant-option-names"
                          placeholder="Cor"
                          value={option.name}
                          onChange={(event) => updateVariantOption(variant.id, optionIndex, { name: event.target.value })}
                        />
                        <Input
                          aria-label={`Valor da opcao ${optionIndex + 1}`}
                          list="product-variant-option-values"
                          placeholder="Azul"
                          value={option.value}
                          onChange={(event) => updateVariantOption(variant.id, optionIndex, { value: event.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading icon={Sparkles} title="Metacampos" />
              <Button
                className="w-full sm:w-auto"
                onClick={() => setMetafields((current) => [...current, createMetafieldRow()])}
                type="button"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar campo
              </Button>
            </div>
            <div className="mt-4 grid gap-3">
              {metafields.length === 0 ? (
                <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                  Nenhum metacampo cadastrado. Adicione campos para especificacoes, filtros, SEO ou dados internos.
                </div>
              ) : null}
              {metafields.map((field) => (
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 lg:grid-cols-[1fr_1fr_160px_2fr_auto]" key={field.id}>
                  <Field label="Namespace">
                    <Input value={field.namespace} onChange={(event) => updateMetafield(field.id, { namespace: event.target.value })} placeholder="custom" />
                  </Field>
                  <Field label="Chave">
                    <Input value={field.key} onChange={(event) => updateMetafield(field.id, { key: event.target.value })} placeholder="fabric" />
                  </Field>
                  <Field label="Tipo">
                    <select
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      onChange={(event) => updateMetafield(field.id, { type: event.target.value })}
                      value={field.type}
                    >
                      {metafieldTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Valor">
                    <Textarea className="min-h-10" value={field.value} onChange={(event) => updateMetafield(field.id, { value: event.target.value })} />
                  </Field>
                  <Button aria-label="Remover metacampo" className="self-end" onClick={() => removeMetafield(field.id)} size="icon" type="button" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Boxes} title="Publicacao" />
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Situacao
              <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={product?.status ?? "DRAFT"} name="status">
                {productStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Variacoes" value={`${activeVariants}/${variants.length}`} />
              <Metric label="Estoque" value={String(totalStock)} />
            </dl>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Tags} title="Organizacao" />
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Colecao / categoria
                <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={product?.categoryId ?? ""} name="categoryId">
                  <option value="">Sem colecao</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tags
                <Input defaultValue={product?.tags.join(", ") ?? ""} name="tags" placeholder="anime, camiseta, premium" />
              </label>
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Search} title="Precos base e SEO" />
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Preco base
                <Input defaultValue={product ? formatCurrency(product.priceCents) : ""} name="price" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Preco comparativo base
                <Input defaultValue={product?.compareAtPriceCents ? formatCurrency(product.compareAtPriceCents) : ""} name="compareAtPrice" />
              </label>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function EditorButton({
  icon: Icon,
  label,
  onClick,
  pressed = false
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}): React.ReactElement {
  return (
    <Button
      aria-label={label}
      aria-pressed={pressed}
      className="size-9"
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant={pressed ? "default" : "ghost"}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function SectionHeading({
  icon: Icon,
  title
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-base font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function getInitialVariantRows(product?: ProductListItem): VariantFormRow[] {
  if (!product || product.variants.length === 0) {
    return [createVariantRow()];
  }

  return product.variants.map((variant, index) => {
    const optionValues = getOptionValues(variant.optionValues);
    const options = Object.entries(optionValues)
      .filter(([name]) => name !== "_imageUrl")
      .slice(0, 3)
      .map(([name, value]) => ({ name, value }));

    return createVariantRow({
      barcode: variant.barcode ?? "",
      compareAtPrice: variant.compareAtPriceCents ? formatCurrency(variant.compareAtPriceCents) : "",
      id: variant.id,
      imageUrl: optionValues._imageUrl ?? "",
      isActive: variant.isActive,
      options: fillOptions(options),
      price: formatCurrency(variant.priceCents),
      sku: variant.sku,
      stockQuantity: String(variant.stockQuantity),
      title: variant.title || `Variacao ${index + 1}`,
      weightGrams: variant.weightGrams ? String(variant.weightGrams) : ""
    });
  });
}

function createVariantRow(overrides: Partial<VariantFormRow> = {}): VariantFormRow {
  return {
    barcode: "",
    compareAtPrice: "",
    id: overrides.id ?? createRowId("variant"),
    imageUrl: "",
    isActive: true,
    options: fillOptions(overrides.options ?? []),
    price: "",
    sku: "",
    stockQuantity: "0",
    title: "Padrao",
    weightGrams: "",
    ...overrides
  };
}

function fillOptions(options: VariantOptionRow[]): VariantOptionRow[] {
  const defaults = [
    { name: "Cor", value: "" },
    { name: "Tamanho", value: "" },
    { name: "Sexo", value: "" }
  ];

  return Array.from({ length: 3 }, (_, index) => options[index] ?? defaults[index]);
}

function getOptionValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, optionValue]) => optionValue !== null && optionValue !== undefined)
      .map(([name, optionValue]) => [name, String(optionValue)])
  );
}

function serializeVariants(variants: VariantFormRow[]): string {
  return variants
    .filter((variant) => variant.sku.trim() || variant.title.trim())
    .map((variant) => {
      const options = variant.options
        .filter((option) => option.name.trim() && option.value.trim())
        .map((option) => `${option.name.trim()}=${option.value.trim()}`);

      if (variant.imageUrl.trim()) {
        options.push(`_imageUrl=${variant.imageUrl.trim()}`);
      }

      return [
        variant.title.trim() || "Padrao",
        variant.sku.trim(),
        variant.price.trim(),
        variant.stockQuantity.trim() || "0",
        variant.compareAtPrice.trim(),
        variant.barcode.trim(),
        variant.weightGrams.trim(),
        variant.isActive ? "ativo" : "inativo",
        options.join(";")
      ].join(" | ");
    })
    .join("\n");
}

function getInitialMetafields(value: unknown): MetafieldFormRow[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).map(([fullKey, fieldValue], index) => {
    const [namespace, ...keyParts] = fullKey.split(".");

    return createMetafieldRow({
      id: `${fullKey}-${index}`,
      key: keyParts.join(".") || namespace,
      namespace: keyParts.length > 0 ? namespace : "custom",
      value: String(fieldValue)
    });
  });
}

function createMetafieldRow(overrides: Partial<MetafieldFormRow> = {}): MetafieldFormRow {
  return {
    id: overrides.id ?? createRowId("metafield"),
    key: "",
    namespace: "custom",
    type: "Texto curto",
    value: "",
    ...overrides
  };
}

function createRowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function serializeMetafields(fields: MetafieldFormRow[]): string {
  return fields
    .filter((field) => field.namespace.trim() && field.key.trim() && field.value.trim())
    .map((field) => `${field.namespace.trim()}.${field.key.trim()}=${field.value.trim()}`)
    .join("\n");
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
