import { Archive, Pencil, Plus, RotateCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { archiveProduct, syncShopifyProductsFromCsv } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductStatus, type Category } from "@/generated/prisma/client";
import type { AdminProductFilters, ProductListItem } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/format";

interface ProductTableProps {
  categories: Category[];
  filters: AdminProductFilters;
  products: ProductListItem[];
}

export function ProductTable({ categories, filters, products }: ProductTableProps): React.ReactElement {
  const activeProducts = products.filter((product) => product.status === "ACTIVE").length;
  const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
  const totalStock = products.reduce(
    (sum, product) => sum + product.variants.reduce((variantSum, variant) => variantSum + variant.stockQuantity, 0),
    0
  );

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>
            {products.length} cadastrados · {activeProducts} ativos · {totalVariants} variantes · {totalStock} em estoque
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={syncShopifyProductsFromCsv}>
            <Button size="sm" type="submit" variant="outline">
              <RotateCw className="mr-2 h-4 w-4" />
              Sincronizar Shopify CSV
            </Button>
          </form>
          <Button asChild size="sm">
            <Link href="/admin/produtos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form className="mb-4 grid gap-3 rounded-lg border bg-muted/30 p-3 lg:grid-cols-[minmax(0,1fr)_180px_220px_auto]">
          <label className="grid gap-2 text-sm font-medium">
            Buscar
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm"
              defaultValue={filters.query ?? ""}
              name="busca"
              placeholder="Nome, slug, marca ou SKU"
            />
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
            Categoria
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
        <div className="divide-y rounded-md border">
          {products.map((product) => (
            <div key={product.id} className="grid gap-3 p-4 md:grid-cols-[72px_minmax(0,1fr)_auto_auto] md:items-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-md bg-muted md:h-16 md:w-16">
                {getPrimaryProductImage(product) ? (
                  <Image
                    alt={product.title}
                    className="object-cover"
                    fill
                    sizes="80px"
                    src={getPrimaryProductImage(product) ?? ""}
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {product.category?.name ?? "Sem categoria"} · {product.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.variants.length} variantes ·{" "}
                  {product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)} unidades
                </p>
              </div>
              <p className="text-sm font-medium">{formatCurrency(product.priceCents)}</p>
              <div className="flex gap-2">
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
              </div>
            </div>
          ))}
          {products.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function getPrimaryProductImage(product: ProductListItem): string | null {
  if (!Array.isArray(product.images)) {
    return null;
  }

  const firstImage = product.images.find((image): image is string => typeof image === "string" && image.length > 0);

  return firstImage ?? null;
}
