import { Gift, Headphones, Menu, Search, ShoppingBag, ShoppingCart, Star, Tags, UserRound } from "lucide-react";
import Link from "next/link";

import { SafeImage as Image } from "@/components/media/safe-image";
const headerLinks = [
  { href: "/conta", label: "Conta", icon: UserRound },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/favoritos", label: "Favoritos", icon: Star },
  { href: "/suporte", label: "Suporte", icon: Headphones }
];

const categoryLinks = [
  { href: "/cupons", label: "Cupons", icon: Gift, color: "bg-[#b45700]" },
  { href: "/ofertas", label: "Ofertas", icon: Star, color: "bg-[#c72046]" },
  { href: "/produtos?categoria=temporada", label: "Temporadas", icon: Tags, color: "bg-[#2f7f37]" },
  { href: "/produtos?categoria=action-figures", label: "Action Figures", icon: ShoppingBag, color: "bg-[#5724b8]" }
];

export function ShopHeader({
  announcementText = "FRETE GRÁTIS em compras acima de R$99,90"
}: {
  announcementText?: string;
}): React.ReactElement {
  return (
    <header className="relative z-40 bg-[#ff6902] text-white">
      <div className="flex h-11 items-center justify-center px-4 text-sm font-bold">
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

          <form action="/produtos" className="mx-auto flex h-12 w-full max-w-[550px] items-center rounded-full border-2 border-primary bg-white px-4 shadow-sm">
            <Search className="mr-3 h-5 w-5 text-[#1c1c1c]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa1a6]"
              maxLength={80}
              name="busca"
              placeholder="Buscar produtos..."
              type="search"
            />
          </form>

          <nav className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
            {headerLinks.map((link) => (
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href={link.href}
                key={link.label}
              >
                <link.icon className="h-5 w-5 text-primary transition group-hover:scale-110" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-white/20 bg-[#ff6902]">
        <div className="mx-auto flex min-h-[112px] w-full max-w-[1440px] flex-col items-stretch gap-5 px-4 py-4 sm:px-5 md:flex-row md:items-center">
          <Link
            className="inline-flex h-11 items-center justify-center gap-3 rounded-lg bg-white px-5 text-sm font-bold text-black shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff7ef] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-start"
            href="/produtos"
          >
            <Menu className="h-5 w-5" />
            Categorias
          </Link>

          <nav className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 md:flex md:flex-wrap md:items-center md:justify-center md:gap-6">
            {categoryLinks.map((link) => (
              <Link className="group min-w-0 text-center text-sm font-bold text-white focus-visible:outline-none" href={link.href} key={link.label}>
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full shadow-sm ring-1 ring-white/35 md:h-18 md:w-18 ${link.color} transition duration-200 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-white`}>
                  <link.icon className="h-8 w-8 text-white transition duration-200 group-hover:rotate-[-6deg] group-hover:scale-110 md:h-9 md:w-9" />
                </span>
                <span className="mt-2 block leading-tight drop-shadow-sm">{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
