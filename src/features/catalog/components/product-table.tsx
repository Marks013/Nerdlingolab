import { AlertTriangle, Archive, CheckCircle2, Pencil, Plus, RotateCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import { archiveProduct, deleteProduct, syncShopifyProductsFromCsv } from "@/actions/catalog";
import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductStatus, type Category } from "@/generated/prisma/client";
import type { AdminProductFilters, ProductListItem } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/format";

interface ProductTableProps {
  categories: Category[];
  filters: AdminProductFilters;
  products: ProductListItem[];
}

export function ProductTable({ categories, filters, products }: ProductTableProps): React.ReactElement {
  const activeProducts = products.filter((product) => product.status === ProductStatus.ACTIVE).length;
  const draftProducts = products.filter((product) => product.status === ProductStatus.DRAFT).length;
  const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
  const totalStock = products.reduce(
    (sum, product) => sum + product.variants.reduce((variantSum, variant) => variantSum + variant.stockQuantity, 0),
    0
  );
  const lowStockProducts = products.filter((product) => getAvailableStock(product) > 0 && getAvailableStock(product) <= 3).length;
  const outOfStockProducts = products.filter((product) => getAvailableStock(product) <= 0).length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Catálogo</p>
          <h1 className="text-3xl font-bold tracking-normal">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie produtos, colecoes, variacoes, midias, estoque e metacampos em uma area operacional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={syncShopifyProductsFromCsv}>
            <Button size="sm" type="submit" variant="outline">
              <RotateCw className="mr-2 h-4 w-4" />
              Sincronizar CSV
            </Button>
          </form>
          <Button asChild size="sm">
            <Link href="/admin/produtos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo produto
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric title="Produtos" value={String(products.length)} />
        <Metric title="Ativos" value={String(activeProducts)} />
        <Metric title="Rascunhos" value={String(draftProducts)} />
        <Metric title="Variacoes" value={String(totalVariants)} />
        <Metric title="Estoque total" value={String(totalStock)} />
      </div>

      <form className="grid gap-3 rounded-lg border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_180px_220px_auto]">
        <label className="grid gap-2 text-sm font-medium">
          Buscar
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              defaultValue={filters.query ?? ""}
              name="busca"
              placeholder="Nome, slug, marca, SKU ou variacao"
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={filters.status ?? ""} name="status">
            <option value="">Todos</option>
            <option value={ProductStatus.ACTIVE}>Ativo</option>
            <option value={ProductStatus.DRAFT}>Rascunho</option>
            <option value={ProductStatus.ARCHIVED}>Arquivado</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Colecao / categoria
          <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={filters.categoryId ?? ""} name="categoria">
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button className="w-full" type="submit" variant="secondary">Filtrar</Button>
          <Button asChild className="w-full" variant="ghost">
            <Link href="/admin/produtos">Limpar</Link>
          </Button>
        </div>
      </form>

      {lowStockProducts > 0 || outOfStockProducts > 0 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {lowStockProducts > 0 ? <StockNotice tone="warning" value={`${lowStockProducts} com estoque baixo`} /> : null}
          {outOfStockProducts > 0 ? <StockNotice tone="danger" value={`${outOfStockProducts} sem estoque`} /> : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="hidden grid-cols-[minmax(320px,1.4fr)_150px_130px_120px_150px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground lg:grid">
          <span>Produto</span>
          <span>Status</span>
          <span>Estoque</span>
          <span>Preço</span>
          <span className="text-right">Acoes</span>
        </div>
        <div className="divide-y">
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
          {products.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nenhum produto encontrado para os filtros atuais.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProductRow({ product }: { product: ProductListItem }): React.ReactElement {
  const imageUrl = getPrimaryProductImage(product);
  const availableStock = getAvailableStock(product);
  const metafieldCount = getMetafieldCount(product.metafields);

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(320px,1.4fr)_150px_130px_120px_150px] lg:items-center">
      <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
          {imageUrl ? <Image alt={product.title} className="object-cover" fill sizes="72px" src={imageUrl} /> : null}
        </div>
        <div className="min-w-0">
          <Link className="font-medium hover:underline" href={`/admin/produtos/${product.id}/editar`}>
            {product.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.category?.name ?? "Sem colecao"} / {product.brand ?? "Sem marca"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {product.variants.length} variacoes / {product.tags.length} tags / {metafieldCount} metacampos
          </p>
        </div>
      </div>

      <StatusBadge status={product.status} />
      <StockBadge availableStock={availableStock} />
      <p className="text-sm font-semibold">{formatCurrency(product.priceCents)}</p>
      <div className="flex justify-end gap-2">
        <Button asChild size="icon" variant="outline">
          <Link href={`/admin/produtos/${product.id}/editar`} title="Editar">
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <form action={archiveProduct.bind(null, product.id)}>
          <Button size="icon" title="Arquivar" type="submit" variant="outline">
            <Archive className="h-4 w-4" />
          </Button>
        </form>
        <form action={deleteProduct.bind(null, product.id)}>
          <Button size="icon" title="Excluir sem pedidos" type="submit" variant="outline">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ProductStatus }): React.ReactElement {
  const labelByStatus = {
    [ProductStatus.ACTIVE]: "Ativo",
    [ProductStatus.DRAFT]: "Rascunho",
    [ProductStatus.ARCHIVED]: "Arquivado"
  } satisfies Record<ProductStatus, string>;

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium">
      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
      {labelByStatus[status]}
    </span>
  );
}

function StockBadge({ availableStock }: { availableStock: number }): React.ReactElement {
  const isLow = availableStock > 0 && availableStock <= 3;
  const isOut = availableStock <= 0;

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium">
      {isLow || isOut ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
      {availableStock} disponiveis
    </span>
  );
}

function StockNotice({ tone, value }: { tone: "danger" | "warning"; value: string }): React.ReactElement {
  return (
    <span className={tone === "danger"
      ? "inline-flex items-center rounded-full border border-destructive/30 px-3 py-1 text-destructive"
      : "inline-flex items-center rounded-full border px-3 py-1 text-muted-foreground"}
    >
      {value}
    </span>
  );
}

function getPrimaryProductImage(product: ProductListItem): string | null {
  if (!Array.isArray(product.images)) {
    return null;
  }

  const firstImage = product.images.find((image): image is string => typeof image === "string" && image.length > 0);

  return firstImage ?? null;
}

function getAvailableStock(product: ProductListItem): number {
  return product.variants.reduce(
    (sum, variant) => sum + Math.max(0, variant.stockQuantity - variant.reservedQuantity),
    0
  );
}

function getMetafieldCount(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  return Object.keys(value).length;
}
