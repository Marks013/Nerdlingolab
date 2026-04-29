import { ProductStatus, type Category } from "@/generated/prisma/client";
import { Boxes, ClipboardList, ImageIcon, Layers3, Search, Sparkles, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductImageUploader } from "@/features/catalog/components/product-image-uploader";
import { getImageUrls } from "@/features/catalog/image-utils";
import { formatCurrency } from "@/lib/format";
import type { ProductListItem } from "@/lib/catalog/queries";

interface ProductFormProps {
  action: (formData: FormData) => Promise<void>;
  categories: Category[];
  product?: ProductListItem;
}

export function ProductForm({ categories, product, action }: ProductFormProps): React.ReactElement {
  const variant = product?.variants[0];
  const imageUrls = getImageUrls(product?.images).join("\n");
  const variantRows = product ? formatVariantRows(product) : "";
  const metafieldRows = product ? formatMetafieldRows(product.metafields) : "";
  const totalStock = product?.variants.reduce((sum, item) => sum + item.stockQuantity, 0) ?? 0;
  const activeVariants = product?.variants.filter((item) => item.isActive).length ?? 0;

  return (
    <form action={action} className="grid gap-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Catalogo / Produtos</p>
          <h1 className="text-2xl font-bold tracking-normal">{product ? "Editar produto" : "Novo produto"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Estruture conteudo, midia, organizacao, variacoes, estoque e metacampos em um fluxo unico.
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
              <label className="grid gap-2 text-sm font-medium lg:col-span-2">
                Descricao completa
                <Textarea defaultValue={product?.description} name="description" required rows={8} />
              </label>
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={ImageIcon} title="Midia" />
            <div className="mt-4">
              <ProductImageUploader defaultValue={imageUrls} />
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Layers3} title="Variacoes e estoque" />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                SKU base
                <Input defaultValue={variant?.sku ?? ""} name="sku" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Estoque base
                <Input defaultValue={variant?.stockQuantity ?? 0} min={0} name="stockQuantity" type="number" />
              </label>
              <label className="grid gap-2 text-sm font-medium lg:col-span-2">
                Editor rapido de variacoes
                <Textarea
                  defaultValue={variantRows}
                  name="variants"
                  placeholder="Titulo | SKU | preco | estoque | preco comparativo | codigo de barras | peso em g | ativo | Cor=Azul;Tamanho=M;_imageUrl=/uploads/azul.webp"
                  rows={7}
                />
                <span className="text-xs text-muted-foreground">
                  Uma linha por variante. Use opcoes como Cor, Tamanho e _imageUrl para swatches e fotos por variacao.
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Sparkles} title="Metacampos" />
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Campos personalizados
              <Textarea
                defaultValue={metafieldRows}
                name="metafields"
                placeholder={"custom.care=Cuidado: lavar do avesso\ncustom.fabric=Algodao premium\nseo.hidden=false"}
                rows={6}
              />
              <span className="text-xs text-muted-foreground">
                Use namespace.chave=valor ou JSON. Util para especificacoes, instrucoes, filtros internos e SEO.
              </span>
            </label>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Boxes} title="Publicacao" />
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Situacao
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                defaultValue={product?.status ?? ProductStatus.DRAFT}
                name="status"
              >
                <option value={ProductStatus.DRAFT}>Rascunho</option>
                <option value={ProductStatus.ACTIVE}>Ativo</option>
                <option value={ProductStatus.ARCHIVED}>Arquivado</option>
              </select>
            </label>
            {product ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Variacoes" value={`${activeVariants}/${product.variants.length}`} />
                <Metric label="Estoque" value={String(totalStock)} />
              </dl>
            ) : null}
          </section>

          <section className="rounded-lg border bg-background p-5">
            <SectionHeading icon={Tags} title="Organizacao" />
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Colecao / categoria
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  defaultValue={product?.categoryId ?? ""}
                  name="categoryId"
                >
                  <option value="">Sem colecao</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
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
            <SectionHeading icon={Search} title="Precos e SEO" />
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Preco
                <Input defaultValue={product ? formatCurrency(product.priceCents) : ""} name="price" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Preco comparativo
                <Input
                  defaultValue={product?.compareAtPriceCents ? formatCurrency(product.compareAtPriceCents) : ""}
                  name="compareAtPrice"
                />
              </label>
            </div>
          </section>
        </aside>
      </div>
    </form>
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
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function formatVariantRows(product: ProductListItem): string {
  return product.variants
    .map((variant) => {
      const optionValues = formatOptionValues(variant.optionValues);

      return [
        variant.title,
        variant.sku,
        formatCurrency(variant.priceCents),
        String(variant.stockQuantity),
        variant.compareAtPriceCents ? formatCurrency(variant.compareAtPriceCents) : "",
        variant.barcode ?? "",
        variant.weightGrams ? String(variant.weightGrams) : "",
        variant.isActive ? "ativo" : "inativo",
        optionValues
      ].join(" | ");
    })
    .join("\n");
}

function formatOptionValues(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([optionName, optionValue]) => `${optionName}=${String(optionValue)}`)
    .join(";");
}

function formatMetafieldRows(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, metafieldValue]) => `${key}=${String(metafieldValue)}`)
    .join("\n");
}
