import { Award, BarChart3, Boxes, Headphones, Images, LayoutDashboard, ListTree, Mail, Megaphone, Palette, ReceiptText, TicketPercent, UsersRound } from "lucide-react";

import { signOutFromAdmin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

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
        <a className="block shrink-0 px-2 text-lg font-bold tracking-normal" href="/admin/dashboard">
          NerdLingoLab
        </a>
        <nav className="mt-6 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1">
          {adminNavigationGroups.map((group) => (
            <div className="grid gap-1" key={group.label}>
              <p className="px-2 text-[11px] font-bold uppercase text-muted-foreground">{group.label}</p>
              {group.links.map((link) => (
                <AdminNavLink
                  href={link.href}
                  icon={link.icon}
                  key={link.href}
                  label={link.label}
                />
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
            <a className="font-bold" href="/admin/dashboard">
              NerdLingoLab
            </a>
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
              <a
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium text-foreground transition hover:bg-muted"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}): React.ReactElement {
  return (
    <a
      className={cn(
        "flex h-9 min-w-0 items-center rounded-lg px-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      href={href}
    >
      <Icon className="mr-2 h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}
