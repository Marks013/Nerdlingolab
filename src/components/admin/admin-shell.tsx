import { Award, BarChart3, Boxes, Headphones, LayoutDashboard, ListTree, Mail, Palette, ReceiptText, TicketPercent, UsersRound } from "lucide-react";
import Link from "next/link";

import { signOutFromAdmin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const adminLinks = [
  { href: "/admin/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/admin/clientes", label: "Clientes", icon: UsersRound },
  { href: "/admin/fidelidade", label: "Nerdcoins", icon: Award },
  { href: "/admin/suporte", label: "Suporte", icon: Headphones },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/tema", label: "Tema", icon: Palette },
  { href: "/admin/produtos", label: "Produtos", icon: Boxes },
  { href: "/admin/categorias", label: "Categorias", icon: ListTree },
  { href: "/admin/cupons", label: "Cupons", icon: TicketPercent }
];

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps): React.ReactElement {
  return (
    <div className="min-h-screen overflow-x-hidden bg-muted">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background p-4 lg:block">
        <Link className="block px-2 text-lg font-bold tracking-normal" href="/admin/dashboard">
          NerdLingoLab
        </Link>
        <nav className="mt-8 grid gap-1">
          {adminLinks.map((link) => (
            <Button asChild className="justify-start" key={link.href} variant="ghost">
              <Link href={link.href}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <ThemeToggle />
          <form action={signOutFromAdmin}>
          <Button className="w-full" type="submit" variant="outline">
            Sair
          </Button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 overflow-x-hidden lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link className="font-bold" href="/admin/dashboard">
              NerdLingoLab
            </Link>
            <form action={signOutFromAdmin}>
              <div className="flex items-center gap-1">
                <ThemeToggle compact />
                <Button size="sm" type="submit" variant="outline">
                  Sair
                </Button>
              </div>
            </form>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto">
            {adminLinks.map((link) => (
              <Button asChild key={link.href} size="sm" variant="ghost">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
