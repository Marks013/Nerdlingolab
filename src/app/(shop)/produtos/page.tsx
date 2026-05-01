import { SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ShopTrustStrip } from "@/components/shop/shop-trust-strip";
import { ProductCatalogControls } from "@/features/catalog/components/product-catalog-controls";
import { ProductCard } from "@/features/catalog/components/product-card";
import {
  getPublicCategories,
  getPublicProductsPage,
  publicProductSorts,
  type PublicProductSort
} from "@/lib/catalog/queries";
import { formatCurrency, parseCurrencyToCents } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Todos os produtos geek, camisetas e action figures",
  description: "Confira camisetas, oversized, action figures, cupons e ofertas da NerdLingoLab.",
  alternates: {
    canonical: "/produtos"
  }
};

interface ProductsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const storefrontTags = [
  "Academia",
  "Anime",
  "Colecionável",
  "Frases",
  "Geek",
  "Gênero_Feminino",
  "Gênero_Masculino",
  "Gênero_Unissex",
  "Japones",
  "Meme",
  "Oversized",
  "Streetwear"
];

export default async function ProductsPage({ searchParams }: ProductsPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const filters = parseCatalogFilters(resolvedSearchParams);
  const [categories, productPage] = await Promise.all([
    getPublicCategories(),
    getPublicProductsPage(filters, filters.page, filters.perPage)
  ]);
  const visibleProducts = productPage.products;
  const firstVisibleProduct = productPage.total === 0
    ? 0
    : (productPage.currentPage - 1) * productPage.perPage + 1;
  const lastVisibleProduct = firstVisibleProduct + visibleProducts.length - 1;
  const resultLabel =
    productPage.total === 1
      ? "1 produto encontrado."
      : `Mostrando ${firstVisibleProduct} - ${lastVisibleProduct} de ${productPage.total} produtos`;

  return (
    <main className="geek-page min-h-screen">
      <div className="mx-auto w-full max-w-[1360px] px-4 py-8 sm:px-5 sm:py-10">
        <div className="mb-8">
          <p className="mb-5 text-sm text-[#4f5d65]">Pagina inicial › Todos os produtos</p>
          <div className="text-center">
            <h1 className="geek-title text-3xl font-medium tracking-normal text-black sm:text-4xl">Produtos</h1>
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-[#4f5d65]">Seleções especiais da NerdLingoLab</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="manga-panel rounded-lg bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-5 lg:self-start">
            <div className="mb-5 flex items-center gap-2 text-lg font-black text-black">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Filtros
            </div>

            <form action="/produtos#lista-produtos" className="space-y-6">
              <div>
                <label className="text-sm font-bold text-black" htmlFor="busca">
                  Buscar
                </label>
                <input
                  className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  defaultValue={filters.query}
                  id="busca"
                  maxLength={80}
                  name="busca"
                  placeholder="Nome, marca ou descrição"
                  type="search"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-black" htmlFor="categoria">
                  Categoria
                </label>
                <select
                  className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary"
                  defaultValue={filters.categorySlug ?? ""}
                  id="categoria"
                  name="categoria"
                >
                  <option value="">Todos os produtos</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-3 text-sm font-bold text-black">Coleções</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-[#344049] lg:grid-cols-1">
                  {storefrontTags.map((tag) => (
                    <label className="flex min-h-9 items-center gap-2 rounded-md border border-[#eeeeee] px-2" key={tag}>
                      <input
                        className="h-4 w-4 accent-primary"
                        defaultChecked={filters.tags.includes(tag)}
                        name="tag"
                        type="checkbox"
                        value={tag}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-black" htmlFor="precoMin">
                    Valor mínimo
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary"
                    defaultValue={filters.minPriceCents ? formatCurrency(filters.minPriceCents) : ""}
                    id="precoMin"
                    name="precoMin"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-black" htmlFor="precoMax">
                    Valor máximo
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary"
                    defaultValue={filters.maxPriceCents ? formatCurrency(filters.maxPriceCents) : ""}
                    id="precoMax"
                    name="precoMax"
                    placeholder="R$ 500,00"
                  />
                </div>
              </div>

              <input name="ordem" type="hidden" value={filters.sort} />
              <input name="porPagina" type="hidden" value={filters.perPage} />
              <input name="visualizacao" type="hidden" value={filters.view} />

              <div className="flex gap-2">
                <button className="h-11 flex-1 rounded-lg bg-primary px-5 text-sm font-black text-white transition hover:bg-[#d85b00]" type="submit">
                  Filtrar
                </button>
                <Link className="inline-flex h-11 items-center rounded-lg border bg-white px-4 text-sm font-medium text-black transition hover:border-primary" href="/produtos#lista-produtos">
                  Limpar
                </Link>
              </div>
            </form>
          </aside>

          <section className="scroll-mt-32" id="lista-produtos">
            <div className="manga-panel mb-5 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-[#4f5d65]">{resultLabel}</p>

              <ProductCatalogControls perPage={filters.perPage} sort={filters.sort} view={filters.view} />
            </div>

            <div className={filters.view === "list"
              ? "grid grid-cols-1 gap-3 sm:gap-4"
              : "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"}
            >
              {visibleProducts.map((product, productIndex) => (
                <ProductCard
                  imagePriority={productIndex < 4}
                  key={product.id}
                  product={product}
                  variant={filters.view}
                />
              ))}
            </div>
            {productPage.total === 0 ? (
              <p className="manga-panel rounded-lg bg-white p-6 text-sm text-[#4f5d65] shadow-sm">
                Nenhum produto encontrado com esses filtros.
              </p>
            ) : null}
            {productPage.totalPages > 1 ? (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginação de produtos">
                {Array.from({ length: productPage.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <Link
                    aria-current={pageNumber === productPage.currentPage ? "page" : undefined}
                    className={pageNumber === productPage.currentPage
                      ? "flex h-10 min-w-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-black text-white shadow-sm"
                      : "flex h-10 min-w-10 items-center justify-center rounded-lg border border-[#ffd7bd] bg-white px-3 text-sm font-bold text-[#4f5d65] shadow-sm transition hover:border-primary hover:text-primary"}
                    href={buildPageHref(resolvedSearchParams, pageNumber)}
                    key={pageNumber}
                  >
                    {pageNumber}
                  </Link>
                ))}
              </nav>
            ) : null}
          </section>
        </div>

        <div className="mt-10">
          <ShopTrustStrip />
        </div>
      </div>
    </main>
  );
}

function parseCatalogFilters(searchParams?: Record<string, string | string[] | undefined>): {
  categorySlug?: string;
  maxPriceCents?: number;
  minPriceCents?: number;
  page: number;
  perPage: number;
  query?: string;
  sort: PublicProductSort;
  tags: string[];
  view: "grid" | "list";
} {
  const query = normalizeSearchParam(searchParams?.busca, 80);
  const categorySlug = normalizeSearchParam(searchParams?.categoria, 80);
  const sortParam = normalizeSearchParam(searchParams?.ordem, 24);
  const sort = publicProductSorts.includes(sortParam as PublicProductSort)
    ? (sortParam as PublicProductSort)
    : "recentes";

  return {
    categorySlug,
    maxPriceCents: normalizePriceParam(searchParams?.precoMax),
    minPriceCents: normalizePriceParam(searchParams?.precoMin),
    page: normalizePageParam(searchParams?.pagina),
    perPage: normalizePerPageParam(searchParams?.porPagina),
    query,
    sort,
    tags: normalizeMultiParam(searchParams?.tag, 40),
    view: normalizeSearchParam(searchParams?.visualizacao, 12) === "list" ? "list" : "grid"
  };
}

function normalizeSearchParam(value: string | string[] | undefined, maxLength: number): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim().slice(0, maxLength);

  return normalizedValue || undefined;
}

function normalizeMultiParam(value: string | string[] | undefined, maxLength: number): string[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];

  return rawValues
    .map((rawValue) => rawValue.trim().slice(0, maxLength))
    .filter(Boolean);
}

function normalizePriceParam(value: string | string[] | undefined): number | undefined {
  const rawValue = normalizeSearchParam(value, 24);

  if (!rawValue) {
    return undefined;
  }

  const priceCents = parseCurrencyToCents(rawValue);

  return priceCents > 0 ? priceCents : undefined;
}

function normalizePerPageParam(value: string | string[] | undefined): number {
  const rawValue = Number(normalizeSearchParam(value, 3) ?? 24);

  return [24, 48, 96].includes(rawValue) ? rawValue : 24;
}

function normalizePageParam(value: string | string[] | undefined): number {
  const rawValue = Number(normalizeSearchParam(value, 5) ?? 1);

  return Number.isInteger(rawValue) && rawValue > 0 ? rawValue : 1;
}

function buildPageHref(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  page: number
): string {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (key === "pagina" || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    params.set(key, value);
  });

  if (page > 1) {
    params.set("pagina", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/produtos?${queryString}#lista-produtos` : "/produtos#lista-produtos";
}
