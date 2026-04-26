import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCustomers } from "@/lib/admin/customers";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage(): Promise<React.ReactElement> {
  const customers = await getAdminCustomers();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Relacionamento</p>
        <h1 className="text-3xl font-bold tracking-normal">Clientes cadastrados</h1>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>Dados básicos, pedidos, atendimentos e Nerdcoins.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">Cliente</th>
                  <th className="py-3 pr-4">Telefone</th>
                  <th className="py-3 pr-4">CPF</th>
                  <th className="py-3 pr-4">Nerdcoins</th>
                  <th className="py-3 pr-4">Pedidos</th>
                  <th className="py-3 pr-4">Suportes</th>
                  <th className="py-3">Cadastro</th>
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
                    <td className="py-3 pr-4">{customer._count.supportTickets}</td>
                    <td className="py-3">{formatDateTime(customer.createdAt)}</td>
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
