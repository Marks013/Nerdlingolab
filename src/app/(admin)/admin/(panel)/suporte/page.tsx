import { Mail, MessageSquareReply, ShieldCheck, UserRound } from "lucide-react";

import { replySupportTicket, updateSupportTicketStatus } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getAdminSupportTickets } from "@/lib/admin/customers";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type AdminSupportTicket = Awaited<ReturnType<typeof getAdminSupportTickets>>[number];

const statusLabels: Record<string, string> = {
  CLOSED: "Fechado",
  IN_PROGRESS: "Em atendimento",
  OPEN: "Aberto",
  RESOLVED: "Resolvido"
};

const deliveryLabels: Record<string, string> = {
  FAILED: "Falhou no e-mail",
  PENDING: "Pendente",
  SENT: "E-mail enviado",
  UNKNOWN: "Sem historico de entrega"
};

export default async function AdminSupportPage(): Promise<React.ReactElement> {
  const tickets = await getAdminSupportTickets();
  const openTickets = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const activeTickets = tickets.filter((ticket) => ["OPEN", "IN_PROGRESS"].includes(ticket.status)).length;
  const answeredTickets = tickets.filter((ticket) => ticket.replies.length > 0).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Atendimento</p>
          <h1 className="text-3xl font-bold tracking-normal">Suporte de clientes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Receba mensagens da página de suporte, acompanhe histórico e responda por e-mail sem sair do painel.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Abertos" value={openTickets} />
          <Metric label="Ativos" value={activeTickets} />
          <Metric label="Respondidos" value={answeredTickets} />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Protocolos recentes</CardTitle>
          <CardDescription>
            Cada protocolo preserva a mensagem original, respostas da equipe e status operacional do envio.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {tickets.map((ticket) => (
            <TicketPanel key={ticket.id} ticket={ticket} />
          ))}
          {tickets.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-semibold">Nenhum atendimento recebido.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                As novas mensagens enviadas em /suporte aparecerão aqui automaticamente.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

function TicketPanel({ ticket }: { ticket: AdminSupportTicket }): React.ReactElement {
  return (
    <details className="rounded-lg border bg-background" open={ticket.status !== "CLOSED"}>
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{ticket.ticketId}</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {formatStatus(ticket.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ticket.subjectLabel} · {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          {ticket.replies.length} {ticket.replies.length === 1 ? "resposta" : "respostas"}
        </p>
      </summary>

      <div className="grid gap-5 border-t p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-3">
          <MessageBlock
            author={ticket.name}
            body={ticket.message}
            deliveryStatus={ticket.emailDeliveryStatus}
            meta={`${ticket.email}${ticket.phone ? ` · ${ticket.phone}` : ""}`}
            time={ticket.createdAt}
            tone="customer"
          />
          {ticket.replies.map((reply) => (
            <MessageBlock
              author={reply.adminUser?.name ?? reply.adminUser?.email ?? "Equipe NerdLingoLab"}
              body={reply.message}
              deliveryStatus={reply.deliveryStatus}
              key={reply.id}
              meta={reply.providerError ?? deliveryLabels[reply.deliveryStatus] ?? reply.deliveryStatus}
              time={reply.createdAt}
              tone="admin"
            />
          ))}
        </section>

        <aside className="grid gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-primary" />
              <h2 className="font-bold">Cliente</h2>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Nome:</span> {ticket.name}
              </p>
              <p>
                <span className="text-muted-foreground">E-mail:</span> {ticket.email}
              </p>
              {ticket.phone ? (
                <p>
                  <span className="text-muted-foreground">Telefone:</span> {ticket.phone}
                </p>
              ) : null}
              {ticket.user ? (
                <p className="rounded-md bg-muted px-3 py-2 text-xs font-semibold">
                  Conta vinculada: {ticket.user.name ?? ticket.user.email}
                </p>
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-xs font-semibold">Mensagem enviada sem login.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="font-bold">Status do atendimento</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => (
                <form action={updateSupportTicketStatus} key={status}>
                  <input name="ticketId" type="hidden" value={ticket.id} />
                  <input name="status" type="hidden" value={status} />
                  <Button
                    size="sm"
                    type="submit"
                    variant={ticket.status === status ? "default" : "outline"}
                  >
                    {formatStatus(status)}
                  </Button>
                </form>
              ))}
            </div>
          </div>

          <form action={replySupportTicket} className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <MessageSquareReply className="size-4 text-primary" />
              <h2 className="font-bold">Responder por e-mail</h2>
            </div>
            <input name="ticketId" type="hidden" value={ticket.id} />
            <Textarea
              className="mt-3 min-h-36"
              maxLength={5000}
              minLength={10}
              name="message"
              placeholder="Escreva uma resposta clara para o cliente..."
              required
            />
            <Button className="mt-3 w-full" disabled={ticket.status === "CLOSED"} type="submit">
              <Mail className="mr-2 size-4" />
              Enviar resposta
            </Button>
            {ticket.status === "CLOSED" ? (
              <p className="mt-2 text-xs text-muted-foreground">Reabra o protocolo antes de responder.</p>
            ) : null}
          </form>
        </aside>
      </div>
    </details>
  );
}

function MessageBlock({
  author,
  body,
  deliveryStatus,
  meta,
  time,
  tone
}: {
  author: string;
  body: string;
  deliveryStatus?: string;
  meta: string;
  time: Date;
  tone: "admin" | "customer";
}): React.ReactElement {
  return (
    <article className={tone === "admin" ? "rounded-lg border bg-muted/40 p-4" : "rounded-lg border p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{author}</p>
          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{formatDateTime(time)}</p>
          {deliveryStatus ? <p className="mt-1 font-semibold">{deliveryLabels[deliveryStatus] ?? deliveryStatus}</p> : null}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function formatStatus(status: string): string {
  return statusLabels[status] ?? status;
}
