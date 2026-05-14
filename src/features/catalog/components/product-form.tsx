"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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
  errorNotice?: string;
  notice?: string;
  product?: ProductListItem;
  restockAction?: (formData: FormData) => Promise<void>;
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
  trackInventory: boolean;
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

type MatrixOptionName = "Cor" | "Tamanho" | "Genero";
type SavedMatrixOptionValues = Record<MatrixOptionName, string[]>;

const matrixOptionNames: MatrixOptionName[] = ["Cor", "Tamanho", "Genero"];
const matrixOptionStorageKey = "nerdlingolab.productForm.matrixOptions";
const genderOptionAliases = new Set(["genero", "sexo", "gender"]);
const standardSizeOrder = ["PP", "P", "M", "G", "GG", "XG"];
const standardGenderOptions = ["Feminino", "Masculino", "Unissex"];
const optionValueSuggestions = [
  "Azul",
  "Preto",
  "Branco",
  "Vermelho",
  "Rosa",
  "Verde",
  "Amarelo",
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XG",
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
  errorNotice,
  notice,
  action,
  restockAction,
  shippingPresets: initialShippingPresets
}: ProductFormProps): React.ReactElement {
  const imageUrls = getImageUrls(product?.images).join("\n");
  const [variants, setVariants] = useState<VariantFormRow[]>(() => getInitialVariantRows(product));
  const [metafields, setMetafields] = useState<MetafieldFormRow[]>(() => getInitialMetafields(product?.metafields));
  const [shippingPresets, setShippingPresets] = useState<ProductShippingPresetItem[]>(initialShippingPresets);
  const [selectedShippingPresetId, setSelectedShippingPresetId] = useState("");
  const [bulkVariantPrice, setBulkVariantPrice] = useState(() => getInitialVariantPrice(product));
  const [baseSku, setBaseSku] = useState(() => getInitialBaseSku(product));
  const [matrixOptionMemory, setMatrixOptionMemory] = useState<SavedMatrixOptionValues>(() => loadSavedMatrixOptionValues());
  const [clientError, setClientError] = useState<string | null>(null);
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
  const trackedVariants = variants.filter((variant) => variant.trackInventory).length;
  const totalStock = variants.reduce((sum, variant) => sum + (variant.trackInventory ? Number.parseInt(variant.stockQuantity, 10) || 0 : 0), 0);
  const activeVariants = variants.filter((variant) => variant.isActive).length;
  const variantGroups = useMemo(() => groupVariantsByPrimaryOption(variants), [variants]);
  const variantsPayload = useMemo(() => serializeVariants(variants), [variants]);
  const metafieldsPayload = useMemo(() => serializeMetafields(metafields), [metafields]);
  const matrixValues = useMemo(() => ({
    Cor: getMatrixOptionValues(variants, "Cor"),
    Tamanho: getMatrixOptionValues(variants, "Tamanho"),
    Genero: getMatrixOptionValues(variants, "Genero")
  }), [variants]);
  const matrixQuickValues = useMemo(() => ({
    Cor: mergeOptionValues(matrixOptionMemory.Cor, matrixValues.Cor),
    Tamanho: mergeOptionValues(standardSizeOrder, matrixOptionMemory.Tamanho, matrixValues.Tamanho),
    Genero: mergeOptionValues(standardGenderOptions, matrixOptionMemory.Genero, matrixValues.Genero)
  }), [matrixOptionMemory, matrixValues]);
  const selectedCategoryIds = new Set([
    product?.categoryId,
    ...(product?.categories.map((productCategory) => productCategory.category.id) ?? [])
  ].filter(Boolean));

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    setClientError(null);
    syncDescriptionBeforeSubmit();

    const description = showHtmlSource
      ? descriptionHtml
      : descriptionEditorRef.current?.innerText ?? "";

    if (description.trim().length < 10) {
      event.preventDefault();
      setClientError("Descreva melhor o produto antes de salvar.");
      return;
    }

    if (!baseSku.trim() && variants.length === 0) {
      event.preventDefault();
      setClientError("Informe o SKU base ou crie ao menos uma variante.");
    }
  }

  function updateVariant(id: string, patch: Partial<VariantFormRow>): void {
    setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
  }

  function updateVariantOption(variantId: string, optionIndex: number, patch: Partial<VariantOptionRow>): void {
    const optionName = normalizeMatrixOptionName(patch.name ?? matrixOptionNames[optionIndex]);

    if (isMatrixOptionName(optionName) && patch.value?.trim()) {
      rememberMatrixOptionValue(optionName, patch.value);
    }

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
      const sourceGender = getVariantOptionValue(sourceVariant, "Genero");

      return current.map((variant) => {
        const sameColor = sourceColor && getVariantOptionValue(variant, "Cor") === sourceColor;
        const sameGender = sourceGender
          ? getVariantOptionValue(variant, "Genero") === sourceGender
          : true;

        return variant.id === variantId || (sameColor && sameGender)
          ? { ...variant, imageUrl }
          : variant;
      });
    });
  }

  function addOptionValueToMatrix(optionName: MatrixOptionName, presetValue?: string): void {
    const value = presetValue ?? window.prompt(`Novo valor para ${getMatrixOptionLabel(optionName)}`);
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      return;
    }

    rememberMatrixOptionValue(optionName, normalizedValue);

    setVariants((current) =>
      addMatrixOptionValue(
        current,
        optionName,
        normalizedValue,
        createVariantRow({ price: bulkVariantPrice.trim(), sku: baseSku.trim(), title: "Nova variação" })
      ).map((variant) => (
        bulkVariantPrice.trim() && !variant.price.trim()
          ? { ...variant, price: bulkVariantPrice.trim() }
          : variant
      ))
    );
  }

  function applyShippingPresetToAll(preset: ProductShippingPresetItem): void {
    setVariants((current) => current.map((variant) => applyShippingPresetToVariant(variant, preset)));
  }

  function rememberMatrixOptionValue(optionName: MatrixOptionName, value: string): void {
    setMatrixOptionMemory((current) => {
      const nextMemory = addSavedMatrixOptionValue(current, optionName, value);

      if (!areSavedMatrixOptionValuesEqual(nextMemory, current)) {
        saveMatrixOptionValues(nextMemory);
      }

      return nextMemory;
    });
  }

  function applyBulkVariantPrice(mode: "all" | "empty"): void {
    const price = bulkVariantPrice.trim();

    if (!price) {
      return;
    }

    setVariants((current) =>
      current.map((variant) => (
        mode === "all" || !variant.price.trim()
          ? { ...variant, price }
          : variant
      ))
    );
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
      setShippingPresetMessage("Informe nome, peso e dimensões válidos.");
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
        throw new Error(getApiMessage(payload) ?? "Não foi possível salvar o atalho.");
      }

      const preset = getShippingPresetFromPayload(payload);

      if (!preset) {
        throw new Error("Resposta inválida ao salvar o atalho.");
      }

      setShippingPresets((current) => upsertShippingPreset(current, preset));
      setSelectedShippingPresetId(preset.id);
      setNewShippingPresetName("");
      setNewShippingPresetWeight("");
      setNewShippingPresetHeight("");
      setNewShippingPresetWidth("");
      setNewShippingPresetLength("");
      setNewShippingPresetLeadTimeDays("");
      setShippingPresetMessage("Atalho salvo para próximos cadastros.");
    } catch (error) {
      setShippingPresetMessage(error instanceof Error ? error.message : "Não foi possível salvar o atalho.");
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
          title: `${source.title || "Variação"} cópia`
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
    <form action={action} className="grid gap-6" onSubmit={handleSubmit}>
      <input name="sku" type="hidden" value={firstVariant.sku || baseSku} />
      <input name="stockQuantity" type="hidden" value={firstVariant.stockQuantity || "0"} />
      <input name="trackInventory" type="hidden" value={firstVariant.trackInventory ? "on" : ""} />
      {product ? <input name="productId" type="hidden" value={product.id} /> : null}
      <textarea className="hidden" defaultValue={descriptionHtml} name="description" readOnly ref={descriptionInputRef} />
      <textarea className="hidden" name="variants" readOnly value={variantsPayload} />
      <textarea className="hidden" name="metafields" readOnly value={metafieldsPayload} />
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
            Estruture conteúdo, mídia, organização, variações, estoque e metacampos em um fluxo visual.
          </p>
        </div>
        <ProductSubmitButton />
      </div>
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          {notice}
        </div>
      ) : null}
      {errorNotice || clientError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
          {errorNotice ?? clientError}
        </div>
      ) : null}

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
                  label="Imagem da mídia"
                  icon={ImageIcon}
                  onClick={() => setDescriptionMediaIntent((current) => (current === "image" ? null : "image"))}
                  pressed={descriptionMediaIntent === "image"}
                />
                <EditorButton
                  label="Vídeo da mídia"
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
              <SectionHeading icon={Layers3} title="Variações e estoque" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={expandAllVariantGroups} type="button" variant="ghost">
                  Expandir tudo
                </Button>
                <Button className="w-full sm:w-auto" onClick={collapseAllVariantGroups} type="button" variant="ghost">
                  Recolher tudo
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => setVariants((current) => [...current, createVariantRow({ price: bulkVariantPrice.trim(), sku: baseSku.trim(), title: `Variação ${current.length + 1}` })])}
                  type="button"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar variação
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <OptionSummary
                label="Cores"
                quickValues={matrixQuickValues.Cor}
                values={matrixValues.Cor}
                onAdd={() => addOptionValueToMatrix("Cor")}
                onAddValue={(value) => addOptionValueToMatrix("Cor", value)}
              />
              <OptionSummary
                label="Tamanhos"
                quickValues={matrixQuickValues.Tamanho}
                values={matrixValues.Tamanho}
                onAdd={() => addOptionValueToMatrix("Tamanho")}
                onAddValue={(value) => addOptionValueToMatrix("Tamanho", value)}
              />
              <OptionSummary
                label="Gênero"
                quickValues={matrixQuickValues.Genero}
                values={matrixValues.Genero}
                onAdd={() => addOptionValueToMatrix("Genero")}
                onAddValue={(value) => addOptionValueToMatrix("Genero", value)}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground text-pretty">
              Ao vincular uma imagem, ela é aplicada nas variantes da mesma Cor + Sexo. Valores novos podem ser digitados ou criados pelos botões acima.
            </p>
            <div className="mt-4 rounded-lg border bg-background p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(180px,260px)_auto_auto] lg:items-end">
                <Field label="Preço padrão das variantes">
                  <Input
                    aria-label="Preço padrão das variantes"
                    inputMode="decimal"
                    onChange={(event) => setBulkVariantPrice(event.target.value)}
                    placeholder="Ex.: 59,90"
                    value={bulkVariantPrice}
                  />
                </Field>
                <Button
                  className="w-full lg:w-auto"
                  disabled={!bulkVariantPrice.trim()}
                  onClick={() => applyBulkVariantPrice("all")}
                  type="button"
                  variant="outline"
                >
                  Aplicar em todas
                </Button>
                <Button
                  className="w-full lg:w-auto"
                  disabled={!bulkVariantPrice.trim()}
                  onClick={() => applyBulkVariantPrice("empty")}
                  type="button"
                  variant="ghost"
                >
                  Preencher vazias
                </Button>
              </div>
            </div>
            <div className="mt-4 rounded-lg border bg-muted/20 p-4">
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
                <p className="font-black text-foreground">Controle de estoque</p>
                <p>
                  Para dropshipping, deixe desligado. A loja venderá sob demanda sem limitar carrinho pelo estoque local.
                  Ative apenas para produtos com estoque físico próprio.
                </p>
              </div>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold tracking-normal">Atalhos logísticos</h3>
                  <p className="mt-1 max-w-2xl text-xs text-muted-foreground text-pretty">
                    Salve peso e dimensões frequentes para preencher rapidamente as variantes e calcular o frete com mais precisão.
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:max-w-xl">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
                    className="w-full sm:w-auto"
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(220px,1fr)_120px_110px_120px_120px_120px_130px_auto]">
                <Field label="Nome">
                  <Input
                    aria-label="Nome do novo atalho logístico"
                    onChange={(event) => setNewShippingPresetName(event.target.value)}
                    placeholder="Ex.: Camiseta basica"
                    value={newShippingPresetName}
                  />
                </Field>
                <Field label="Peso">
                  <Input
                    aria-label="Peso do novo atalho"
                    min={1}
                    onChange={(event) => setNewShippingPresetWeight(event.target.value)}
                    placeholder="250"
                    value={newShippingPresetWeight}
                  />
                </Field>
                <Field label="Unidade">
                  <select
                    aria-label="Unidade do peso"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    onChange={(event) => setNewShippingPresetWeightUnit(event.target.value === "kg" ? "kg" : "g")}
                    value={newShippingPresetWeightUnit}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </Field>
                <Field label="Compr.">
                  <Input aria-label="Comprimento em centímetros" min={1} onChange={(event) => setNewShippingPresetLength(event.target.value)} placeholder="30" type="number" value={newShippingPresetLength} />
                </Field>
                <Field label="Largura">
                  <Input aria-label="Largura em centímetros" min={1} onChange={(event) => setNewShippingPresetWidth(event.target.value)} placeholder="25" type="number" value={newShippingPresetWidth} />
                </Field>
                <Field label="Altura">
                  <Input aria-label="Altura em centímetros" min={1} onChange={(event) => setNewShippingPresetHeight(event.target.value)} placeholder="3" type="number" value={newShippingPresetHeight} />
                </Field>
                <Field label="+ dias">
                  <Input aria-label="Dias adicionais ao prazo de frete" min={0} onChange={(event) => setNewShippingPresetLeadTimeDays(event.target.value)} placeholder="+ dias" type="number" value={newShippingPresetLeadTimeDays} />
                </Field>
                <Button
                  className="w-full self-end sm:col-span-2 lg:col-span-4 2xl:col-span-1"
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
            <div className="mt-4 grid gap-3 2xl:hidden">
              {variants.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  Crie uma cor, tamanho ou gênero acima para gerar as variantes do produto.
                </div>
              ) : null}
              {variantGroups.map((group) => (
                <section className="overflow-hidden rounded-lg border bg-background" key={group.key}>
                  <button
                    aria-expanded={expandedVariantGroups.has(group.key)}
                    className="flex w-full items-center justify-between gap-3 bg-muted/25 px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => toggleVariantGroup(group.key)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      {expandedVariantGroups.has(group.key) ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="inline-flex size-4 shrink-0 rounded-full border" style={{ backgroundColor: getSwatchColor(group.label) }} />
                      <span className="truncate">{group.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {group.variants.length} variante{group.variants.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  {expandedVariantGroups.has(group.key) ? (
                    <div className="grid gap-3 p-3">
                      {group.variants.map((variant) => (
                        <article className="overflow-hidden rounded-xl border border-primary/20 bg-card shadow-sm" key={variant.id}>
                          <div className="flex flex-col gap-3 border-b border-primary/15 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border bg-background">
                                <span className="size-5 rounded-full border" style={{ backgroundColor: getSwatchColor(getVariantOptionValue(variant, "Cor")) }} />
                              </span>
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-black text-foreground">{variant.title || "Nova variação"}</h3>
                                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{variant.sku || "SKU pendente"}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                                {variant.price || "Sem preço"}
                              </span>
                              <span className={variant.isActive ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700" : "rounded-full border border-muted-foreground/20 bg-muted px-3 py-1 text-xs font-black text-muted-foreground"}>
                                {variant.isActive ? "Ativa" : "Inativa"}
                              </span>
                            </div>
                          </div>
                          <div className="grid gap-4 p-3 sm:p-4">
                            <div className="grid gap-3 sm:grid-cols-[72px_minmax(0,1fr)]">
                            <VariantThumbnail imageUrl={variant.imageUrl} title={variant.title} />
                            <div className="grid min-w-0 gap-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Nome da variante">
                                  <Input value={variant.title} onChange={(event) => updateVariant(variant.id, { title: event.target.value })} required />
                                </Field>
                                <Field label="SKU">
                                  <Input className="font-mono text-xs" value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} required />
                                </Field>
                              </div>
                              <div className="nl-field-grid">
                                {[0, 1, 2].map((optionIndex) => (
                                  <MatrixOptionInput
                                    key={`${variant.id}-card-${optionIndex}`}
                                    optionName={matrixOptionNames[optionIndex]}
                                    option={variant.options[optionIndex]}
                                    optionIndex={optionIndex}
                                    variantId={variant.id}
                                    onChange={updateVariantOption}
                                  />
                                ))}
                                <Field label="Preço">
                                  <Input value={variant.price} onChange={(event) => updateVariant(variant.id, { price: event.target.value })} required />
                                </Field>
                              </div>
                            </div>
                          </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold">
                              <input
                                checked={variant.trackInventory}
                                onChange={(event) => updateVariant(variant.id, { trackInventory: event.target.checked })}
                                type="checkbox"
                              />
                              Controlar estoque
                            </label>
                            <Field label="Estoque">
                              <Input
                                disabled={!variant.trackInventory}
                                min={0}
                                type="number"
                                value={variant.stockQuantity}
                                onChange={(event) => updateVariant(variant.id, { stockQuantity: event.target.value })}
                              />
                            </Field>
                            <label className="flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold">
                              <input
                                checked={variant.isActive}
                                onChange={(event) => updateVariant(variant.id, { isActive: event.target.checked })}
                                type="checkbox"
                              />
                              Variante ativa
                            </label>
                            <div className="nl-action-row sm:justify-end lg:justify-start">
                              <Button aria-label="Duplicar variação" onClick={() => duplicateVariant(variant.id)} size="sm" type="button" variant="outline">
                                Duplicar
                              </Button>
                              <Button
                                aria-label="Remover variação"
                                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white disabled:border-muted-foreground/20 disabled:bg-muted disabled:text-muted-foreground dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20 disabled:dark:border-muted-foreground/20 disabled:dark:bg-muted disabled:dark:text-muted-foreground"
                                disabled={variants.length === 1}
                                onClick={() => removeVariant(variant.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 className="size-4" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                            <details className="rounded-lg border bg-background p-3 shadow-sm">
                            <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">Mídia e campos avançados</summary>
                            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
                              <div className="nl-field-grid">
                                <Field label="Preço comparativo">
                                  <Input value={variant.compareAtPrice} onChange={(event) => updateVariant(variant.id, { compareAtPrice: event.target.value })} />
                                </Field>
                                <Field label="Código de barras">
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
                              </div>
                              <div className="grid content-start gap-2">
                                <VariantImagePreview imageUrl={variant.imageUrl} title={variant.title} />
                                <div className="nl-action-row">
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
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto rounded-lg border 2xl:block" data-ui-audit-scrollable>
              <table className="w-full min-w-[1300px] border-collapse text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="w-[330px] px-3 py-2">Variante</th>
                    <th className="w-[165px] px-3 py-2">Cor</th>
                    <th className="w-[150px] px-3 py-2">Tamanho</th>
                    <th className="w-[165px] px-3 py-2">Gênero</th>
                    <th className="w-[130px] px-3 py-2">Preço</th>
                    <th className="w-[150px] px-3 py-2">Estoque</th>
                    <th className="w-[110px] px-3 py-2">Status</th>
                    <th className="w-[160px] px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {variants.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={8}>
                        Crie uma cor, tamanho ou gênero acima para gerar as variantes do produto.
                      </td>
                    </tr>
                  ) : null}
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
                        <Fragment key={variant.id}>
                          <tr className="align-top">
                            <td className="px-3 py-3">
                              <div className="flex gap-3">
                                <VariantThumbnail imageUrl={variant.imageUrl} title={variant.title} />
                                <div className="grid min-w-0 flex-1 gap-2">
                                  <Input className="h-9" value={variant.title} onChange={(event) => updateVariant(variant.id, { title: event.target.value })} required />
                                  <Input className="h-9 font-mono text-xs" value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} required />
                                </div>
                              </div>
                            </td>
                            {[0, 1, 2].map((optionIndex) => (
                              <td className="px-3 py-3" key={`${variant.id}-${optionIndex}`}>
                                <MatrixOptionInput
                                  optionName={matrixOptionNames[optionIndex]}
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
                              <div className="grid gap-2">
                                <label className="flex items-center gap-2 rounded-md border bg-background px-2 py-2 text-xs font-semibold">
                                  <input
                                    checked={variant.trackInventory}
                                    onChange={(event) => updateVariant(variant.id, { trackInventory: event.target.checked })}
                                    type="checkbox"
                                  />
                                  Controlar
                                </label>
                                <Input
                                  className="h-9"
                                  disabled={!variant.trackInventory}
                                  min={0}
                                  type="number"
                                  value={variant.stockQuantity}
                                  onChange={(event) => updateVariant(variant.id, { stockQuantity: event.target.value })}
                                />
                              </div>
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
                                <Button aria-label="Duplicar variação" onClick={() => duplicateVariant(variant.id)} size="sm" type="button" variant="outline">
                                  Duplicar
                                </Button>
                                <Button
                                  aria-label="Remover variação"
                                  className="h-10 border-red-200 bg-red-50 px-3 text-red-700 hover:bg-red-600 hover:text-white disabled:border-muted-foreground/20 disabled:bg-muted disabled:text-muted-foreground dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20 disabled:dark:border-muted-foreground/20 disabled:dark:bg-muted disabled:dark:text-muted-foreground"
                                  disabled={variants.length === 1}
                                  onClick={() => removeVariant(variant.id)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  <Trash2 className="mr-1.5 size-5" />
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                          <tr className="border-t-0 bg-muted/10">
                            <td className="px-3 pb-4 pt-0" colSpan={8}>
                              <details className="rounded-lg border bg-background p-3 shadow-sm">
                              <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">Mídia e campos avançados</summary>
                              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <Field label="Preço comparativo">
                                    <Input value={variant.compareAtPrice} onChange={(event) => updateVariant(variant.id, { compareAtPrice: event.target.value })} />
                                  </Field>
                                  <Field label="Código de barras">
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
                                </div>
                                <div className="grid content-start gap-2">
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
                              {restockAction && product && variant.trackInventory ? (
                                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                                  <p className="text-xs font-black text-emerald-900 dark:text-emerald-100">Abastecer estoque</p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
                                    <Input
                                      className="h-9"
                                      min={1}
                                      name={`restockQuantity:${variant.id}`}
                                      placeholder="+ qtd."
                                      type="number"
                                    />
                                    <Input
                                      className="h-9"
                                      name={`restockReason:${variant.id}`}
                                      placeholder="Motivo opcional"
                                    />
                                    <Button
                                      className="h-9"
                                      formAction={restockAction}
                                      name="restockVariantId"
                                      type="submit"
                                      value={variant.id}
                                      variant="default"
                                    >
                                      Abastecer
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </details>
                          </td>
                        </tr>
                        </Fragment>
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
                            className="h-10 border-red-200 bg-red-50 px-3 text-red-700 hover:bg-red-600 hover:text-white dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20"
                            onClick={() => removeMetafield(field.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2 className="mr-1.5 size-5" />
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
              <Metric label="Variações" value={`${activeVariants}/${variants.length}`} />
              <Metric label="Estoque" value={trackedVariants > 0 ? `${totalStock} / ${trackedVariants} controlada(s)` : "Sob demanda"} />
            </dl>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Tags} title="Organizacao" />
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Categoria principal
                <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={product?.categoryId ?? ""} name="categoryId">
                  <option value="">Sem coleção</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <fieldset className="grid gap-2 text-sm font-medium">
                <legend>Catálogos extras</legend>
                <div className="grid max-h-56 gap-2 overflow-auto rounded-lg border bg-background p-3">
                  {categories.map((category) => (
                    <label className="flex min-h-9 items-center gap-2 rounded-md border border-orange-100 px-3 text-sm" key={category.id}>
                      <input
                        className="size-4 accent-primary"
                        defaultChecked={selectedCategoryIds.has(category.id)}
                        name="categoryIds"
                        type="checkbox"
                        value={category.id}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  Use para manter o produto em mais de um catálogo, como Camisetas e Ofertas ao mesmo tempo.
                </span>
              </fieldset>
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
                SKU base
                <Input
                  onChange={(event) => setBaseSku(event.target.value)}
                  placeholder="Ex.: CAMISETA-NARUTO"
                  required={variants.length === 0}
                  value={baseSku}
                />
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
        <Image alt={title || "Imagem da variação"} className="object-cover" fill sizes="56px" src={imageUrl} />
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
        <Image alt={title || "Imagem da variação"} className="object-cover" fill sizes="80px" src={imageUrl} />
      </div>
      <figcaption className="min-w-0 text-sm">
        <strong className="block truncate">Imagem vinculada</strong>
        <span className="text-xs text-muted-foreground">
          Será aplicada nas variantes com a mesma cor e gênero.
        </span>
      </figcaption>
    </figure>
  );
}

function MatrixOptionInput({
  onChange,
  option,
  optionIndex,
  optionName,
  variantId
}: {
  onChange: (variantId: string, optionIndex: number, patch: Partial<VariantOptionRow>) => void;
  option: VariantOptionRow;
  optionIndex: number;
  optionName: MatrixOptionName;
  variantId: string;
}): React.ReactElement {
  if (optionName === "Tamanho" || optionName === "Genero") {
    const values = optionName === "Tamanho" ? standardSizeOrder : standardGenderOptions;
    const hasCurrentValue = option.value.trim() && values.some((value) => normalizeOptionName(value) === normalizeOptionName(option.value));
    const selectValues = hasCurrentValue || !option.value.trim() ? values : [option.value, ...values];

    return (
      <label className="grid min-w-0 gap-1">
        <span className="text-xs font-semibold text-muted-foreground">{getMatrixOptionLabel(optionName)}</span>
        <select
          aria-label={`Valor de ${getMatrixOptionLabel(optionName)}`}
          className="h-10 w-full rounded-lg border border-primary/45 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => onChange(variantId, optionIndex, { name: optionName, value: event.target.value })}
          value={option.value}
        >
          <option value="">{getMatrixOptionPlaceholder(optionName)}</option>
          {selectValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-xs font-semibold text-muted-foreground">{getMatrixOptionLabel(optionName)}</span>
      <Input
        aria-label={`Valor de ${getMatrixOptionLabel(optionName)}`}
        className="h-10"
        list="product-variant-option-values"
        placeholder={getMatrixOptionPlaceholder(optionName)}
        value={option.value}
        onChange={(event) => onChange(variantId, optionIndex, { name: optionName, value: event.target.value })}
      />
    </div>
  );
}

function OptionSummary({
  label,
  onAdd,
  onAddValue,
  quickValues = [],
  values
}: {
  label: string;
  onAdd: () => void;
  onAddValue?: (value: string) => void;
  quickValues?: string[];
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
      {quickValues.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickValues.map((value) => {
            const exists = values.some((item) => normalizeOptionName(item) === normalizeOptionName(value));

            return (
              <Button
                className="h-7 px-2 text-xs"
                disabled={exists}
                key={value}
                onClick={() => onAddValue?.(value)}
                type="button"
                variant={exists ? "secondary" : "outline"}
              >
                {value}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ProductSubmitButton(): React.ReactElement {
  const status = useFormStatus();

  return (
    <Button aria-busy={status.pending} className="w-full sm:w-auto" disabled={status.pending} type="submit">
      {status.pending ? "Salvando..." : "Salvar produto"}
    </Button>
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
      aria-label="Aplicar atalho logístico"
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
    <label className="grid min-w-0 gap-2 text-sm font-medium">
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
    return [];
  }

  return product.variants.map((variant, index) => {
    const optionValues = getOptionValues(variant.optionValues);
    const options = Object.entries(optionValues)
      .filter(([name]) => name !== "_imageUrl")
      .slice(0, 3)
      .map(([name, value]) => ({ name: normalizeMatrixOptionName(name), value }));

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
      trackInventory: variant.trackInventory,
      title: variant.title || `Variação ${index + 1}`,
      weightGrams: variant.weightGrams ? String(variant.weightGrams) : "",
      widthCm: variant.widthCm ? String(variant.widthCm) : ""
    });
  });
}

function getInitialVariantPrice(product?: ProductListItem): string {
  if (!product) {
    return "";
  }

  return product.variants[0]?.priceCents
    ? formatCurrency(product.variants[0].priceCents)
    : formatCurrency(product.priceCents);
}

function getInitialBaseSku(product?: ProductListItem): string {
  return product?.variants[0]?.sku ?? "";
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
    trackInventory: false,
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
    { name: "Genero", value: "" }
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
    const label = getVariantOptionValue(variant, "Cor") || "Cor não definida";
    groups.set(label, [...(groups.get(label) ?? []), variant]);
  }

  return [...groups.entries()].map(([label, groupVariants]) => ({
    key: label,
    label,
    variants: groupVariants
  }));
}

function getMatrixOptionValues(variants: VariantFormRow[], optionName: MatrixOptionName): string[] {
  const values = uniqueStrings(variants.map((variant) => getVariantOptionValue(variant, optionName)).filter(Boolean));

  return optionName === "Tamanho" ? sortSizeValues(values) : values;
}

function addMatrixOptionValue(
  variants: VariantFormRow[],
  optionName: MatrixOptionName,
  value: string,
  fallbackVariant = createVariantRow()
): VariantFormRow[] {
  const colors = optionName === "Cor" ? [value] : getMatrixOptionValues(variants, "Cor");
  const sizes = optionName === "Tamanho" ? [value] : getMatrixOptionValues(variants, "Tamanho");
  const genders = optionName === "Genero" ? [value] : getMatrixOptionValues(variants, "Genero");
  const safeColors = colors.length > 0 ? colors : [""];
  const safeSizes = sizes.length > 0 ? sizes : [""];
  const safeGenders = genders.length > 0 ? genders : [""];
  const existingKeys = new Set(variants.map(getVariantCombinationKey));
  const baseVariant = variants[0] ?? fallbackVariant;
  const nextVariants = [...variants];

  for (const color of safeColors) {
    for (const size of safeSizes) {
      for (const gender of safeGenders) {
        const options = fillOptions([
          { name: "Cor", value: color },
          { name: "Tamanho", value: size },
          { name: "Genero", value: gender }
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
          trackInventory: baseVariant.trackInventory,
          title: buildVariantTitle(options, "Nova variação"),
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
    const sameGender = gender ? getVariantOptionValue(variant, "Genero") === gender : true;

    return sameColor && sameGender && variant.imageUrl;
  })?.imageUrl ?? "";
}

function getVariantCombinationKey(variant: VariantFormRow): string {
  return getOptionsCombinationKey(variant.options);
}

function getOptionsCombinationKey(options: VariantOptionRow[]): string {
  return matrixOptionNames
    .map((optionName) => {
      const option = options.find((item) => isSameOptionName(item.name, optionName));

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

function emptySavedMatrixOptionValues(): SavedMatrixOptionValues {
  return {
    Cor: [],
    Tamanho: [],
    Genero: []
  };
}

function loadSavedMatrixOptionValues(): SavedMatrixOptionValues {
  if (typeof window === "undefined") {
    return emptySavedMatrixOptionValues();
  }

  try {
    const rawValue = window.localStorage.getItem(matrixOptionStorageKey);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : null;

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return emptySavedMatrixOptionValues();
    }

    const record = parsedValue as Partial<Record<MatrixOptionName, unknown>>;

    return {
      Cor: normalizeSavedOptionValues(record.Cor),
      Tamanho: normalizeSavedOptionValues(record.Tamanho),
      Genero: normalizeSavedOptionValues(record.Genero)
    };
  } catch {
    return emptySavedMatrixOptionValues();
  }
}

function saveMatrixOptionValues(values: SavedMatrixOptionValues): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(matrixOptionStorageKey, JSON.stringify(values));
}

function normalizeSavedOptionValues(value: unknown): string[] {
  return Array.isArray(value) ? uniqueStrings(value.map((item) => String(item))).slice(0, 40) : [];
}

function mergeOptionValues(...groups: string[][]): string[] {
  return uniqueStrings(groups.flat());
}

function addSavedMatrixOptionValue(
  current: SavedMatrixOptionValues,
  optionName: MatrixOptionName,
  value: string
): SavedMatrixOptionValues {
  return {
    ...current,
    [optionName]: mergeOptionValues(current[optionName], [value]).slice(0, 40)
  };
}

function areSavedMatrixOptionValuesEqual(
  left: SavedMatrixOptionValues,
  right: SavedMatrixOptionValues
): boolean {
  return matrixOptionNames.every((optionName) =>
    left[optionName].length === right[optionName].length
      && left[optionName].every((value, index) => value === right[optionName][index])
  );
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

function getMatrixOptionLabel(optionName: MatrixOptionName): string {
  return optionName === "Genero" ? "Gênero" : optionName;
}

function getMatrixOptionPlaceholder(optionName: MatrixOptionName): string {
  if (optionName === "Cor") {
    return "Branca";
  }

  if (optionName === "Tamanho") {
    return "M";
  }

  return "Unissex";
}

function normalizeMatrixOptionName(optionName: string): MatrixOptionName | string {
  return genderOptionAliases.has(normalizeOptionName(optionName)) ? "Genero" : optionName;
}

function isMatrixOptionName(value: string): value is MatrixOptionName {
  return matrixOptionNames.some((optionName) => optionName === value);
}

function sortSizeValues(values: string[]): string[] {
  return [...values].sort((left, right) => {
    const leftIndex = standardSizeOrder.findIndex((size) => normalizeOptionName(size) === normalizeOptionName(left));
    const rightIndex = standardSizeOrder.findIndex((size) => normalizeOptionName(size) === normalizeOptionName(right));

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

function isSameOptionName(left: string, right: string): boolean {
  const normalizedLeft = normalizeOptionName(left);
  const normalizedRight = normalizeOptionName(right);

  if (normalizedRight === "genero") {
    return genderOptionAliases.has(normalizedLeft);
  }

  if (genderOptionAliases.has(normalizedRight)) {
    return genderOptionAliases.has(normalizedLeft);
  }

  return normalizedLeft === normalizedRight;
}

function getVariantOptionValue(variant: VariantFormRow, name: MatrixOptionName): string {
  const option = variant.options.find((item) => isSameOptionName(item.name, name));

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
        variant.title.trim() || "Padrão",
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
        options.join(";"),
        variant.trackInventory ? "controlar" : "sem_estoque"
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
