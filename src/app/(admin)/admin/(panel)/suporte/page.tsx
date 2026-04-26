import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSupportTickets } from "@/lib/admin/customers";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage(): Promise<React.ReactElement> {
  const tickets = await getAdminSupportTickets();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Atendimento</p>
        <h1 className="text-3xl font-bold tracking-normal">Suportes de clientes</h1>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Protocolos recentes</CardTitle>
          <CardDescription>Somente solicitações realmente enviadas entram aqui.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {tickets.map((ticket) => (
            <article className="rounded-lg border p-4" key={ticket.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">{ticket.ticketId}</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.subjectLabel} · {formatDateTime(ticket.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{ticket.status}</span>
              </div>
              <p className="mt-3 text-sm font-semibold">{ticket.name} · {ticket.email}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{ticket.message}</p>
            </article>
          ))}
          {tickets.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum atendimento recebido.</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
