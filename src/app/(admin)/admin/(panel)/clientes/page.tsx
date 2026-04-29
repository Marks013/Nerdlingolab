import Link from "next/link";

import { anonymizeCustomerAccount, sendCustomerPasswordReset, updateCustomerAdminNotes } from "@/actions/admin-customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOrderStatus, formatPaymentStatus } from "@/features/orders/status-labels";
import { getAdminCustomers } from "@/lib/admin/customers";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type AdminCustomer = Awaited<ReturnType<typeof getAdminCustomers>>[number];

export default async function AdminCustomersPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const customers = await getAdminCustomers();
  const totalOrders = customers.reduce((total, customer) => total + customer._count.orders, 0);
  const totalNerdcoins = customers.reduce((total, customer) => total + (customer.loyaltyPoints?.balance ?? 0), 0);
  const totalRecentSpend = customers.reduce(
    (total, customer) => total + customer.orders.reduce((sum, order) => sum + order.totalCents, 0),
    0
  );
  const openTickets = customers.reduce(
    (total, customer) => total + customer.supportTickets.filter((ticket) => ticket.status === "OPEN").length,
    0
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Relacionamento</p>
        <h1 className="text-3xl font-bold tracking-normal">Clientes cadastrados</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Clique no nome para abrir contato, enderecos, pedidos, suporte, referencias e observacoes internas.
        </p>
      </div>

      {readSearchParam(resolvedSearchParams?.reset) === "sent" ? (
        <SuccessMessage>Link de redefinicao enviado para o cliente, se ele possuir senha cadastrada.</SuccessMessage>
      ) : null}
      {readSearchParam(resolvedSearchParams?.notes) === "saved" ? (
        <SuccessMessage>Observacoes internas salvas.</SuccessMessage>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Clientes" value={customers.length.toString()} />
        <MetricCard label="Pedidos vinculados" value={totalOrders.toString()} />
        <MetricCard label="Receita recente" value={formatCurrency(totalRecentSpend)} />
        <MetricCard label="Suporte aberto" value={openTickets.toString()} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <MetricCard label="Nerdcoins em aberto" value={totalNerdcoins.toString()} />
        <MetricCard
          label="Ticket medio recente"
          value={totalOrders > 0 ? formatCurrency(Math.round(totalRecentSpend / totalOrders)) : formatCurrency(0)}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Perfis de clientes</CardTitle>
          <CardDescription>Atendimento, marketing, compras e indicacoes no mesmo painel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {customers.map((customer) => (
            <CustomerProfile key={customer.id} customer={customer} />
          ))}
          {customers.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              Nenhum cliente cadastrado ainda.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

function CustomerProfile({ customer }: { customer: AdminCustomer }): React.ReactElement {
  const defaultAddress = customer.addresses.find((address) => address.isDefault) ?? customer.addresses[0];
  const spentCents = customer.orders.reduce((sum, order) => sum + order.totalCents, 0);
  const averageTicketCents = customer.orders.length > 0 ? Math.round(spentCents / customer.orders.length) : 0;

  return (
    <details className="group rounded-lg border bg-background">
      <summary className="grid cursor-pointer list-none gap-3 p-4 transition hover:bg-muted/40 md:grid-cols-[minmax(260px,1fr)_130px_130px_160px] md:items-center">
        <div className="min-w-0">
          <p className="truncate font-semibold">{customer.name ?? "Cliente sem nome"}</p>
          <p className="truncate text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <StatusPill>{customer._count.orders} pedido{customer._count.orders === 1 ? "" : "s"}</StatusPill>
        <StatusPill>{customer.loyaltyPoints?.balance ?? 0} Nerdcoins</StatusPill>
        <span className="text-sm text-muted-foreground md:text-right">
          {spentCents > 0 ? formatCurrency(spentCents) : "Sem compras"}
        </span>
      </summary>

      <div className="grid gap-4 border-t p-4 xl:grid-cols-[1.1fr_1fr_1fr]">
        <Panel title="Cliente">
          <Info label="E-mail" value={customer.email} />
          <Info label="Telefone" value={customer.phone ?? "Nao informado"} />
          <Info label="CPF" value={customer.cpf ?? "Nao informado"} />
          <Info label="Cadastro" value={formatDateTime(customer.createdAt)} />
          <Info label="Total recente" value={formatCurrency(spentCents)} />
          <Info label="Ticket medio recente" value={averageTicketCents > 0 ? formatCurrency(averageTicketCents) : "Sem compras"} />
          <Info label="Endereco padrao" value={formatAddress(defaultAddress)} />
        </Panel>

        <Panel title="Pedidos recentes">
          {customer.orders.length > 0 ? customer.orders.map((order) => (
            <Link className="block rounded-md border p-3 transition hover:bg-muted/40" href={`/admin/pedidos/${order.id}`} key={order.id}>
              <span className="block font-semibold">{order.orderNumber}</span>
              <span className="block text-xs text-muted-foreground">
                {formatOrderStatus(order.status)} / {formatPaymentStatus(order.paymentStatus)} / {formatCurrency(order.totalCents)}
              </span>
            </Link>
          )) : <EmptyText>Nenhum pedido realizado.</EmptyText>}
        </Panel>

        <Panel title="Suporte e referencias">
          {customer.supportTickets.length > 0 ? customer.supportTickets.map((ticket) => (
            <div className="rounded-md border p-3" key={ticket.id}>
              <p className="font-semibold">{ticket.ticketId}</p>
              <p className="text-xs text-muted-foreground">{ticket.subjectLabel} / {ticket.status} / {formatDateTime(ticket.createdAt)}</p>
            </div>
          )) : <EmptyText>Nenhum atendimento aberto.</EmptyText>}
          <div className="rounded-md border p-3">
            <p className="font-semibold">Indicacoes</p>
            <p className="text-xs text-muted-foreground">
              Codigo: {customer.referralCode?.code ?? "nao gerado"} / Enviadas: {customer.referralsSent.length}
            </p>
            {customer.referralReceived ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Veio por {customer.referralReceived.inviter.name ?? customer.referralReceived.inviter.email}
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel title="Observacoes internas">
          <form action={updateCustomerAdminNotes} className="grid gap-3">
            <input name="customerId" type="hidden" value={customer.id} />
            <textarea
              className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              defaultValue={customer.adminNotes ?? ""}
              maxLength={2000}
              name="adminNotes"
              placeholder="Preferencias, contexto de suporte, restricoes de entrega ou observacoes administrativas."
            />
            <Button className="w-fit" type="submit" variant="outline">Salvar observacoes</Button>
          </form>
        </Panel>

        <div className="flex flex-wrap gap-2 xl:col-span-2">
          {customer.role === "CUSTOMER" ? (
            <>
              <form action={sendCustomerPasswordReset}>
                <input name="customerId" type="hidden" value={customer.id} />
                <Button className="h-10 px-4" type="submit" variant="outline">Enviar reset de senha</Button>
              </form>
              <form action={anonymizeCustomerAccount}>
                <input name="customerId" type="hidden" value={customer.id} />
                <Button className="h-10 border-destructive px-4 text-destructive hover:bg-destructive hover:text-destructive-foreground" type="submit" variant="outline">
                  Remover dados pessoais
                </Button>
              </form>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Conta administrativa protegida.</span>
          )}
        </div>
      </div>
    </details>
  );
}

function formatAddress(address: AdminCustomer["addresses"][number] | undefined): string {
  if (!address) {
    return "Nenhum endereco salvo";
  }

  return `${address.street}, ${address.number} - ${address.district}, ${address.city}/${address.state} - CEP ${address.postalCode}${address.complement ? ` - ${address.complement}` : ""}`;
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

function SuccessMessage({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
      {children}
    </p>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }): React.ReactElement {
  return (
    <section className="grid content-start gap-3 rounded-lg border bg-muted/20 p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">{children}</span>;
}

function EmptyText({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{children}</p>;
}
