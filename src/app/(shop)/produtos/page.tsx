import { Grid3X3, Rows3, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { ShopTrustStrip } from "@/components/shop/shop-trust-strip";
import { ProductCard } from "@/features/catalog/components/product-card";
import {
  getPublicCategories,
  getPublicProducts,
  publicProductSorts,
  type PublicProductSort
} from "@/lib/catalog/queries";
import { formatCurrency, parseCurrencyToCents } from "@/lib/format";

export const dynamic = "force-dynamic";

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
  const [categories, products] = await Promise.all([
    getPublicCategories(),
    getPublicProducts(filters)
  ]);
  const resultLabel =
    products.length === 1
      ? "1 produto encontrado."
      : `Mostrando 1 - ${products.length} de ${products.length} produtos`;

  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      <div className="mx-auto w-full max-w-[1360px] px-4 py-8 sm:px-5 sm:py-10">
        <div className="mb-8">
          <p className="mb-5 text-sm text-[#4f5d65]">Pagina inicial › Todos os produtos</p>
          <h1 className="text-center text-3xl font-medium tracking-normal text-black sm:text-4xl">Produtos</h1>
          <p className="mt-3 text-center text-sm font-semibold text-[#4f5d65]">Seleções especiais da NerdLingoLab</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-lg bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-5 lg:self-start">
            <div className="mb-5 flex items-center gap-2 text-lg font-black text-black">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Filtros
            </div>

            <form action="/produtos" className="space-y-6">
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

              <div className="flex gap-2">
                <button className="h-11 flex-1 rounded-lg bg-primary px-5 text-sm font-black text-white transition hover:bg-[#d85b00]" type="submit">
                  Filtrar
                </button>
                <Link className="inline-flex h-11 items-center rounded-lg border bg-white px-4 text-sm font-medium text-black transition hover:border-primary" href="/produtos">
                  Limpar
                </Link>
              </div>
            </form>
          </aside>

          <section>
            <div className="mb-5 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-[#4f5d65]">{resultLabel}</p>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[#4f5d65]">
                  Mostrar:
                  <select className="h-10 rounded-lg border bg-white px-3 text-sm text-black outline-none">
                    <option>24 por página</option>
                    <option>48 por página</option>
                    <option>96 por página</option>
                  </select>
                </label>

                <form action="/produtos" className="flex items-center gap-2 text-sm text-[#4f5d65]">
                  <input name="busca" type="hidden" value={filters.query ?? ""} />
                  <input name="categoria" type="hidden" value={filters.categorySlug ?? ""} />
                  <input name="precoMin" type="hidden" value={filters.minPriceCents ? formatCurrency(filters.minPriceCents) : ""} />
                  <input name="precoMax" type="hidden" value={filters.maxPriceCents ? formatCurrency(filters.maxPriceCents) : ""} />
                  <label htmlFor="ordem">Ordenar</label>
                  <select
                    className="h-10 rounded-lg border bg-white px-3 text-sm text-black outline-none"
                    defaultValue={filters.sort}
                    id="ordem"
                    name="ordem"
                  >
                    <option value="nome">Ordem alfabética, A-Z</option>
                    <option value="recentes">Mais recentes</option>
                    <option value="menor-valor">Menor valor</option>
                    <option value="maior-valor">Maior valor</option>
                  </select>
                  <button className="sr-only" type="submit">Ordenar</button>
                </form>

                <div className="hidden items-center gap-1 text-[#4f5d65] sm:flex" aria-label="Visualização">
                  <span className="text-sm">Visualização</span>
                  <button
                    aria-label="Visualizar produtos em grade"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white"
                    type="button"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Visualizar produtos em lista"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-[#4f5d65]"
                    type="button"
                  >
                    <Rows3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product, productIndex) => (
                <ProductCard imagePriority={productIndex < 4} key={product.id} product={product} />
              ))}
            </div>
            {products.length === 0 ? (
              <p className="rounded-lg bg-white p-6 text-sm text-[#4f5d65] shadow-sm">
                Nenhum produto encontrado com esses filtros.
              </p>
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
  query?: string;
  sort: PublicProductSort;
  tags: string[];
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
    query,
    sort,
    tags: normalizeMultiParam(searchParams?.tag, 40)
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
