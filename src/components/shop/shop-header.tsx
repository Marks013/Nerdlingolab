"use client";

import { Bot, ChevronDown, ChevronRight, Headphones, Menu, Search, ShoppingCart, Star, Tags, Ticket, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { signOutFromCustomer } from "@/actions/auth";
import { SafeImage as Image } from "@/components/media/safe-image";
import { LoginModal } from "@/features/auth/components/login-modal";
import { useCartStore } from "@/features/cart/cart-store";

const headerLinks = [
  { href: "/conta", label: "Conta", icon: UserRound },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/favoritos", label: "Favoritos", icon: Star },
  { href: "/suporte", label: "Suporte", icon: Headphones }
];

const categoryLinks = [
  { href: "/cupons", label: "Cupons", icon: Ticket, color: "bg-[#ffd13d]", iconColor: "text-[#221b00]" },
  { href: "/ofertas", label: "Ofertas", icon: Star, color: "bg-[#ff4e70]", iconColor: "text-[#24000a]" },
  { href: "/produtos?categoria=temporada", label: "Temporada", icon: Tags, color: "bg-[#3fc66a]", iconColor: "text-[#062411]" },
  { href: "/produtos?categoria=action-figures", label: "Action Figures", icon: Bot, color: "bg-[#5522a8]", iconColor: "text-white" }
];

const drawerCategoryGroups = [
  { href: "/produtos?ordem=recentes", label: "Novidades" },
  { href: "/produtos?ordem=maior-valor", label: "Mais Vendidos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/produtos?categoria=temporada", label: "Temporadas" }
];

const drawerCatalogLinks = [
  { href: "/produtos?categoria=camisetas", label: "Camisetas" },
  { href: "/produtos?categoria=anime", label: "Anime" },
  { href: "/produtos?categoria=geek", label: "Geek" },
  { href: "/produtos?categoria=oversized", label: "Oversized" }
];

export function ShopHeader({
  announcementText = "FRETE GRÁTIS em compras acima de R$99,90",
  isAuthenticated = false
}: {
  announcementText?: string;
  isAuthenticated?: boolean;
}): React.ReactElement {
  const router = useRouter();
  const hydratedSearchRef = useRef(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const cartCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const cartBadgeLabel = useMemo(() => (cartCount > 99 ? "99+" : String(cartCount)), [cartCount]);

  useEffect(() => {
    if (!hydratedSearchRef.current) {
      hydratedSearchRef.current = true;
      return;
    }

    const searchTimeoutId = window.setTimeout(() => {
      const query = searchTerm.trim();
      const currentPath = window.location.pathname;

      if (!query) {
        if (currentPath === "/produtos" && new URLSearchParams(window.location.search).has("busca")) {
          router.replace("/produtos");
        }
        return;
      }

      const params = new URLSearchParams(currentPath === "/produtos" ? window.location.search : "");
      params.set("busca", query);
      params.delete("pagina");
      router.push(`/produtos?${params.toString()}`);
    }, 280);

    return () => window.clearTimeout(searchTimeoutId);
  }, [router, searchTerm]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = searchTerm.trim();
    router.push(query ? `/produtos?busca=${encodeURIComponent(query)}` : "/produtos");
  }

  return (
    <header className="anime-header relative z-40 bg-[#ff6902] text-white">
      <div className="flex h-11 items-center justify-center px-4 text-sm font-bold tracking-normal">
        {announcementText}
      </div>

      <div className="bg-[#f6f7f8] text-[#677279]">
        <div className="mx-auto grid min-h-[150px] w-full max-w-[1440px] gap-5 px-5 py-6 lg:grid-cols-[280px_1fr_auto] lg:items-center">
          <Link className="group flex justify-center lg:justify-start" href="/">
            <Image
              alt="NerdLingoLab"
              className="h-auto w-[260px] transition duration-300 group-hover:scale-[1.025] group-hover:drop-shadow-[0_6px_18px_rgba(255,105,2,0.24)]"
              height={118}
              priority
              src="/brand-assets/logo.webp"
              width={360}
            />
          </Link>

          <form
            action="/produtos"
            className="search-arcade mx-auto flex h-12 w-full max-w-[550px] items-center rounded-full border-2 border-primary bg-white px-4 shadow-sm"
            onSubmit={submitSearch}
          >
            <Search className="mr-3 h-5 w-5 text-[#1c1c1c]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa1a6]"
              maxLength={80}
              name="busca"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar produtos..."
              type="search"
              value={searchTerm}
            />
          </form>

          <nav className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
            {headerLinks.map((link) => {
              const Icon = link.icon;

              if (link.href === "/conta" && !isAuthenticated) {
                return (
                  <button
                    className="group relative inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    key={link.label}
                    onClick={() => setIsLoginModalOpen(true)}
                    type="button"
                  >
                    <Icon className="h-5 w-5 text-primary transition group-hover:scale-110" />
                    Login
                  </button>
                );
              }

              return (
                <Link
                  className="group relative inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  href={link.href}
                  key={link.label}
                >
                  <Icon className="h-5 w-5 text-primary transition group-hover:scale-110" />
                  {link.href === "/carrinho" && cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#111827] px-1 text-[10px] font-black leading-none text-white shadow-sm">
                      {cartBadgeLabel}
                    </span>
                  ) : null}
                  {link.label}
                </Link>
              );
            })}
            {isAuthenticated ? (
              <form action={signOutFromCustomer}>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-primary/25 bg-white px-3 text-sm font-semibold text-primary transition duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  type="submit"
                >
                  Sair
                </button>
              </form>
            ) : null}
          </nav>
        </div>
      </div>

      <div className="border-t border-white/20 bg-[#ff6902]">
        <div className="mx-auto flex min-h-[112px] w-full max-w-[1440px] flex-col items-stretch gap-5 px-4 py-4 sm:px-5 md:flex-row md:items-center">
          <button
            className="inline-flex h-11 items-center justify-center gap-3 rounded-lg bg-white px-5 text-sm font-bold text-black shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff7ef] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-start"
            onClick={() => setIsCategoryDrawerOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
            Todas as Categorias
          </button>

          <nav className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 md:flex md:flex-wrap md:items-center md:justify-center md:gap-6">
            {categoryLinks.map((link) => (
              <Link className="group min-w-0 text-center text-sm font-bold text-white focus-visible:outline-none" href={link.href} key={link.label}>
                <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg ring-2 ring-white/20 md:h-20 md:w-20 ${link.color} transition duration-200 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-white`}>
                  <link.icon className={`h-9 w-9 ${link.iconColor} transition duration-200 group-hover:rotate-[-6deg] group-hover:scale-110 md:h-10 md:w-10`} />
                </span>
                <span className="mt-2 block leading-tight drop-shadow-sm">{link.label}</span>
              </Link>
            ))}
          </nav>
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
          "h-full w-[min(330px,92vw)] overflow-hidden bg-white text-[#1c1c1c] shadow-2xl transition-transform duration-300",
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
            <div className="bg-[#f7f7f7]">
              {drawerCatalogLinks.map((item) => (
                <Link
                  className="flex min-h-12 items-center gap-3 border-t border-white px-10 text-sm text-[#4f5d65] transition hover:bg-white hover:text-primary"
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
              href="/produtos"
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
