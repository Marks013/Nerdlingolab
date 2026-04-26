import { MailCheck, MailX } from "lucide-react";
import Link from "next/link";

import { setNewsletterSubscriberStatus } from "@/actions/newsletter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminNewsletterDashboard, type AdminNewsletterFilters } from "@/lib/admin/newsletter";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const filters = resolveFilters(await searchParams);
  const dashboard = await getAdminNewsletterDashboard(filters);

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Marketing</p>
          <h1 className="text-3xl font-bold tracking-normal">Newsletter</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Inscrições vindas do rodapé da loja, com controle de ativação para campanhas futuras.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/tema">Editar chamada do rodapé</Link>
        </Button>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <MetricCard icon={MailCheck} label="Ativos" value={dashboard.activeCount.toString()} />
        <MetricCard icon={MailX} label="Inativos" value={dashboard.inactiveCount.toString()} />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Inscritos</CardTitle>
          <CardDescription>Últimos 150 e-mails, ordenados do mais recente ao mais antigo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <label className="grid gap-2 text-sm font-medium">
              Buscar
              <Input defaultValue={filters.query ?? ""} name="busca" placeholder="email@dominio.com" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Status
              <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={filters.status ?? "todos"} name="status">
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <Button className="w-full" type="submit" variant="secondary">Filtrar</Button>
              <Button asChild className="w-full" variant="ghost">
                <Link href="/admin/newsletter">Limpar</Link>
              </Button>
            </div>
          </form>

          <div className="divide-y rounded-lg border">
            {dashboard.subscribers.map((subscriber) => (
              <div className="grid gap-3 p-3 text-sm md:grid-cols-[minmax(0,1fr)_130px_180px_auto]" key={subscriber.id}>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{subscriber.email}</p>
                  <p className="text-muted-foreground">Origem: {subscriber.source}</p>
                </div>
                <p className={subscriber.isActive ? "font-semibold text-[#237f34]" : "font-semibold text-muted-foreground"}>
                  {subscriber.isActive ? "Ativo" : "Inativo"}
                </p>
                <p className="text-muted-foreground">{formatDateTime(subscriber.createdAt)}</p>
                <form action={setNewsletterSubscriberStatus.bind(null, subscriber.id, !subscriber.isActive)}>
                  <Button size="sm" type="submit" variant="outline">
                    {subscriber.isActive ? "Desativar" : "Reativar"}
                  </Button>
                </form>
              </div>
            ))}
            {dashboard.subscribers.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Nenhum inscrito encontrado.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Icon className="h-5 w-5 text-primary" />
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function resolveFilters(searchParams: Record<string, string | string[] | undefined>): AdminNewsletterFilters {
  const status = readSearchParam(searchParams.status);

  return {
    query: readSearchParam(searchParams.busca),
    status: status === "ativos" || status === "inativos" || status === "todos" ? status : "todos"
  };
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();

  return trimmed ? trimmed : undefined;
}
