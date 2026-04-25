import Link from "next/link";

import { ProductCard } from "@/features/catalog/components/product-card";
import { ShopTrustStrip } from "@/components/shop/shop-trust-strip";
import {
  getPublicCategories,
  getPublicProducts,
  publicProductSorts,
  type PublicProductSort
} from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const filters = parseCatalogFilters(resolvedSearchParams);
  const [categories, products] = await Promise.all([
    getPublicCategories(),
    getPublicProducts(filters)
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Produtos</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Produtos disponíveis para compra, com novidades e seleções especiais da NerdLingoLab.
        </p>
      </div>

      <form action="/produtos" className="mb-8 grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div>
          <label className="text-sm font-medium" htmlFor="busca">
            Buscar
          </label>
          <input
            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary"
            defaultValue={filters.query}
            id="busca"
            maxLength={80}
            name="busca"
            placeholder="Nome, marca ou descrição"
            type="search"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="categoria">
            Categoria
          </label>
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary"
            defaultValue={filters.categorySlug}
            id="categoria"
            name="categoria"
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="ordem">
            Ordenar
          </label>
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary"
            defaultValue={filters.sort}
            id="ordem"
            name="ordem"
          >
            <option value="recentes">Mais recentes</option>
            <option value="menor-valor">Menor valor</option>
            <option value="maior-valor">Maior valor</option>
            <option value="nome">Nome</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
            Filtrar
          </button>
          <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium" href="/produtos">
            Limpar
          </Link>
        </div>
      </form>

      <p className="mb-4 text-sm text-muted-foreground">
        {products.length === 1 ? "1 produto encontrado." : `${products.length} produtos encontrados.`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length === 0 ? (
        <p className="rounded-md border p-6 text-sm text-muted-foreground">
          Nenhum produto encontrado com esses filtros.
        </p>
      ) : null}
      <div className="mt-10">
        <ShopTrustStrip />
      </div>
    </main>
  );
}

function parseCatalogFilters(searchParams?: Record<string, string | string[] | undefined>): {
  categorySlug?: string;
  query?: string;
  sort: PublicProductSort;
} {
  const query = normalizeSearchParam(searchParams?.busca, 80);
  const categorySlug = normalizeSearchParam(searchParams?.categoria, 80);
  const sortParam = normalizeSearchParam(searchParams?.ordem, 24);
  const sort = publicProductSorts.includes(sortParam as PublicProductSort)
    ? (sortParam as PublicProductSort)
    : "recentes";

  return {
    categorySlug,
    query,
    sort
  };
}

function normalizeSearchParam(value: string | string[] | undefined, maxLength: number): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim().slice(0, maxLength);

  return normalizedValue || undefined;
}
