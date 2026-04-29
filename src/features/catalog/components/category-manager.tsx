import { Layers3, PackagePlus, Trash2 } from "lucide-react";

import { assignProductToCategory, createCategory, removeProductFromCategory } from "@/actions/catalog";
import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getImageUrls } from "@/features/catalog/image-utils";
import type { AdminCategoryManagerItem, ProductListItem } from "@/lib/catalog/queries";
import { formatCurrency } from "@/lib/format";

interface CategoryManagerProps {
  categories: AdminCategoryManagerItem[];
  products: ProductListItem[];
}

export function CategoryManager({ categories, products }: CategoryManagerProps): React.ReactElement {
  const unassignedProducts = products.filter((product) => !product.categoryId);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Catálogos e coleções</CardTitle>
          <CardDescription>Abra um catálogo para ver itens, cores, variações e ajustar produtos exibidos na vitrine.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {categories.map((category) => (
            <CategoryCard category={category} key={category.id} products={products} />
          ))}
          {categories.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Nova categoria</CardTitle>
            <CardDescription>Use imagem, texto e ordem para montar vitrines mais claras.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCategory} className="space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                Nome
                <Input name="name" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input name="slug" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Imagem da coleção
                <Input name="imageUrl" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Descrição
                <Textarea name="description" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked name="isActive" type="checkbox" />
                Categoria ativa
              </label>
              <Button className="h-10 w-full" type="submit">
                Criar categoria
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos sem catálogo</CardTitle>
            <CardDescription>Itens que ainda precisam entrar em uma coleção.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {unassignedProducts.slice(0, 8).map((product) => (
              <span className="truncate rounded-md border px-3 py-2 text-sm" key={product.id}>{product.title}</span>
            ))}
            {unassignedProducts.length === 0 ? <p className="text-sm text-muted-foreground">Todos os produtos estão organizados.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CategoryCard({ category, products }: { category: AdminCategoryManagerItem; products: ProductListItem[] }): React.ReactElement {
  const productIds = new Set(category.products.map((product) => product.id));
  const availableProducts = products.filter((product) => !productIds.has(product.id));
  const totalVariants = category.products.reduce((total, product) => total + product.variants.length, 0);
  const colors = getCategoryColors(category);

  return (
    <details className="rounded-lg border bg-background">
      <summary className="grid cursor-pointer list-none gap-4 p-4 transition hover:bg-muted/40 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center">
        <CategoryImage category={category} />
        <div className="min-w-0">
          <p className="font-semibold">{category.name}</p>
          <p className="text-sm text-muted-foreground">{category.description ?? "Sem descrição pública"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-2 py-1">{category._count.products} produto{category._count.products === 1 ? "" : "s"}</span>
            <span className="rounded-full border px-2 py-1">{totalVariants} variação{totalVariants === 1 ? "" : "ões"}</span>
            <span className="rounded-full border px-2 py-1">{category.isActive ? "Visível" : "Oculta"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 md:justify-end">
          {colors.slice(0, 8).map((color) => (
            <span className="size-5 rounded-full border" key={color} style={{ backgroundColor: getSwatchColor(color) }} title={color} />
          ))}
        </div>
      </summary>

      <div className="grid gap-4 border-t p-4">
        <form action={assignProductToCategory} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input name="categoryId" type="hidden" value={category.id} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" name="productId" required>
            <option value="">Adicionar produto ao catálogo</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>{product.title}</option>
            ))}
          </select>
          <Button className="h-10 px-4" type="submit">
            <PackagePlus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </form>

        <div className="grid gap-3 lg:grid-cols-2">
          {category.products.map((product) => (
            <ProductInCategory key={product.id} product={product} />
          ))}
          {category.products.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum produto neste catálogo.</p>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function ProductInCategory({ product }: { product: AdminCategoryManagerItem["products"][number] }): React.ReactElement {
  const imageUrl = getImageUrls(product.images)[0];
  const stock = product.variants.reduce((total, variant) => total + variant.stockQuantity, 0);

  return (
    <article className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 rounded-lg border p-3">
      <div className="relative size-16 overflow-hidden rounded-md bg-muted">
        {imageUrl ? <Image alt={product.title} className="object-cover" fill sizes="64px" src={imageUrl} /> : <Layers3 className="m-5 h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{product.title}</p>
        <p className="text-xs text-muted-foreground">{product.variants.length} variação{product.variants.length === 1 ? "" : "ões"} / {stock} em estoque</p>
        <p className="text-sm font-semibold">{formatCurrency(product.priceCents)}</p>
      </div>
      <form action={removeProductFromCategory}>
        <input name="productId" type="hidden" value={product.id} />
        <Button className="h-10 border-destructive px-3 text-destructive hover:bg-destructive hover:text-destructive-foreground" type="submit" variant="outline">
          <Trash2 className="mr-2 h-4 w-4" />
          Remover
        </Button>
      </form>
    </article>
  );
}

function CategoryImage({ category }: { category: AdminCategoryManagerItem }): React.ReactElement {
  if (!category.imageUrl) {
    return <div className="grid size-20 place-items-center rounded-lg border bg-muted text-muted-foreground"><Layers3 className="h-6 w-6" /></div>;
  }

  return (
    <div className="relative size-20 overflow-hidden rounded-lg border bg-muted">
      <Image alt={category.name} className="object-cover" fill sizes="80px" src={category.imageUrl} />
    </div>
  );
}

function getCategoryColors(category: AdminCategoryManagerItem): string[] {
  const colors = category.products.flatMap((product) =>
    product.variants.map((variant) => {
      const values = variant.optionValues;

      return typeof values === "object" && values && !Array.isArray(values) ? String((values as Record<string, unknown>).Cor ?? "") : "";
    })
  );

  return [...new Set(colors.map((color) => color.trim()).filter(Boolean))];
}

function getSwatchColor(value: string): string {
  const colors: Record<string, string> = {
    amarelo: "#fde68a",
    azul: "#1d70d6",
    bege: "#e8d6ad",
    branco: "#ffffff",
    cinza: "#9ca3af",
    creme: "#fff7d6",
    preto: "#111827",
    rosa: "#f9a8d4",
    verde: "#22c55e",
    vermelho: "#ef4444"
  };

  return colors[value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] ?? "#e5e7eb";
}
