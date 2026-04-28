import { anonymizeCustomerAccount, sendCustomerPasswordReset } from "@/actions/admin-customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCustomers } from "@/lib/admin/customers";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const customers = await getAdminCustomers();
  const totalOrders = customers.reduce((total, customer) => total + customer._count.orders, 0);
  const totalNerdcoins = customers.reduce((total, customer) => total + (customer.loyaltyPoints?.balance ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Relacionamento</p>
        <h1 className="text-3xl font-bold tracking-normal">Clientes cadastrados</h1>
      </div>
      {readSearchParam(resolvedSearchParams?.reset) === "sent" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          Link de redefinição enviado para o cliente, se ele possuir senha cadastrada.
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Clientes" value={customers.length.toString()} />
        <MetricCard label="Pedidos vinculados" value={totalOrders.toString()} />
        <MetricCard label="Nerdcoins em aberto" value={totalNerdcoins.toString()} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>Dados básicos, pedidos, atendimentos e Nerdcoins.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">Cliente</th>
                  <th className="py-3 pr-4">Telefone</th>
                  <th className="py-3 pr-4">CPF</th>
                  <th className="py-3 pr-4">Nerdcoins</th>
                  <th className="py-3 pr-4">Pedidos</th>
                  <th className="py-3 pr-4">Último pedido</th>
                  <th className="py-3 pr-4">Endereços</th>
                  <th className="py-3 pr-4">Indicação</th>
                  <th className="py-3 pr-4">Suportes</th>
                  <th className="py-3 pr-4">Cadastro</th>
                  <th className="py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{customer.name ?? "Sem nome"}</p>
                      <p className="text-muted-foreground">{customer.email}</p>
                    </td>
                    <td className="py-3 pr-4">{customer.phone ?? "-"}</td>
                    <td className="py-3 pr-4">{customer.cpf ?? "-"}</td>
                    <td className="py-3 pr-4">{customer.loyaltyPoints?.balance ?? 0}</td>
                    <td className="py-3 pr-4">{customer._count.orders}</td>
                    <td className="py-3 pr-4">
                      {customer.orders[0] ? (
                        <div>
                          <p className="font-semibold">{customer.orders[0].orderNumber}</p>
                          <p className="text-muted-foreground">{formatCurrency(customer.orders[0].totalCents)}</p>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="py-3 pr-4">{customer._count.addresses}</td>
                    <td className="py-3 pr-4">
                      {customer.referralCode ? (
                        <span className={customer.referralCode.isActive ? "text-emerald-700" : "text-muted-foreground"}>
                          {customer.referralCode.code}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="py-3 pr-4">{customer._count.supportTickets}</td>
                    <td className="py-3 pr-4">{formatDateTime(customer.createdAt)}</td>
                    <td className="py-3">
                      {customer.role === "CUSTOMER" ? (
                        <div className="grid gap-2">
                          <form action={sendCustomerPasswordReset}>
                            <input name="customerId" type="hidden" value={customer.id} />
                            <button
                              className="w-full rounded-md border border-primary/30 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                              type="submit"
                            >
                              Resetar senha
                            </button>
                          </form>
                          <form action={anonymizeCustomerAccount}>
                            <input name="customerId" type="hidden" value={customer.id} />
                            <button
                              className="w-full rounded-md border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-white"
                              type="submit"
                            >
                              Remover conta
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Protegido</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

function MetricCard({
  label,
  value
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
