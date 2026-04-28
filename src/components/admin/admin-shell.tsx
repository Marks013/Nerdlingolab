import { Award, BarChart3, Boxes, Headphones, Images, LayoutDashboard, ListTree, Mail, Megaphone, Palette, ReceiptText, TicketPercent, UsersRound } from "lucide-react";
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
  { href: "/admin/engajamento", label: "Engajamento", icon: Megaphone },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/tema", label: "Tema", icon: Palette },
  { href: "/admin/midias", label: "Mídias", icon: Images },
  { href: "/admin/produtos", label: "Produtos", icon: Boxes },
  { href: "/admin/categorias", label: "Categorias", icon: ListTree },
  { href: "/admin/cupons", label: "Cupons", icon: TicketPercent }
];

const adminNavigationGroups = [
  {
    label: "Operação",
    links: adminLinks.slice(0, 6)
  },
  {
    label: "Vitrine",
    links: adminLinks.slice(6, 10)
  },
  {
    label: "Catálogo",
    links: adminLinks.slice(10)
  }
];

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps): React.ReactElement {
  return (
    <div className="min-h-screen overflow-x-hidden bg-muted">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-background p-4 lg:flex">
        <Link className="block shrink-0 px-2 text-lg font-bold tracking-normal" href="/admin/dashboard">
          NerdLingoLab
        </Link>
        <nav className="mt-6 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1">
          {adminNavigationGroups.map((group) => (
            <div className="grid gap-1" key={group.label}>
              <p className="px-2 text-[11px] font-bold uppercase text-muted-foreground">{group.label}</p>
              {group.links.map((link) => (
                <Button asChild className="h-9 justify-start px-2 shadow-none" key={link.href} variant="ghost">
                  <Link className="min-w-0" href={link.href}>
                    <link.icon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-4 shrink-0 space-y-2 border-t pt-4">
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
