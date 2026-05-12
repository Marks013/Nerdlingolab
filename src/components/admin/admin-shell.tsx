import { Award, BarChart3, Boxes, Handshake, Headphones, Images, LayoutDashboard, ListTree, Mail, Megaphone, Palette, ReceiptText, Star, TicketPercent, Truck, UsersRound } from "lucide-react";

import { signOutFromAdmin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/admin/fretes", label: "Fretes", icon: Truck },
  { href: "/admin/fornecedores", label: "Fornecedores", icon: Handshake },
  { href: "/admin/clientes", label: "Clientes", icon: UsersRound },
  { href: "/admin/fidelidade", label: "Nerdcoins", icon: Award },
  { href: "/admin/suporte", label: "Suporte", icon: Headphones },
  { href: "/admin/avaliacoes", label: "Avaliações", icon: Star },
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
    links: adminLinks.slice(0, 9)
  },
  {
    label: "Vitrine",
    links: adminLinks.slice(9, 13)
  },
  {
    label: "Catálogo",
    links: adminLinks.slice(13)
  }
];

interface AdminShellProps {
  children: React.ReactNode;
  shippingAlertCount?: number;
}

export function AdminShell({ children, shippingAlertCount = 0 }: AdminShellProps): React.ReactElement {
  return (
    <div className="admin-shell min-h-screen overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-primary/30 bg-card/95 p-4 shadow-lg lg:flex">
        <a className="block shrink-0 rounded-lg border border-primary/35 bg-gradient-to-br from-primary/18 via-card to-secondary/10 px-3 py-3 text-foreground" href="/admin/dashboard">
          <span className="block text-lg font-black tracking-normal">NerdLingoLab</span>
          <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Centro de comando
          </span>
        </a>
        <nav className="mt-6 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1">
          {adminNavigationGroups.map((group) => (
            <div className="grid gap-1" key={group.label}>
              <p className="px-2 text-[11px] font-black uppercase tracking-wide text-primary">{group.label}</p>
              {group.links.map((link) => (
                <AdminNavLink
                  href={link.href}
                  icon={link.icon}
                  key={link.href}
                  label={link.label}
                  badgeCount={link.href === "/admin/fretes" ? shippingAlertCount : 0}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-4 shrink-0 space-y-2 border-t border-primary/25 pt-4">
          <ThemeToggle />
          <form action={signOutFromAdmin}>
            <Button className="w-full" type="submit" variant="destructive">
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 overflow-x-hidden lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-primary/30 bg-card/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <a className="font-bold" href="/admin/dashboard">
              NerdLingoLab
            </a>
            <form action={signOutFromAdmin}>
              <div className="flex items-center gap-1">
                <ThemeToggle compact />
                <Button size="sm" type="submit" variant="destructive">
                  Sair
                </Button>
              </div>
            </form>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto">
            {adminLinks.map((link) => (
              <a
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-background/70 px-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                href={link.href}
                key={link.href}
              >
                {link.label}
                {link.href === "/admin/fretes" && shippingAlertCount > 0 ? (
                  <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {shippingAlertCount}
                  </span>
                ) : null}
              </a>
            ))}
          </nav>
        </header>
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminNavLink({
  badgeCount = 0,
  href,
  icon: Icon,
  label
}: {
  badgeCount?: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}): React.ReactElement {
  return (
    <a
      className={cn(
        "flex h-9 min-w-0 items-center rounded-lg border border-transparent px-2 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      href={href}
    >
      <Icon className="mr-2 h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badgeCount > 0 ? (
        <span className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">
          {badgeCount}
        </span>
      ) : null}
    </a>
  );
}
