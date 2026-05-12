import { Megaphone, MailCheck, MailX, Send, UsersRound } from "lucide-react";
import Link from "next/link";

import { createNewsletterCampaign, sendNewsletterCampaign, setNewsletterSubscriberStatus } from "@/actions/newsletter";
import { AdminFeedbackForm } from "@/components/admin/admin-feedback-form";
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
            Transforme inscritos em campanhas reais: novidades, cupons, NerdCoins, ofertas e avisos comerciais com registro de envio.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/tema">Editar chamada do rodapé</Link>
        </Button>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={MailCheck} label="Ativos" value={dashboard.activeCount.toString()} />
        <MetricCard icon={MailX} label="Inativos" value={dashboard.inactiveCount.toString()} />
        <MetricCard icon={Megaphone} label="Campanhas enviadas" value={dashboard.sentCampaignCount.toString()} />
        <MetricCard icon={Send} label="Falhas registradas" value={dashboard.failedDeliveryCount.toString()} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="border-b border-primary/10 bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Nova campanha
            </CardTitle>
            <CardDescription>
              Envie uma mensagem para todos os inscritos ativos ou salve como rascunho para revisar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminFeedbackForm
              action={createNewsletterCampaign}
              className="grid gap-4"
              savedLabel="Campanha criada"
              submitLabel="Salvar campanha"
              successMessage="Campanha de newsletter criada."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Nome interno" name="name" placeholder="Semana Anime Maio" />
                <TextField label="Assunto do e-mail" name="subject" placeholder="Novidades geek chegaram" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Etiqueta" name="eyebrow" placeholder="Oferta especial" />
                <TextField label="Prévia da caixa de entrada" name="previewText" placeholder="Produtos, cupons e NerdCoins em destaque." />
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Mensagem
                <textarea
                  className="min-h-40 rounded-md border bg-background px-3 py-2 text-sm"
                  name="body"
                  placeholder="Escreva uma mensagem clara, com benefício direto e chamada para ação."
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Texto do botão" name="ctaLabel" placeholder="Ver novidades" />
                <TextField label="Link do botão" name="ctaHref" placeholder="/produtos ou /cupons" />
              </div>
              <label className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <input className="mt-1" name="sendNow" type="checkbox" />
                <span>
                  <span className="block font-semibold">Enviar agora para {dashboard.activeCount} inscrito(s) ativo(s)</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    O sistema registra cada entrega e inclui link de descadastro automaticamente.
                  </span>
                </span>
              </label>
            </AdminFeedbackForm>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="border-b border-primary/10 bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              Ideias de uso
            </CardTitle>
            <CardDescription>Dê motivo para o cliente querer abrir o próximo e-mail.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Idea title="Cupom com urgência" text="Envie cupons com validade curta para inscritos ativos." />
            <Idea title="NerdCoins" text="Avise campanhas de pontos em dobro e lembre clientes de transformar saldo em cupom." />
            <Idea title="Novidades reais" text="Mostre lançamentos, produtos sazonais e action figures recém-chegados." />
            <Idea title="Recuperação" text="Fale com quem se cadastrou, mas ainda não comprou." />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader>
            <CardTitle>Campanhas recentes</CardTitle>
            <CardDescription>Status, quantidade de envios e falhas para acompanhamento rápido.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboard.campaigns.map((campaign) => (
              <details className="rounded-lg border bg-background" key={campaign.id}>
                <summary className="grid cursor-pointer list-none gap-3 p-4 text-sm md:grid-cols-[minmax(0,1fr)_120px_160px_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{campaign.name}</p>
                    <p className="truncate text-muted-foreground">{campaign.subject}</p>
                  </div>
                  <StatusPill>{getCampaignStatusLabel(campaign.status)}</StatusPill>
                  <p className="text-muted-foreground md:text-right">
                    {campaign.sentCount}/{campaign.recipientCount} enviados
                  </p>
                  {campaign.status === "DRAFT" || campaign.status === "SENT_WITH_ERRORS" ? (
                    <form action={sendNewsletterCampaign.bind(null, campaign.id)}>
                      <Button size="sm" type="submit">Enviar</Button>
                    </form>
                  ) : null}
                </summary>
                <div className="grid gap-3 border-t p-4 text-sm">
                  <p className="text-muted-foreground">
                    Criada em {formatDateTime(campaign.createdAt)}
                    {campaign.sentAt ? ` · enviada em ${formatDateTime(campaign.sentAt)}` : ""}
                  </p>
                  <p className="rounded-lg border bg-muted/20 p-3 text-muted-foreground">{campaign.body}</p>
                  <div className="grid gap-2">
                    {campaign.deliveries.map((delivery) => (
                      <div className="grid gap-2 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_90px]" key={delivery.id}>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{delivery.email}</p>
                          {delivery.errorMessage ? <p className="text-xs text-destructive">{delivery.errorMessage}</p> : null}
                        </div>
                        <StatusPill>{delivery.status}</StatusPill>
                      </div>
                    ))}
                    {campaign.deliveries.length === 0 ? (
                      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Nenhuma entrega registrada ainda.</p>
                    ) : null}
                  </div>
                </div>
              </details>
            ))}
            {dashboard.campaigns.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhuma campanha criada ainda.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inscritos</CardTitle>
            <CardDescription>Últimos 150 e-mails, ordenados do mais recente ao mais antigo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="mb-4 grid gap-3 rounded-lg border bg-muted/30 p-3">
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

            <div className="grid max-h-[620px] gap-3 overflow-y-auto pr-1">
              {dashboard.subscribers.map((subscriber) => (
                <div className="grid gap-3 rounded-lg border p-3 text-sm" key={subscriber.id}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{subscriber.email}</p>
                    <p className="text-muted-foreground">
                      Origem: {subscriber.source} · {subscriber.lastSentAt ? `último envio ${formatDateTime(subscriber.lastSentAt)}` : "sem envio"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={subscriber.isActive ? "font-semibold text-emerald-700 dark:text-emerald-300" : "font-semibold text-muted-foreground"}>
                      {subscriber.isActive ? "Ativo" : "Inativo"}
                    </p>
                    <form action={setNewsletterSubscriberStatus.bind(null, subscriber.id, !subscriber.isActive)}>
                      <Button size="sm" type="submit" variant="outline">
                        {subscriber.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {dashboard.subscribers.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum inscrito encontrado.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
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

function TextField({
  label,
  name,
  placeholder
}: {
  label: string;
  name: string;
  placeholder?: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} placeholder={placeholder} />
    </label>
  );
}

function Idea({ text, title }: { text: string; title: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-primary/20 bg-muted/20 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">{children}</span>;
}

function getCampaignStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    SENDING: "Enviando",
    SENT: "Enviada",
    SENT_WITH_ERRORS: "Com falhas"
  };

  return labels[status] ?? status;
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
