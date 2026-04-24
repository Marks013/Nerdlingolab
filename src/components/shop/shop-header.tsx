import { Gift, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "/programa-de-fidelidade", label: "Fidelidade", icon: Gift },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/conta", label: "Conta", icon: UserRound }
];

export function ShopHeader(): React.ReactElement {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <Image
            alt="NerdLingoLab"
            className="h-9 w-auto"
            height={44}
            priority
            src="/shopify/header_logo.webp"
            width={180}
          />
          <span className="sr-only">NerdLingoLab</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Button asChild key={link.href} size="sm" variant="ghost">
              <Link aria-label={link.label} href={link.href}>
                <link.icon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            </Button>
          ))}
          <ThemeToggle compact />
        </nav>
      </div>
    </header>
  );
}
