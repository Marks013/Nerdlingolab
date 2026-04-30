"use client";

import { Fragment, useMemo, useRef, useState } from "react";
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
  Video,
  ChevronDown,
  ChevronRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SafeImage as Image } from "@/components/media/safe-image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductImageUploader } from "@/features/catalog/components/product-image-uploader";
import { getImageUrls } from "@/features/catalog/image-utils";
import { MediaLibraryPicker } from "@/features/media/components/media-library-picker";
import type { ProductListItem, ProductShippingPresetItem } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/format";

interface ProductFormProps {
  action: (formData: FormData) => Promise<void>;
  categories: Category[];
  product?: ProductListItem;
  shippingPresets: ProductShippingPresetItem[];
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
  heightCm: string;
  lengthCm: string;
  options: VariantOptionRow[];
  price: string;
  shippingLeadTimeDays: string;
  sku: string;
  stockQuantity: string;
  title: string;
  weightGrams: string;
  widthCm: string;
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

const metafieldNamespaceSuggestions = ["admin", "custom", "seo", "shipping", "supplier", "shopify"];
const metafieldKeySuggestions = [
  "originalProductUrl",
  "supplierSku",
  "supplierName",
  "care",
  "fabric",
  "shippingDays",
  "seoHidden"
];

const productStatusOptions = [
  { label: "Rascunho", value: "DRAFT" },
  { label: "Ativo", value: "ACTIVE" },
  { label: "Arquivado", value: "ARCHIVED" }
];

export function ProductForm({
  categories,
  product,
  action,
  shippingPresets: initialShippingPresets
}: ProductFormProps): React.ReactElement {
  const imageUrls = getImageUrls(product?.images).join("\n");
  const [variants, setVariants] = useState<VariantFormRow[]>(() => getInitialVariantRows(product));
  const [metafields, setMetafields] = useState<MetafieldFormRow[]>(() => getInitialMetafields(product?.metafields));
  const [shippingPresets, setShippingPresets] = useState<ProductShippingPresetItem[]>(initialShippingPresets);
  const [selectedShippingPresetId, setSelectedShippingPresetId] = useState("");
  const [newShippingPresetName, setNewShippingPresetName] = useState("");
  const [newShippingPresetWeight, setNewShippingPresetWeight] = useState("");
  const [newShippingPresetWeightUnit, setNewShippingPresetWeightUnit] = useState<"g" | "kg">("g");
  const [newShippingPresetHeight, setNewShippingPresetHeight] = useState("");
  const [newShippingPresetWidth, setNewShippingPresetWidth] = useState("");
  const [newShippingPresetLength, setNewShippingPresetLength] = useState("");
  const [newShippingPresetLeadTimeDays, setNewShippingPresetLeadTimeDays] = useState("");
  const [shippingPresetMessage, setShippingPresetMessage] = useState<string | null>(null);
  const [isSavingShippingPreset, setIsSavingShippingPreset] = useState(false);
  const [descriptionHtml, setDescriptionHtml] = useState(product?.description ?? "");
  const [descriptionMediaIntent, setDescriptionMediaIntent] = useState<"image" | "video" | null>(null);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [expandedVariantGroups, setExpandedVariantGroups] = useState<Set<string>>(() => new Set());
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const firstVariant = variants[0] ?? createVariantRow();
  const totalStock = variants.reduce((sum, variant) => sum + (Number.parseInt(variant.stockQuantity, 10) || 0), 0);
  const activeVariants = variants.filter((variant) => variant.isActive).length;
  const variantGroups = useMemo(() => groupVariantsByPrimaryOption(variants), [variants]);
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

        return {
          ...variant,
          options,
          title: buildVariantTitle(options, variant.title)
        };
      })
    );
  }

  function updateVariantImageLink(variantId: string, imageUrl: string): void {
    setVariants((current) => {
      const sourceVariant = current.find((variant) => variant.id === variantId);

      if (!sourceVariant) {
        return current;
      }

      const sourceColor = getVariantOptionValue(sourceVariant, "Cor");
      const sourceGender = getVariantOptionValue(sourceVariant, "Sexo");

      return current.map((variant) => {
        const sameColor = sourceColor && getVariantOptionValue(variant, "Cor") === sourceColor;
        const sameGender = sourceGender
          ? getVariantOptionValue(variant, "Sexo") === sourceGender
          : true;

        return variant.id === variantId || (sameColor && sameGender)
          ? { ...variant, imageUrl }
          : variant;
      });
    });
  }

  function addOptionValueToMatrix(optionName: "Cor" | "Tamanho" | "Sexo"): void {
    const value = window.prompt(`Novo valor para ${optionName}`);
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      return;
    }

    setVariants((current) => addMatrixOptionValue(current, optionName, normalizedValue));
  }

  function applyShippingPresetToAll(preset: ProductShippingPresetItem): void {
    setVariants((current) => current.map((variant) => applyShippingPresetToVariant(variant, preset)));
  }

  async function createShippingPreset(): Promise<void> {
    setShippingPresetMessage(null);

    const name = newShippingPresetName.trim();
    const weightValue = Number.parseFloat(newShippingPresetWeight.replace(",", "."));
    const weightGrams = newShippingPresetWeightUnit === "kg"
      ? Math.round(weightValue * 1000)
      : Math.round(weightValue);
    const heightCm = Number.parseInt(newShippingPresetHeight, 10);
    const widthCm = Number.parseInt(newShippingPresetWidth, 10);
    const lengthCm = Number.parseInt(newShippingPresetLength, 10);
    const shippingLeadTimeDays = newShippingPresetLeadTimeDays
      ? Number.parseInt(newShippingPresetLeadTimeDays, 10)
      : 0;

    if (
      name.length < 2
      || !Number.isFinite(weightGrams)
      || weightGrams <= 0
      || !Number.isFinite(heightCm)
      || !Number.isFinite(widthCm)
      || !Number.isFinite(lengthCm)
      || !Number.isFinite(shippingLeadTimeDays)
      || shippingLeadTimeDays < 0
    ) {
      setShippingPresetMessage("Informe nome, peso e dimensoes validos.");
      return;
    }

    setIsSavingShippingPreset(true);

    try {
      const response = await fetch("/api/admin/product-shipping-presets", {
        body: JSON.stringify({ heightCm, lengthCm, name, shippingLeadTimeDays, weightGrams, widthCm }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getApiMessage(payload) ?? "Nao foi possivel salvar o atalho.");
      }

      const preset = getShippingPresetFromPayload(payload);

      if (!preset) {
        throw new Error("Resposta invalida ao salvar o atalho.");
      }

      setShippingPresets((current) => upsertShippingPreset(current, preset));
      setSelectedShippingPresetId(preset.id);
      setNewShippingPresetName("");
      setNewShippingPresetWeight("");
      setNewShippingPresetHeight("");
      setNewShippingPresetWidth("");
      setNewShippingPresetLength("");
      setNewShippingPresetLeadTimeDays("");
      setShippingPresetMessage("Atalho salvo para proximos cadastros.");
    } catch (error) {
      setShippingPresetMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o atalho.");
    } finally {
      setIsSavingShippingPreset(false);
    }
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

  function toggleVariantGroup(groupKey: string): void {
    setExpandedVariantGroups((current) => {
      const next = new Set(current);

      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return next;
    });
  }

  function expandAllVariantGroups(): void {
    setExpandedVariantGroups(new Set(variantGroups.map((group) => group.key)));
  }

  function collapseAllVariantGroups(): void {
    setExpandedVariantGroups(new Set());
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
      <datalist id="product-metafield-namespaces">
        {metafieldNamespaceSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="product-metafield-keys">
        {metafieldKeySuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Catálogo / Produtos</p>
          <h1 className="text-2xl font-bold tracking-normal">{product ? "Editar produto" : "Novo produto"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            Estruture conteudo, midia, organizacao, variacoes, estoque e metacampos em um fluxo visual.
          </p>
        </div>
        <Button className="w-full sm:w-auto" type="submit">Salvar produto</Button>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
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
                Descrição curta
                <Input defaultValue={product?.shortDescription ?? ""} name="shortDescription" />
              </label>
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Type} title="Descrição completa" />
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={expandAllVariantGroups} type="button" variant="ghost">
                  Expandir tudo
                </Button>
                <Button className="w-full sm:w-auto" onClick={collapseAllVariantGroups} type="button" variant="ghost">
                  Recolher tudo
                </Button>
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
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <OptionSummary
                label="Cores"
                values={getMatrixOptionValues(variants, "Cor")}
                onAdd={() => addOptionValueToMatrix("Cor")}
              />
              <OptionSummary
                label="Tamanhos"
                values={getMatrixOptionValues(variants, "Tamanho")}
                onAdd={() => addOptionValueToMatrix("Tamanho")}
              />
              <OptionSummary
                label="Sexo"
                values={getMatrixOptionValues(variants, "Sexo")}
                onAdd={() => addOptionValueToMatrix("Sexo")}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Ao vincular uma imagem, ela e aplicada nas variantes da mesma Cor + Sexo. Valores novos podem ser digitados ou criados pelos botoes acima.
            </p>
            <div className="mt-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold tracking-normal">Atalhos logisticos</h3>
                  <p className="mt-1 max-w-2xl text-xs text-muted-foreground text-pretty">
                    Salve peso e dimensoes frequentes para preencher rapidamente as variantes e calcular o frete com mais precisao.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto]">
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    onChange={(event) => setSelectedShippingPresetId(event.target.value)}
                    value={selectedShippingPresetId}
                  >
                    <option value="">Selecionar atalho</option>
                    {shippingPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} - {preset.weightGrams} g / {preset.lengthCm}x{preset.widthCm}x{preset.heightCm} cm
                        {preset.shippingLeadTimeDays > 0 ? ` / +${preset.shippingLeadTimeDays} dias` : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    disabled={!selectedShippingPresetId}
                    onClick={() => {
                      const preset = shippingPresets.find((item) => item.id === selectedShippingPresetId);

                      if (preset) {
                        applyShippingPresetToAll(preset);
                      }
                    }}
                    type="button"
                    variant="outline"
                  >
                    Aplicar em todas
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,1fr)_110px_90px_90px_90px_90px_110px_auto]">
                <Input
                  aria-label="Nome do novo atalho logistico"
                  onChange={(event) => setNewShippingPresetName(event.target.value)}
                  placeholder="Ex.: Camiseta basica"
                  value={newShippingPresetName}
                />
                <Input
                  aria-label="Peso do novo atalho"
                  min={1}
                  onChange={(event) => setNewShippingPresetWeight(event.target.value)}
                  placeholder="250"
                  value={newShippingPresetWeight}
                />
                <select
                  aria-label="Unidade do peso"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  onChange={(event) => setNewShippingPresetWeightUnit(event.target.value === "kg" ? "kg" : "g")}
                  value={newShippingPresetWeightUnit}
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
                <Input aria-label="Comprimento em centimetros" min={1} onChange={(event) => setNewShippingPresetLength(event.target.value)} placeholder="30" type="number" value={newShippingPresetLength} />
                <Input aria-label="Largura em centimetros" min={1} onChange={(event) => setNewShippingPresetWidth(event.target.value)} placeholder="25" type="number" value={newShippingPresetWidth} />
                <Input aria-label="Altura em centimetros" min={1} onChange={(event) => setNewShippingPresetHeight(event.target.value)} placeholder="3" type="number" value={newShippingPresetHeight} />
                <Input aria-label="Dias adicionais ao prazo de frete" min={0} onChange={(event) => setNewShippingPresetLeadTimeDays(event.target.value)} placeholder="+ dias" type="number" value={newShippingPresetLeadTimeDays} />
                <Button
                  disabled={isSavingShippingPreset}
                  onClick={() => void createShippingPreset()}
                  type="button"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Salvar atalho
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Campos do atalho: peso, comprimento, largura, altura e prazo adicional opcional.
              </p>
              {shippingPresetMessage ? (
                <p className="mt-2 text-xs text-muted-foreground">{shippingPresetMessage}</p>
              ) : null}
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="w-[330px] px-3 py-2">Variante</th>
                    <th className="w-[140px] px-3 py-2">Cor</th>
                    <th className="w-[120px] px-3 py-2">Tamanho</th>
                    <th className="w-[130px] px-3 py-2">Sexo</th>
                    <th className="w-[130px] px-3 py-2">Preço</th>
                    <th className="w-[95px] px-3 py-2">Estoque</th>
                    <th className="w-[110px] px-3 py-2">Status</th>
                    <th className="w-[160px] px-3 py-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {variantGroups.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="bg-muted/25">
                        <td className="px-3 py-2 font-semibold" colSpan={8}>
                          <button
                            aria-expanded={expandedVariantGroups.has(group.key)}
                            className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => toggleVariantGroup(group.key)}
                            type="button"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {expandedVariantGroups.has(group.key) ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="inline-flex size-4 shrink-0 rounded-full border" style={{ backgroundColor: getSwatchColor(group.label) }} />
                              <span className="truncate">{group.label}</span>
                            </span>
                            <span className="shrink-0 text-xs font-normal text-muted-foreground">
                              {group.variants.length} variante{group.variants.length === 1 ? "" : "s"}
                            </span>
                          </button>
                        </td>
                      </tr>
                      {expandedVariantGroups.has(group.key) ? group.variants.map((variant) => (
                        <tr className="align-top" key={variant.id}>
                          <td className="px-3 py-3">
                            <div className="flex gap-3">
                              <VariantThumbnail imageUrl={variant.imageUrl} title={variant.title} />
                              <div className="grid min-w-0 flex-1 gap-2">
                                <Input className="h-9" value={variant.title} onChange={(event) => updateVariant(variant.id, { title: event.target.value })} required />
                                <Input className="h-9 font-mono text-xs" value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} required />
                                <details className="rounded-md border bg-muted/20 p-2">
                                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Midia e campos avancados</summary>
                                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <Field label="Preço comparativo">
                                      <Input value={variant.compareAtPrice} onChange={(event) => updateVariant(variant.id, { compareAtPrice: event.target.value })} />
                                    </Field>
                                    <Field label="Codigo de barras">
                                      <Input value={variant.barcode} onChange={(event) => updateVariant(variant.id, { barcode: event.target.value })} />
                                    </Field>
                                    <Field label="Peso (g)">
                                      <div className="grid gap-2">
                                        <Input min={0} type="number" value={variant.weightGrams} onChange={(event) => updateVariant(variant.id, { weightGrams: event.target.value })} />
                                        <ShippingPresetSelect
                                          onSelect={(preset) => updateVariant(variant.id, applyShippingPresetPatch(preset))}
                                          presets={shippingPresets}
                                        />
                                      </div>
                                    </Field>
                                    <Field label="Comprimento (cm)">
                                      <Input min={0} type="number" value={variant.lengthCm} onChange={(event) => updateVariant(variant.id, { lengthCm: event.target.value })} />
                                    </Field>
                                    <Field label="Largura (cm)">
                                      <Input min={0} type="number" value={variant.widthCm} onChange={(event) => updateVariant(variant.id, { widthCm: event.target.value })} />
                                    </Field>
                                    <Field label="Altura (cm)">
                                      <Input min={0} type="number" value={variant.heightCm} onChange={(event) => updateVariant(variant.id, { heightCm: event.target.value })} />
                                    </Field>
                                    <Field label="Prazo adicional (dias)">
                                      <Input min={0} type="number" value={variant.shippingLeadTimeDays} onChange={(event) => updateVariant(variant.id, { shippingLeadTimeDays: event.target.value })} />
                                    </Field>
                                    <div className="grid gap-2 md:col-span-3">
                                      <VariantImagePreview imageUrl={variant.imageUrl} title={variant.title} />
                                      <div className="flex flex-wrap gap-2">
                                        <MediaLibraryPicker
                                          accept="image"
                                          buttonLabel={variant.imageUrl ? "Trocar imagem" : "Vincular imagem"}
                                          onSelect={(url) => updateVariantImageLink(variant.id, url)}
                                        />
                                        {variant.imageUrl ? (
                                          <Button onClick={() => updateVariant(variant.id, { imageUrl: "" })} type="button" variant="ghost">
                                            Limpar imagem
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </details>
                              </div>
                            </div>
                          </td>
                          {[0, 1, 2].map((optionIndex) => (
                            <td className="px-3 py-3" key={`${variant.id}-${optionIndex}`}>
                              <CompactOptionInput
                                option={variant.options[optionIndex]}
                                optionIndex={optionIndex}
                                variantId={variant.id}
                                onChange={updateVariantOption}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-3">
                            <Input className="h-9" value={variant.price} onChange={(event) => updateVariant(variant.id, { price: event.target.value })} required />
                          </td>
                          <td className="px-3 py-3">
                            <Input className="h-9" min={0} type="number" value={variant.stockQuantity} onChange={(event) => updateVariant(variant.id, { stockQuantity: event.target.value })} />
                          </td>
                          <td className="px-3 py-3">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                checked={variant.isActive}
                                onChange={(event) => updateVariant(variant.id, { isActive: event.target.checked })}
                                type="checkbox"
                              />
                              Ativa
                            </label>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1">
                              <Button aria-label="Duplicar variacao" onClick={() => duplicateVariant(variant.id)} size="sm" type="button" variant="outline">
                                Duplicar
                              </Button>
                              <Button
                                aria-label="Remover variacao"
                                className="h-9 border-destructive px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:border-muted-foreground/20 disabled:text-muted-foreground"
                                disabled={variants.length === 1}
                                onClick={() => removeVariant(variant.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Excluir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
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
            <div className="mt-4 overflow-x-auto rounded-lg border">
              {metafields.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">
                  Nenhum metacampo cadastrado. Adicione campos para especificacoes, filtros, SEO ou dados internos.
                </div>
              ) : null}
              {metafields.length > 0 ? (
                <table className="min-w-[860px] w-full border-collapse text-sm">
                  <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="w-[150px] px-3 py-2">Namespace</th>
                      <th className="w-[190px] px-3 py-2">Chave</th>
                      <th className="w-[150px] px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="w-[54px] px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {metafields.map((field) => (
                      <tr className="align-top" key={field.id}>
                        <td className="px-3 py-3">
                          <Input
                            className="h-9"
                            list="product-metafield-namespaces"
                            value={field.namespace}
                            onChange={(event) => updateMetafield(field.id, { namespace: event.target.value })}
                            placeholder="custom"
                          />
                          {field.namespace === "admin" ? (
                            <span className="mt-1 block text-xs text-muted-foreground">Somente admin</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            className="h-9"
                            list="product-metafield-keys"
                            value={field.key}
                            onChange={(event) => updateMetafield(field.id, { key: event.target.value })}
                            placeholder="fabric"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            onChange={(event) => updateMetafield(field.id, { type: event.target.value })}
                            value={field.type}
                          >
                            {metafieldTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <Textarea className="min-h-9 resize-y" value={field.value} onChange={(event) => updateMetafield(field.id, { value: event.target.value })} />
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            aria-label="Remover metacampo"
                            className="h-9 border-destructive px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeMetafield(field.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="grid min-w-0 content-start gap-5 2xl:sticky 2xl:top-6">
          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Boxes} title="Publicação" />
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
            <SectionHeading icon={Search} title="Preços base e SEO" />
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Preço base
                <Input defaultValue={product ? formatCurrency(product.priceCents) : ""} name="price" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Preço comparativo base
                <Input defaultValue={product?.compareAtPriceCents ? formatCurrency(product.compareAtPriceCents) : ""} name="compareAtPrice" />
              </label>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}

function VariantThumbnail({ imageUrl, title }: { imageUrl: string; title: string }): React.ReactElement {
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
      {imageUrl ? (
        <Image alt={title || "Imagem da variacao"} className="object-cover" fill sizes="56px" src={imageUrl} />
      ) : (
        <span className="grid h-full place-items-center text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}

function VariantImagePreview({ imageUrl, title }: { imageUrl: string; title: string }): React.ReactElement {
  if (!imageUrl) {
    return (
      <div className="grid min-h-28 place-items-center rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        Nenhuma imagem vinculada a essa combinação.
      </div>
    );
  }

  return (
    <figure className="flex items-center gap-3 rounded-lg border bg-background p-2">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image alt={title || "Imagem da variacao"} className="object-cover" fill sizes="80px" src={imageUrl} />
      </div>
      <figcaption className="min-w-0 text-sm">
        <strong className="block truncate">Imagem vinculada</strong>
        <span className="text-xs text-muted-foreground">
          Sera aplicada nas variantes com a mesma cor e sexo.
        </span>
      </figcaption>
    </figure>
  );
}

function CompactOptionInput({
  onChange,
  option,
  optionIndex,
  variantId
}: {
  onChange: (variantId: string, optionIndex: number, patch: Partial<VariantOptionRow>) => void;
  option: VariantOptionRow;
  optionIndex: number;
  variantId: string;
}): React.ReactElement {
  return (
    <div className="grid gap-2">
      <Input
        aria-label={`Nome da opcao ${optionIndex + 1}`}
        className="h-8 text-xs"
        list="product-variant-option-names"
        placeholder={optionIndex === 0 ? "Cor" : optionIndex === 1 ? "Tamanho" : "Sexo"}
        value={option.name}
        onChange={(event) => onChange(variantId, optionIndex, { name: event.target.value })}
      />
      <Input
        aria-label={`Valor da opcao ${optionIndex + 1}`}
        className="h-9"
        list="product-variant-option-values"
        placeholder={optionIndex === 0 ? "Azul" : optionIndex === 1 ? "M" : "Unissex"}
        value={option.value}
        onChange={(event) => onChange(variantId, optionIndex, { value: event.target.value })}
      />
    </div>
  );
}

function OptionSummary({
  label,
  onAdd,
  values
}: {
  label: string;
  onAdd: () => void;
  values: string[];
}): React.ReactElement {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <Button className="h-8 px-2" onClick={onAdd} type="button" variant="outline">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Criar
        </Button>
      </div>
      <div className="mt-3 flex min-h-8 flex-wrap gap-2">
        {values.length > 0 ? values.map((value) => (
          <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs" key={value}>
            {label === "Cores" ? (
              <span className="inline-flex size-3 rounded-full border" style={{ backgroundColor: getSwatchColor(value) }} />
            ) : null}
            {value}
          </span>
        )) : (
          <span className="text-xs text-muted-foreground">Nenhum valor definido</span>
        )}
      </div>
    </div>
  );
}

function ShippingPresetSelect({
  onSelect,
  presets
}: {
  onSelect: (preset: ProductShippingPresetItem) => void;
  presets: ProductShippingPresetItem[];
}): React.ReactElement {
  return (
    <select
      aria-label="Aplicar atalho logistico"
      className="h-9 rounded-md border bg-background px-3 text-xs"
      disabled={presets.length === 0}
      onChange={(event) => {
        const preset = presets.find((item) => item.id === event.target.value);

        if (preset) {
          onSelect(preset);
        }

        event.currentTarget.value = "";
      }}
      value=""
    >
      <option value="">Usar atalho</option>
      {presets.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name} - {preset.weightGrams} g / {preset.lengthCm}x{preset.widthCm}x{preset.heightCm} cm
        </option>
      ))}
    </select>
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
      className="h-9 gap-1 px-2"
      onClick={onClick}
      title={label}
      type="button"
      variant={pressed ? "default" : "ghost"}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden text-xs sm:inline">{label}</span>
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
      heightCm: variant.heightCm ? String(variant.heightCm) : "",
      id: variant.id,
      imageUrl: optionValues._imageUrl ?? "",
      isActive: variant.isActive,
      lengthCm: variant.lengthCm ? String(variant.lengthCm) : "",
      options: fillOptions(options),
      price: formatCurrency(variant.priceCents),
      shippingLeadTimeDays: variant.shippingLeadTimeDays ? String(variant.shippingLeadTimeDays) : "",
      sku: variant.sku,
      stockQuantity: String(variant.stockQuantity),
      title: variant.title || `Variacao ${index + 1}`,
      weightGrams: variant.weightGrams ? String(variant.weightGrams) : "",
      widthCm: variant.widthCm ? String(variant.widthCm) : ""
    });
  });
}

function createVariantRow(overrides: Partial<VariantFormRow> = {}): VariantFormRow {
  return {
    barcode: "",
    compareAtPrice: "",
    heightCm: "",
    id: overrides.id ?? createRowId("variant"),
    imageUrl: "",
    isActive: true,
    lengthCm: "",
    options: fillOptions(overrides.options ?? []),
    price: "",
    shippingLeadTimeDays: "",
    sku: "",
    stockQuantity: "0",
    title: "Padrao",
    weightGrams: "",
    widthCm: "",
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

function groupVariantsByPrimaryOption(variants: VariantFormRow[]): Array<{ key: string; label: string; variants: VariantFormRow[] }> {
  const groups = new Map<string, VariantFormRow[]>();

  for (const variant of variants) {
    const label = getVariantOptionValue(variant, "Cor") || "Sem cor";
    groups.set(label, [...(groups.get(label) ?? []), variant]);
  }

  return [...groups.entries()].map(([label, groupVariants]) => ({
    key: label,
    label,
    variants: groupVariants
  }));
}

function getMatrixOptionValues(variants: VariantFormRow[], optionName: string): string[] {
  return uniqueStrings(variants.map((variant) => getVariantOptionValue(variant, optionName)).filter(Boolean));
}

function addMatrixOptionValue(
  variants: VariantFormRow[],
  optionName: "Cor" | "Tamanho" | "Sexo",
  value: string
): VariantFormRow[] {
  const colors = optionName === "Cor" ? [value] : getMatrixOptionValues(variants, "Cor");
  const sizes = optionName === "Tamanho" ? [value] : getMatrixOptionValues(variants, "Tamanho");
  const genders = optionName === "Sexo" ? [value] : getMatrixOptionValues(variants, "Sexo");
  const safeColors = colors.length > 0 ? colors : [""];
  const safeSizes = sizes.length > 0 ? sizes : [""];
  const safeGenders = genders.length > 0 ? genders : [""];
  const existingKeys = new Set(variants.map(getVariantCombinationKey));
  const baseVariant = variants[0] ?? createVariantRow();
  const nextVariants = [...variants];

  for (const color of safeColors) {
    for (const size of safeSizes) {
      for (const gender of safeGenders) {
        const options = fillOptions([
          { name: "Cor", value: color },
          { name: "Tamanho", value: size },
          { name: "Sexo", value: gender }
        ]);
        const combinationKey = getOptionsCombinationKey(options);

        if (existingKeys.has(combinationKey)) {
          continue;
        }

        existingKeys.add(combinationKey);
        nextVariants.push(createVariantRow({
          compareAtPrice: baseVariant.compareAtPrice,
          imageUrl: findReusableVariantImage(variants, color, gender),
          isActive: true,
          options,
          price: baseVariant.price,
          shippingLeadTimeDays: baseVariant.shippingLeadTimeDays,
          sku: buildGeneratedSku(baseVariant.sku, options, nextVariants.length + 1),
          stockQuantity: "0",
          title: buildVariantTitle(options, "Nova variacao"),
          weightGrams: baseVariant.weightGrams,
          heightCm: baseVariant.heightCm,
          lengthCm: baseVariant.lengthCm,
          widthCm: baseVariant.widthCm
        }));
      }
    }
  }

  return nextVariants;
}

function findReusableVariantImage(variants: VariantFormRow[], color: string, gender: string): string {
  return variants.find((variant) => {
    const sameColor = color && getVariantOptionValue(variant, "Cor") === color;
    const sameGender = gender ? getVariantOptionValue(variant, "Sexo") === gender : true;

    return sameColor && sameGender && variant.imageUrl;
  })?.imageUrl ?? "";
}

function getVariantCombinationKey(variant: VariantFormRow): string {
  return getOptionsCombinationKey(variant.options);
}

function getOptionsCombinationKey(options: VariantOptionRow[]): string {
  return ["Cor", "Tamanho", "Sexo"]
    .map((optionName) => {
      const option = options.find((item) => normalizeOptionName(item.name) === normalizeOptionName(optionName));

      return normalizeOptionName(option?.value ?? "");
    })
    .join("|");
}

function buildVariantTitle(options: VariantOptionRow[], fallback: string): string {
  const title = options
    .filter((option) => option.value.trim())
    .map((option) => option.value.trim())
    .join(" / ");

  return title || fallback || "Padrao";
}

function buildGeneratedSku(baseSku: string, options: VariantOptionRow[], index: number): string {
  const base = baseSku.trim() || "VAR";
  const suffix = options
    .map((option) => option.value)
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 32);

  return `${base}-${suffix || index}`.slice(0, 80);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function applyShippingPresetPatch(preset: ProductShippingPresetItem): Partial<VariantFormRow> {
  return {
    heightCm: String(preset.heightCm),
    lengthCm: String(preset.lengthCm),
    shippingLeadTimeDays: preset.shippingLeadTimeDays > 0 ? String(preset.shippingLeadTimeDays) : "",
    weightGrams: String(preset.weightGrams),
    widthCm: String(preset.widthCm)
  };
}

function applyShippingPresetToVariant(
  variant: VariantFormRow,
  preset: ProductShippingPresetItem
): VariantFormRow {
  return {
    ...variant,
    ...applyShippingPresetPatch(preset)
  };
}

function upsertShippingPreset(
  presets: ProductShippingPresetItem[],
  preset: ProductShippingPresetItem
): ProductShippingPresetItem[] {
  const nextPresets = presets.filter((item) => item.id !== preset.id && item.name !== preset.name);

  return [...nextPresets, preset].sort((left, right) =>
    left.weightGrams === right.weightGrams
      ? left.name.localeCompare(right.name)
      : left.weightGrams - right.weightGrams
  );
}

function getShippingPresetFromPayload(payload: unknown): ProductShippingPresetItem | null {
  if (!payload || typeof payload !== "object" || !("preset" in payload)) {
    return null;
  }

  const preset = (payload as { preset?: unknown }).preset;

  if (!preset || typeof preset !== "object") {
    return null;
  }

  const candidate = preset as Partial<ProductShippingPresetItem>;

  return typeof candidate.id === "string"
    && typeof candidate.name === "string"
    && typeof candidate.heightCm === "number"
    && typeof candidate.lengthCm === "number"
    && typeof candidate.shippingLeadTimeDays === "number"
    && typeof candidate.weightGrams === "number"
    && typeof candidate.widthCm === "number"
    ? {
        heightCm: candidate.heightCm,
        id: candidate.id,
        lengthCm: candidate.lengthCm,
        name: candidate.name,
        shippingLeadTimeDays: candidate.shippingLeadTimeDays,
        weightGrams: candidate.weightGrams,
        widthCm: candidate.widthCm
      }
    : null;
}

function getApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }

  const message = (payload as { message?: unknown }).message;

  return typeof message === "string" ? message : null;
}

function getVariantOptionValue(variant: VariantFormRow, name: string): string {
  const target = normalizeOptionName(name);
  const option = variant.options.find((item) => normalizeOptionName(item.name) === target);

  return option?.value.trim() ?? "";
}

function normalizeOptionName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getSwatchColor(value: string): string {
  const colors: Record<string, string> = {
    amarelo: "#fde68a",
    azul: "#1d70d6",
    bege: "#e8d6ad",
    branco: "#ffffff",
    cinza: "#9ca3af",
    creme: "#fff7d6",
    marrom: "#8b5e34",
    preto: "#111827",
    rosa: "#f9a8d4",
    roxo: "#7c3aed",
    verde: "#22c55e",
    vermelho: "#ef4444"
  };

  return colors[normalizeOptionName(value)] ?? "#e5e7eb";
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
        variant.heightCm.trim(),
        variant.widthCm.trim(),
        variant.lengthCm.trim(),
        variant.shippingLeadTimeDays.trim(),
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
