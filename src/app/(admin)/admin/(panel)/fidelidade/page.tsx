import { Award, CalendarDays, Coins, Hourglass, Settings, TicketPercent } from "lucide-react";

import {
  adjustCustomerNerdcoins,
  expireEligibleNerdcoins,
  grantBirthdayNerdcoins,
  updateLoyaltySettings
} from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminLoyaltyDashboard } from "@/lib/admin/loyalty";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminLoyaltyPage(): Promise<React.ReactElement> {
  const dashboard = await getAdminLoyaltyDashboard();
  const settings = dashboard.settings;

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Relacionamento</p>
        <h1 className="text-3xl font-bold tracking-normal">Nerdcoins</h1>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard icon={Coins} label="Membros" value={dashboard.memberCount.toString()} />
        <MetricCard icon={Award} label="Pontos gerados" value={dashboard.pointsEarned.toString()} />
        <MetricCard icon={TicketPercent} label="Pontos usados" value={dashboard.pointsRedeemed.toString()} />
        <MetricCard
          icon={Settings}
          label="Desconto concedido"
          value={formatCurrency(dashboard.redeemedOrders._sum.loyaltyDiscountCents ?? 0)}
        />
      </section>
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <MetricCard icon={Award} label="Indicações pendentes" value={dashboard.referralsPending.toString()} />
        <MetricCard icon={Award} label="Indicações recompensadas" value={dashboard.referralsRewarded.toString()} />
      </section>

      <section className="mt-6 grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>Pontos, resgate, validade de cupons e níveis VIP.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateLoyaltySettings} className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Nome do programa
                <Input defaultValue={settings.programName} name="programName" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField defaultValue={settings.pointsPerReal} label="Pontos por R$ 1" name="pointsPerReal" />
                <NumberField defaultValue={settings.signupBonusPoints} label="Bônus de cadastro" name="signupBonusPoints" />
                <NumberField defaultValue={settings.birthdayBonusPoints} label="Bônus de aniversário" name="birthdayBonusPoints" />
                <NumberField defaultValue={settings.referralInviterBonusPoints} label="Bônus para quem indica" name="referralInviterBonusPoints" />
                <NumberField defaultValue={settings.referralInviteeBonusPoints} label="Bônus para convidado" name="referralInviteeBonusPoints" />
                <NumberField defaultValue={settings.referralMinOrderCents} label="Pedido mínimo indicado" name="referralMinOrderCents" />
                <NumberField defaultValue={settings.redeemCentsPerPoint} label="Centavos por ponto" name="redeemCentsPerPoint" />
                <NumberField defaultValue={settings.minRedeemPoints} label="Mínimo de resgate" name="minRedeemPoints" />
                <NumberField defaultValue={settings.maxRedeemPoints ?? ""} label="Máximo por resgate" name="maxRedeemPoints" />
                <NumberField defaultValue={settings.couponExpiresInDays} label="Validade do cupom" name="couponExpiresInDays" />
                <NumberField defaultValue={settings.pointsExpireInDays ?? ""} label="Validade dos pontos" name="pointsExpireInDays" />
              </div>
              <div className="grid gap-3 rounded-lg border p-3">
                <p className="text-sm font-semibold">Níveis VIP</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField defaultValue={settings.chuninOrderThreshold} label="Chunin pedidos" name="chuninOrderThreshold" />
                  <NumberField defaultValue={settings.chuninSpendThresholdCents} label="Chunin gasto em centavos" name="chuninSpendThresholdCents" />
                  <NumberField defaultValue={settings.chuninMultiplier} label="Chunin bônus %" name="chuninMultiplier" />
                  <NumberField defaultValue={settings.joninOrderThreshold} label="Jonin pedidos" name="joninOrderThreshold" />
                  <NumberField defaultValue={settings.joninSpendThresholdCents} label="Jonin gasto em centavos" name="joninSpendThresholdCents" />
                  <NumberField defaultValue={settings.joninMultiplier} label="Jonin bônus %" name="joninMultiplier" />
                  <NumberField defaultValue={settings.hokageOrderThreshold} label="Hokage pedidos" name="hokageOrderThreshold" />
                  <NumberField defaultValue={settings.hokageSpendThresholdCents} label="Hokage gasto em centavos" name="hokageSpendThresholdCents" />
                  <NumberField defaultValue={settings.hokageMultiplier} label="Hokage bônus %" name="hokageMultiplier" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked={settings.isEnabled} name="isEnabled" type="checkbox" />
                Programa ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked={settings.showPendingPoints} name="showPendingPoints" type="checkbox" />
                Mostrar previsão de pontos
              </label>
              <Button type="submit">Salvar fidelidade</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Rotinas do programa</CardTitle>
              <CardDescription>Processos idempotentes: repetir não duplica pontos nem cupons.</CardDescription>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2">
              <form action={grantBirthdayNerdcoins} className="min-w-0">
                <Button className="w-full min-w-0 justify-start gap-2 whitespace-normal text-left" type="submit" variant="outline">
                  <CalendarDays className="h-4 w-4" />
                  Aniversários de hoje
                </Button>
              </form>
              <form action={expireEligibleNerdcoins} className="min-w-0">
                <Button className="w-full min-w-0 justify-start gap-2 whitespace-normal text-left" type="submit" variant="outline">
                  <Hourglass className="h-4 w-4" />
                  Expirar pontos vencidos
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Ajuste manual</CardTitle>
              <CardDescription>Use apenas para correções, bonificações e atendimento.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={adjustCustomerNerdcoins} className="grid gap-3 md:grid-cols-[1fr_140px_1fr_auto]">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" name="userId" required>
                  {dashboard.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name ?? customer.email}
                    </option>
                  ))}
                </select>
                <Input name="points" placeholder="+100 ou -50" required type="number" />
                <Input name="reason" placeholder="Motivo do ajuste" required />
                <Button type="submit">Aplicar</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Saldo, nível, pedidos aprovados e gasto acumulado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4">Cliente</th>
                      <th className="py-3 pr-4">Saldo</th>
                      <th className="py-3 pr-4">Nível</th>
                      <th className="py-3 pr-4">Pedidos</th>
                      <th className="py-3">Gasto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboard.customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="py-3 pr-4">
                          <p className="font-semibold">{customer.name ?? "Sem nome"}</p>
                          <p className="text-muted-foreground">{customer.email}</p>
                        </td>
                        <td className="py-3 pr-4">{customer.loyaltyPoints?.balance ?? 0}</td>
                        <td className="py-3 pr-4">{customer.loyaltyPoints?.tier ?? "GENIN"}</td>
                        <td className="py-3 pr-4">{customer.orders.length}</td>
                        <td className="py-3">
                          {formatCurrency(customer.orders.reduce((sum, order) => sum + order.totalCents, 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Cupons Nerdcoins</CardTitle>
              <CardDescription>Últimos cupons pessoais gerados por clientes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {dashboard.generatedCoupons.map((coupon) => (
                  <div className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_120px_140px]" key={coupon.id}>
                    <div>
                      <p className="font-mono font-semibold">{coupon.code}</p>
                      <p className="text-muted-foreground">
                        {coupon.assignedUser?.name ?? coupon.assignedUser?.email ?? "Cliente"}
                      </p>
                    </div>
                    <p>{formatCurrency(coupon.value)}</p>
                    <p className="text-muted-foreground">{coupon.usedCount > 0 ? "Usado" : formatDateTime(coupon.expiresAt)}</p>
                  </div>
                ))}
                {dashboard.generatedCoupons.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Nenhum cupom pessoal gerado ainda.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico recente</CardTitle>
          <CardDescription>Ledger auditável de ganhos, resgates, ajustes e expirações.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-lg border">
            {dashboard.recentActivity.map((entry) => (
              <div className="grid gap-1 p-3 text-sm md:grid-cols-[1fr_120px_160px]" key={entry.id}>
                <div>
                  <p className="font-medium">{entry.user.name ?? entry.user.email}</p>
                  <p className="text-muted-foreground">{entry.reason}</p>
                </div>
                <p className={entry.pointsDelta >= 0 ? "text-emerald-700" : "text-destructive"}>
                  {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta}
                </p>
                <p className="text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
              </div>
            ))}
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

function NumberField({
  defaultValue,
  label,
  name
}: {
  defaultValue: number | string;
  label: string;
  name: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue} min={0} name={name} type="number" />
    </label>
  );
}
