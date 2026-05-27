"use client";

import { ArrowRight, Bot, ChevronDown, ChevronRight, ChevronsRight, Headphones, Menu, Search, ShoppingCart, Star, Tags, Ticket, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";

import { signOutFromCustomer } from "@/actions/auth";
import { SafeImage as Image } from "@/components/media/safe-image";
import { LoginModal } from "@/features/auth/components/login-modal";
import { useCartStore } from "@/features/cart/cart-store";
import { useFavorites } from "@/features/catalog/components/favorite-button";
import { formatCurrency } from "@/lib/format";

const headerLinks = [
  { href: "/conta", label: "Conta", icon: UserRound },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/favoritos", label: "Favoritos", icon: Star },
  { href: "/suporte", label: "Suporte", icon: Headphones }
];

const categoryLinks = [
  { href: "/cupons", label: "Cupons", icon: Ticket, color: "bg-[#ffd13d]", iconColor: "text-[#221b00]" },
  { href: "/ofertas", label: "Ofertas", icon: Star, color: "bg-[#ff4e70]", iconColor: "text-[#24000a]" },
  { href: "/produtos?categoria=temporada#lista-produtos", label: "Temporada", icon: Tags, color: "bg-[#3fc66a]", iconColor: "text-[#062411]" },
  { href: "/produtos?categoria=action-figures#lista-produtos", label: "Action Figures", icon: Bot, color: "bg-[#5522a8]", iconColor: "text-white" }
];

const drawerCategoryGroups = [
  { href: "/produtos?ordem=recentes#lista-produtos", label: "Novidades" },
  { href: "/produtos?ordem=mais-vendidos#lista-produtos", label: "Mais Vendidos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/produtos?categoria=temporada#lista-produtos", label: "Temporadas" }
];

const drawerCatalogLinks = [
  { href: "/produtos#lista-produtos", label: "Todos os produtos" },
  { href: "/produtos?categoria=camisetas#lista-produtos", label: "Camisetas" },
  { href: "/produtos?categoria=action-figures#lista-produtos", label: "Action Figures" },
  { href: "/produtos?categoria=anime#lista-produtos", label: "Anime" },
  { href: "/produtos?categoria=geek#lista-produtos", label: "Geek" },
  { href: "/produtos?categoria=oversized#lista-produtos", label: "Oversized" },
  { href: "/cupons", label: "Cupons" },
  { href: "/programa-de-fidelidade", label: "NerdCoins" }
];

const headerActionClass =
  "group relative inline-flex min-h-9 min-w-0 shrink-0 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold leading-tight transition-colors duration-150 hover:bg-white hover:text-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-8 md:px-1.5 md:py-1 md:text-[11px] xl:min-h-9 xl:px-2 xl:py-1.5 xl:text-xs 2xl:min-h-10 2xl:gap-1.5 2xl:text-sm";

const headerCountBadgeClass =
  "ml-0.5 inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] px-1.5 text-[10px] font-black leading-none text-white shadow-sm";

export function ShopHeader({
  announcementText = "FRETE GRÁTIS em compras acima de R$99,90",
  isAuthenticated = false,
  nerdcoinsBalance = null,
  searchProducts = []
}: {
  announcementText?: string;
  isAuthenticated?: boolean;
  nerdcoinsBalance?: number | null;
  searchProducts?: Array<{
    categoryName: string | null;
    id: string;
    imageUrl: string | null;
    priceCents: number;
    slug: string;
    title: string;
  }>;
}): React.ReactElement {
  const router = useRouter();
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const favorites = useFavorites();
  const cartCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const cartBadgeLabel = useMemo(() => (cartCount > 99 ? "99+" : String(cartCount)), [cartCount]);
  const favoriteBadgeLabel = useMemo(() => (favorites.length > 99 ? "99+" : String(favorites.length)), [favorites.length]);
  const trimmedSearchTerm = searchTerm.trim();
  const searchMatches = useMemo(() => {
    const query = normalizeSearchText(trimmedSearchTerm);

    if (!query) {
      return searchProducts.slice(0, 5);
    }

    return searchProducts
      .filter((product) => normalizeSearchText(`${product.title} ${product.categoryName ?? ""}`).includes(query))
      .slice(0, 6);
  }, [searchProducts, trimmedSearchTerm]);
  const searchHref = trimmedSearchTerm
    ? `/produtos?busca=${encodeURIComponent(trimmedSearchTerm)}#lista-produtos`
    : "/produtos#lista-produtos";

  function submitSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setIsSearchPanelOpen(false);
    router.push(searchHref);
  }

  return (
    <header className="anime-header relative z-40 bg-[#ff6902] text-white">
      <div className="flex min-h-11 items-center justify-center px-4 py-2 text-center text-sm font-bold tracking-normal">
        {announcementText}
      </div>

      <div className="bg-[#f6f7f8] text-[#677279]">
        <div className="mx-auto grid min-h-[150px] w-full max-w-[1440px] gap-4 px-4 py-5 sm:px-5 md:min-h-[112px] md:grid-cols-[minmax(168px,220px)_minmax(220px,1fr)_max-content] md:items-center md:gap-x-3 md:py-4 lg:grid-cols-[minmax(205px,250px)_minmax(260px,1fr)_max-content] lg:gap-x-4 xl:min-h-[120px] xl:grid-cols-[minmax(250px,330px)_minmax(320px,460px)_max-content] xl:gap-x-5 2xl:grid-cols-[minmax(300px,auto)_minmax(320px,460px)_max-content] 2xl:gap-x-7">
          <Link className="group flex min-w-0 items-center justify-center gap-3 text-[#111827] md:justify-start" href="/">
            <Image
              alt="NerdLingoLab"
              className="size-12 shrink-0 rounded-2xl object-cover transition duration-300 group-hover:scale-[1.025] group-hover:drop-shadow-[0_6px_18px_rgba(255,105,2,0.24)] md:size-11 lg:size-12 xl:size-14 2xl:size-16"
              height={96}
              priority
              src="/brand-assets/FAVICON_NERDLINGOLAB.webp"
              width={96}
            />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="whitespace-nowrap text-[clamp(1.45rem,2.1vw,2.125rem)] font-black leading-none tracking-normal md:text-[clamp(1.15rem,1.9vw,1.55rem)] lg:text-[clamp(1.25rem,1.7vw,1.75rem)] xl:text-[clamp(1.45rem,2vw,2.125rem)]">
                <span className="text-[#ff6902]">Nerd</span>
                <span className="text-[#7c1fe6]">LingoLab</span>
              </span>
              <span className="mt-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-[#ff6902] md:text-[9px] lg:text-[10px] xl:text-[11px]">
                Loja geek oficial
              </span>
            </span>
          </Link>

          <div className="relative mx-auto w-full max-w-[550px] md:max-w-none xl:max-w-[460px]">
            <form
              action="/produtos"
              className="search-arcade flex h-12 w-full items-center rounded-full border-2 border-primary bg-white px-4 shadow-sm"
              onBlur={() => window.setTimeout(() => setIsSearchPanelOpen(false), 140)}
              onSubmit={submitSearch}
            >
              <Search className="mr-3 h-5 w-5 text-[#1c1c1c]" />
              <input
                aria-label="Buscar produtos"
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa1a6]"
                maxLength={80}
                name="busca"
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setIsSearchPanelOpen(true);
                }}
                onFocus={() => setIsSearchPanelOpen(true)}
                placeholder="Buscar produtos..."
                type="search"
                value={searchTerm}
              />
            </form>
            {isSearchPanelOpen ? (
              <div className="absolute left-0 right-0 top-14 z-50 rounded-lg border border-primary/15 bg-white p-3 text-[#1c1c1c] shadow-[0_18px_42px_rgba(17,24,39,0.16)]">
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4ec] text-primary">
                    <Search className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-wide text-primary">Pesquisa</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">
                      {trimmedSearchTerm ? `Buscar por "${trimmedSearchTerm}"` : "Digite um termo para pesquisar no catálogo"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto">
                  {searchMatches.map((product) => (
                    <Link
                      className="grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-lg border border-transparent p-2 transition hover:border-primary/30 hover:bg-[#fff7ef]"
                      href={`/produtos/${product.slug}`}
                      key={product.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setIsSearchPanelOpen(false)}
                    >
                      <span className="relative h-12 w-12 overflow-hidden rounded-md border bg-[#f6f7f8]">
                        {product.imageUrl ? (
                          <Image alt="" className="object-cover" fill sizes="52px" src={product.imageUrl} />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{product.title}</span>
                        <span className="block truncate text-xs text-[#6b7280]">{product.categoryName ?? "Produto NerdLingoLab"}</span>
                      </span>
                      <span className="text-sm font-black text-primary">{formatCurrency(product.priceCents)}</span>
                    </Link>
                  ))}
                  {trimmedSearchTerm && searchMatches.length === 0 ? (
                    <p className="rounded-lg bg-[#fff7ef] p-3 text-sm font-semibold text-[#4f5d65]">
                      Nenhum produto encontrado para esse termo.
                    </p>
                  ) : null}
                </div>
                <button
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white transition hover:bg-[#d85b00]"
                  disabled={!trimmedSearchTerm}
                  onMouseDown={(event) => event.preventDefault()}
                  type="submit"
                  onClick={() => {
                    setIsSearchPanelOpen(false);
                    router.push(searchHref);
                  }}
                >
                  Ver resultados
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 justify-self-end overflow-hidden">
            <div className="mb-1 flex items-center justify-end text-primary md:hidden">
              <span className="nl-scroll-cue">
                Arraste para ver mais
                <ChevronsRight className="size-4" />
              </span>
            </div>
            <div className="nl-scroll-hint nl-scroll-hint-neutral">
              <nav className="flex max-w-full min-w-0 flex-nowrap content-center items-center justify-start gap-1 overflow-x-auto px-2 py-2 md:justify-end md:gap-0.5 md:px-0 md:py-1 xl:gap-1 xl:overflow-visible 2xl:gap-2" data-ui-audit-scrollable>
                {headerLinks.map((link) => {
                  const Icon = link.icon;

                  if (link.href === "/conta" && !isAuthenticated) {
                    return (
                      <button
                        className={headerActionClass}
                        key={link.label}
                        onClick={() => setIsLoginModalOpen(true)}
                        type="button"
                      >
                        <Icon className="h-5 w-5 text-primary transition group-hover:scale-110 md:h-4 md:w-4 xl:h-5 xl:w-5" />
                        <span className="md:sr-only xl:not-sr-only">Login</span>
                      </button>
                    );
                  }

                  return (
                    <Fragment key={link.label}>
                      <Link
                        className={headerActionClass}
                        href={link.href}
                      >
                        <Icon className="h-5 w-5 text-primary transition group-hover:scale-110 md:h-4 md:w-4 xl:h-5 xl:w-5" />
                        <span className="md:sr-only xl:not-sr-only">{link.label}</span>
                        {link.href === "/carrinho" && cartCount > 0 ? (
                          <span className={headerCountBadgeClass}>
                            {cartBadgeLabel}
                          </span>
                        ) : null}
                        {link.href === "/favoritos" && favorites.length > 0 ? (
                          <span className={headerCountBadgeClass}>
                            {favoriteBadgeLabel}
                          </span>
                        ) : null}
                      </Link>
                      {link.href === "/favoritos" ? (
                        <Link
                          className={headerActionClass}
                          href={isAuthenticated ? "/conta/nerdcoins" : "/programa-de-fidelidade"}
                        >
                          <span className="relative h-6 w-6 overflow-hidden rounded-md">
                            <Image
                              alt=""
                              className="object-contain transition group-hover:scale-110"
                              fill
                              sizes="24px"
                              src="/brand-assets/nerd-icon-nerdcoins.webp"
                            />
                          </span>
                          <span className="hidden 2xl:inline">NerdCoins</span>
                          <span className="hidden xl:inline 2xl:hidden">Coins</span>
                          {isAuthenticated && nerdcoinsBalance !== null ? (
                            <span className={headerCountBadgeClass}>
                              {nerdcoinsBalance > 9999 ? "9999+" : nerdcoinsBalance}
                            </span>
                          ) : null}
                        </Link>
                      ) : null}
                    </Fragment>
                  );
                })}
                {isAuthenticated ? (
                  <form action={signOutFromCustomer}>
                    <button
                      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-primary/25 bg-white px-3 py-1.5 text-center text-xs font-semibold leading-tight text-primary transition-colors duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-8 md:px-2 md:py-1 md:text-[11px] xl:min-h-9 xl:px-3 xl:py-1.5 xl:text-xs 2xl:min-h-10 2xl:text-sm"
                      type="submit"
                    >
                      Sair
                    </button>
                  </form>
                ) : null}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 bg-[#ff6902]">
        <div className="mx-auto grid min-h-[104px] w-full max-w-[1440px] items-center gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(190px,240px)_minmax(0,1fr)_minmax(190px,240px)] md:gap-6 md:py-3">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg bg-white px-5 py-2 text-sm font-bold text-black shadow-sm transition-colors duration-150 hover:bg-[#fff7ef] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-start"
            onClick={() => setIsCategoryDrawerOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
            Todas as Categorias
          </button>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-end text-white/90 md:hidden">
              <span className="nl-scroll-cue">
                Arraste para ver mais
                <ChevronsRight className="size-4" />
              </span>
            </div>
            <div className="nl-scroll-hint nl-scroll-hint-light">
              <nav className="flex justify-start gap-4 overflow-x-auto pb-1 pr-8 md:flex-wrap md:items-start md:justify-center md:gap-7 md:overflow-visible md:pb-0 md:pr-0" data-ui-audit-scrollable>
                {categoryLinks.map((link) => (
                  <Link className="group grid w-[5.75rem] shrink-0 justify-items-center text-center text-xs font-bold text-white focus-visible:outline-none sm:w-[6.25rem] md:w-[7.25rem] md:text-sm" href={link.href} key={link.label}>
                    <span className={`mx-auto flex size-14 items-center justify-center rounded-full shadow-lg ring-2 ring-white/20 sm:size-16 md:size-20 ${link.color} transition duration-200 group-hover:scale-105 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-white`}>
                      <link.icon className={`size-8 ${link.iconColor} transition duration-200 group-hover:rotate-[-6deg] group-hover:scale-110 md:size-10`} />
                    </span>
                    <span className="mt-2 flex min-h-8 items-start justify-center leading-tight drop-shadow-sm">{link.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div aria-hidden="true" className="hidden md:block" />
        </div>
      </div>

      <CategoryDrawer isOpen={isCategoryDrawerOpen} onClose={() => setIsCategoryDrawerOpen(false)} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </header>
  );
}

function CategoryDrawer({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      aria-hidden={!isOpen}
      className={[
        "fixed inset-0 z-50 transition",
        isOpen ? "pointer-events-auto bg-black/45 opacity-100" : "pointer-events-none bg-black/0 opacity-0"
      ].join(" ")}
    >
      <aside
        aria-label="Todas as categorias"
        className={[
          "h-full w-[min(380px,92vw)] overflow-hidden bg-white text-[#1c1c1c] shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between bg-primary px-5 text-white">
          <span className="inline-flex items-center gap-2 text-base font-black">
            <Menu className="h-5 w-5" />
            Todas as Categorias
          </span>
          <button
            aria-label="Fechar categorias"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="max-h-[calc(100vh-64px)] overflow-y-auto pb-5">
          {drawerCategoryGroups.map((item) => (
            <Link
              className="flex min-h-14 items-center justify-between border-b px-6 text-sm font-bold transition hover:bg-[#fff7ef] hover:text-primary"
              href={item.href}
              key={item.label}
              onClick={onClose}
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-[#9aa1a6]" />
            </Link>
          ))}

          <div className="border-b">
            <div className="flex min-h-14 items-center justify-between px-6 text-sm font-bold">
              Catálogo
              <ChevronDown className="h-4 w-4 text-primary" />
            </div>
            <div className="grid grid-cols-1 gap-2 bg-[#f7f7f7] p-4">
              {drawerCatalogLinks.map((item) => (
                <Link
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-white bg-white/80 px-4 text-sm font-semibold text-[#4f5d65] transition hover:border-primary/40 hover:bg-white hover:text-primary"
                  href={item.href}
                  key={item.label}
                  onClick={onClose}
                >
                  <ChevronRight className="h-3 w-3 text-[#c0c6ca]" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white p-5">
            <Link
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white shadow-md transition hover:bg-primary/90"
              href="/produtos#lista-produtos"
              onClick={onClose}
            >
              <Menu className="h-4 w-4" />
              Ver todas as coleções
            </Link>
          </div>
        </nav>
      </aside>
    </div>
  );
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
