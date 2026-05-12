import { Award, CalendarDays, Coins, Hourglass, Search, Settings, TicketPercent, UserRoundPlus } from "lucide-react";
import Link from "next/link";

import {
  adjustCustomerNerdcoins,
  backfillReferralCodes,
  createLoyaltyCampaign,
  expireEligibleNerdcoins,
  grantBirthdayNerdcoins,
  notifyExpiringNerdcoins,
  updateLoyaltyCampaign,
  updateLoyaltySettings
} from "@/actions/loyalty";
import { AdminFeedbackForm } from "@/components/admin/admin-feedback-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminLoyaltyDashboard } from "@/lib/admin/loyalty";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getReferralStatusLabel } from "@/lib/loyalty/referrals";
import { RoutineSubmitButton } from "./routine-submit-button";

export const dynamic = "force-dynamic";

type LoyaltyDashboard = Awaited<ReturnType<typeof getAdminLoyaltyDashboard>>;
type LoyaltyCustomer = LoyaltyDashboard["customers"][number];

export default async function AdminLoyaltyPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const search = readSearchParam(resolvedSearchParams?.busca) ?? "";
  const dashboard = await getAdminLoyaltyDashboard(search);
  const settings = dashboard.settings;
  const routine = readSearchParam(resolvedSearchParams?.routine);
  const routineCount = readSearchParam(resolvedSearchParams?.count) ?? "0";
  const potentialDiscountCents = dashboard.pointsInCirculation * settings.redeemCentsPerPoint;
  const redemptionRate = dashboard.pointsEarned > 0
    ? Math.round((dashboard.pointsRedeemed / dashboard.pointsEarned) * 100)
    : 0;

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Relacionamento</p>
        <h1 className="text-3xl font-bold tracking-normal">NerdCoins</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Saldo, histórico, cupons, indicações e rotinas administrativas do programa.
        </p>
      </div>

      {routine ? <SuccessMessage>{formatRoutineMessage(routine, routineCount)}</SuccessMessage> : null}
      {readSearchParam(resolvedSearchParams?.adjust) === "saved" ? (
        <SuccessMessage>Ajuste manual aplicado e registrado no ledger.</SuccessMessage>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard icon={Coins} label="Membros" value={dashboard.memberCount.toString()} />
        <MetricCard icon={Award} label="Pontos gerados" value={dashboard.pointsEarned.toString()} />
        <MetricCard icon={TicketPercent} label="Pontos usados" value={dashboard.pointsRedeemed.toString()} />
        <MetricCard icon={Settings} label="Desconto concedido" value={formatCurrency(dashboard.redeemedOrders._sum.loyaltyDiscountCents ?? 0)} />
      </section>
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard icon={Award} label="Indicações pendentes" value={dashboard.referralsPending.toString()} />
        <MetricCard icon={Award} label="Indicações recompensadas" value={dashboard.referralsRewarded.toString()} />
        <MetricCard icon={UserRoundPlus} label="Clientes sem código" value={dashboard.customersWithoutReferralCode.toString()} />
      </section>
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard icon={Coins} label="Pontos em circulação" value={dashboard.pointsInCirculation.toString()} />
        <MetricCard icon={TicketPercent} label="Desconto potencial" value={formatCurrency(potentialDiscountCents)} />
        <MetricCard icon={Hourglass} label="Taxa de resgate" value={`${redemptionRate}%`} />
      </section>
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard icon={UserRoundPlus} label="Membros ativos 30 dias" value={dashboard.activeMemberCount30d.toString()} />
        <MetricCard icon={TicketPercent} label="Pedidos com resgate" value={dashboard.couponConversionOrders.toString()} />
        <MetricCard icon={Award} label="Campanhas ativas" value={dashboard.campaigns.filter((campaign) => campaign.isActive).length.toString()} />
      </section>

      <section className="mt-6 grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Configuracoes</CardTitle>
            <CardDescription>Pontos, resgate, validade de cupons e niveis VIP.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminFeedbackForm
              action={updateLoyaltySettings}
              className="grid gap-4"
              savedLabel="Configurações salvas"
              submitLabel="Salvar fidelidade"
              successMessage="Configurações do NerdCoins salvas com sucesso."
            >
              <label className="grid gap-2 text-sm font-medium">
                Nome do programa
                <Input defaultValue={settings.programName} name="programName" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField defaultValue={settings.pointsPerReal} label="Pontos por R$ 1" name="pointsPerReal" />
                <NumberField defaultValue={settings.signupBonusPoints} label="Bonus de cadastro" name="signupBonusPoints" />
                <NumberField defaultValue={settings.birthdayBonusPoints} label="Bonus de aniversario" name="birthdayBonusPoints" />
                <NumberField defaultValue={settings.referralInviterBonusPoints} label="Bonus para quem indica" name="referralInviterBonusPoints" />
                <NumberField defaultValue={settings.referralInviteeBonusPoints} label="Bonus para convidado" name="referralInviteeBonusPoints" />
                <MoneyField defaultValue={settings.referralMinOrderCents} label="Pedido mínimo indicado (R$)" name="referralMinOrderCents" />
                <MoneyField defaultValue={settings.redeemCentsPerPoint} label="Valor de cada ponto (R$)" name="redeemCentsPerPoint" />
                <NumberField defaultValue={settings.minRedeemPoints} label="Minimo de resgate" name="minRedeemPoints" />
                <NumberField defaultValue={settings.maxRedeemPoints ?? ""} label="Maximo por resgate" name="maxRedeemPoints" />
                <NumberField defaultValue={settings.couponExpiresInDays} label="Validade do cupom" name="couponExpiresInDays" />
                <NumberField defaultValue={settings.pointsExpireInDays ?? ""} label="Validade dos pontos" name="pointsExpireInDays" />
              </div>
              <div className="grid gap-3 rounded-lg border p-3">
                <p className="text-sm font-semibold">Niveis VIP</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField defaultValue={settings.chuninOrderThreshold} label="Chunin pedidos" name="chuninOrderThreshold" />
                  <MoneyField defaultValue={settings.chuninSpendThresholdCents} label="Chunin gasto (R$)" name="chuninSpendThresholdCents" />
                  <NumberField defaultValue={settings.chuninMultiplier} label="Chunin bonus %" name="chuninMultiplier" />
                  <NumberField defaultValue={settings.joninOrderThreshold} label="Jonin pedidos" name="joninOrderThreshold" />
                  <MoneyField defaultValue={settings.joninSpendThresholdCents} label="Jonin gasto (R$)" name="joninSpendThresholdCents" />
                  <NumberField defaultValue={settings.joninMultiplier} label="Jonin bonus %" name="joninMultiplier" />
                  <NumberField defaultValue={settings.hokageOrderThreshold} label="Hokage pedidos" name="hokageOrderThreshold" />
                  <MoneyField defaultValue={settings.hokageSpendThresholdCents} label="Hokage gasto (R$)" name="hokageSpendThresholdCents" />
                  <NumberField defaultValue={settings.hokageMultiplier} label="Hokage bonus %" name="hokageMultiplier" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked={settings.isEnabled} name="isEnabled" type="checkbox" />
                Programa ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input defaultChecked={settings.showPendingPoints} name="showPendingPoints" type="checkbox" />
                Mostrar previsao de pontos
              </label>
            </AdminFeedbackForm>
          </CardContent>
        </Card>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Rotinas do programa</CardTitle>
              <CardDescription>Processos idempotentes com retorno de conclusão no painel.</CardDescription>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-3 sm:grid-cols-4">
              <RoutineButton action={grantBirthdayNerdcoins} icon={CalendarDays} label="Aniversários de hoje" />
              <RoutineButton action={expireEligibleNerdcoins} icon={Hourglass} label="Expirar pontos vencidos" />
              <RoutineButton action={notifyExpiringNerdcoins} icon={Hourglass} label="Avisar pontos vencendo" />
              <RoutineButton action={backfillReferralCodes} icon={UserRoundPlus} label="Gerar códigos faltantes" />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Campanhas temporárias</CardTitle>
              <CardDescription>Pontos em dobro, bônus por categoria, tags ou ações sazonais.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <AdminFeedbackForm
                action={createLoyaltyCampaign}
                className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
                savedLabel="Campanha criada"
                submitLabel="Criar campanha"
                successMessage="Campanha de NerdCoins criada."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="Nome da campanha" name="name" placeholder="Semana Anime em dobro" />
                  <NumberField defaultValue={200} label="Multiplicador %" name="pointsMultiplier" />
                  <NumberField defaultValue={0} label="Bônus fixo de pontos" name="bonusPoints" />
                  <MoneyField defaultValue="" label="Pedido mínimo (R$)" name="minSubtotalCents" />
                  <DateTimeField label="Início" name="startsAt" />
                  <DateTimeField label="Fim" name="endsAt" />
                </div>
                <TextField label="Descrição curta" name="description" placeholder="Pontos extras em produtos selecionados." />
                <TextField label="Tags de produto" name="productTags" placeholder="anime, black friday, geek" />
                <CategorySelect categories={dashboard.categories} selectedIds={[]} />
                <div className="flex flex-wrap gap-4">
                  <CheckboxField defaultChecked label="Campanha ativa" name="isActive" />
                  <CheckboxField defaultChecked label="Mostrar na loja" name="showOnStorefront" />
                </div>
              </AdminFeedbackForm>

              <div className="grid gap-3">
                {dashboard.campaigns.map((campaign) => (
                  <details className="rounded-lg border bg-background" key={campaign.id}>
                    <summary className="grid cursor-pointer list-none gap-2 p-4 md:grid-cols-[1fr_120px_160px] md:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.pointsMultiplier}% dos pontos{campaign.bonusPoints > 0 ? ` + ${campaign.bonusPoints} fixos` : ""}
                        </p>
                      </div>
                      <StatusPill>{campaign.isActive ? "Ativa" : "Pausada"}</StatusPill>
                      <span className="text-sm text-muted-foreground md:text-right">
                        {campaign.endsAt ? `até ${formatDateTime(campaign.endsAt)}` : "sem fim"}
                      </span>
                    </summary>
                    <form action={updateLoyaltyCampaign} className="grid gap-3 border-t p-4">
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField defaultValue={campaign.name} label="Nome da campanha" name="name" />
                        <NumberField defaultValue={campaign.pointsMultiplier} label="Multiplicador %" name="pointsMultiplier" />
                        <NumberField defaultValue={campaign.bonusPoints} label="Bônus fixo de pontos" name="bonusPoints" />
                        <MoneyField defaultValue={campaign.minSubtotalCents ?? ""} label="Pedido mínimo (R$)" name="minSubtotalCents" />
                        <DateTimeField defaultValue={formatDateForInput(campaign.startsAt)} label="Início" name="startsAt" />
                        <DateTimeField defaultValue={formatDateForInput(campaign.endsAt)} label="Fim" name="endsAt" />
                      </div>
                      <TextField defaultValue={campaign.description ?? ""} label="Descrição curta" name="description" />
                      <TextField defaultValue={campaign.productTags.join(", ")} label="Tags de produto" name="productTags" />
                      <CategorySelect categories={dashboard.categories} selectedIds={campaign.categoryIds} />
                      <div className="flex flex-wrap gap-4">
                        <CheckboxField defaultChecked={campaign.isActive} label="Campanha ativa" name="isActive" />
                        <CheckboxField defaultChecked={campaign.showOnStorefront} label="Mostrar na loja" name="showOnStorefront" />
                      </div>
                      <Button className="w-fit bg-emerald-600 text-white hover:bg-emerald-700" type="submit">
                        Salvar campanha
                      </Button>
                    </form>
                  </details>
                ))}
                {dashboard.campaigns.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Nenhuma campanha criada ainda.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Ajuste manual</CardTitle>
              <CardDescription>Use apenas para correcoes, bonificacoes e atendimento.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={adjustCustomerNerdcoins} className="grid gap-3 md:grid-cols-[1fr_140px_1fr_auto]">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" name="userId" required>
                  {dashboard.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name ?? customer.email} - {customer.loyaltyPoints?.balance ?? 0} pts
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
              <CardTitle>Clientes NerdCoins</CardTitle>
              <CardDescription>Pesquise por nome, e-mail ou código de indicação e abra o histórico individual.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" defaultValue={search} name="busca" placeholder="Buscar usuário, e-mail ou código" />
                </label>
                <Button type="submit" variant="secondary">Pesquisar</Button>
              </form>
              <div className="grid gap-3">
                {dashboard.customers.map((customer) => (
                  <LoyaltyCustomerPanel customer={customer} key={customer.id} />
                ))}
                {dashboard.customers.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum usuario encontrado.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Indicacoes recentes</CardTitle>
            <CardDescription>Quem indicou quem, pedido qualificador e pontos de recompensa.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {dashboard.recentReferrals.map((referral) => (
                <div className="grid gap-1 p-3 text-sm md:grid-cols-[1fr_150px_180px]" key={referral.id}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {referral.inviter.name ?? referral.inviter.email} indicou {referral.invitee.name ?? referral.invitee.email}
                    </p>
                    <p className="text-muted-foreground">
                      Ganhou {referral.inviterRewardPoints} pts / convidado {referral.inviteeRewardPoints} pts
                    </p>
                  </div>
                  <p>{getReferralStatusLabel(referral.status)}</p>
                  <p className="text-muted-foreground">{formatDateTime(referral.createdAt)}</p>
                </div>
              ))}
              {dashboard.recentReferrals.length === 0 ? <EmptyRow>Nenhuma indicacao registrada ainda.</EmptyRow> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Cupons pessoais recentes</CardTitle>
            <CardDescription>Cupons gerados por NerdCoins, com dono, valor e validade.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {dashboard.generatedCoupons.map((coupon) => (
                <div className="grid gap-1 p-3 text-sm" key={coupon.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono font-semibold">{coupon.code}</p>
                    <p className="font-black text-primary">{formatCurrency(coupon.value)}</p>
                  </div>
                  <p className="truncate text-muted-foreground">
                    {coupon.assignedUser?.name ?? coupon.assignedUser?.email ?? "Cliente não vinculado"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {coupon.usedCount > 0 ? "Usado" : coupon.expiresAt ? `Expira ${formatDateTime(coupon.expiresAt)}` : "Sem validade"}
                  </p>
                </div>
              ))}
              {dashboard.generatedCoupons.length === 0 ? <EmptyRow>Nenhum cupom pessoal gerado ainda.</EmptyRow> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Alertas enviados</CardTitle>
            <CardDescription>Histórico de notificações do programa para evitar duplicidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {dashboard.notifications.map((notification) => (
                <div className="grid gap-1 p-3 text-sm" key={notification.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{notification.type}</p>
                    <StatusPill>{notification.status}</StatusPill>
                  </div>
                  <p className="truncate text-muted-foreground">
                    {notification.user?.name ?? notification.user?.email ?? notification.email ?? "Cliente não vinculado"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(notification.sentAt)}</p>
                </div>
              ))}
              {dashboard.notifications.length === 0 ? <EmptyRow>Nenhum alerta enviado ainda.</EmptyRow> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2 2xl:col-span-2">
          <CardHeader>
            <CardTitle>Histórico recente</CardTitle>
            <CardDescription className="max-w-2xl text-pretty">
              Ledger auditável de ganhos, resgates, ajustes e expirações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1">
              {dashboard.recentActivity.map((entry) => (
                <div
                  className="grid min-w-0 gap-3 rounded-lg border bg-background/70 p-3 text-sm shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  key={entry.id}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="min-w-0 max-w-full truncate font-semibold text-foreground">
                        {entry.user?.name ?? entry.user?.email ?? "Cliente excluído"}
                      </p>
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Saldo {entry.balanceAfter}
                      </span>
                    </div>
                    <p className="max-w-2xl break-words text-muted-foreground">
                      {entry.reason}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(entry.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span
                      className={
                        entry.pointsDelta >= 0
                          ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-black text-emerald-700 tabular-nums dark:text-emerald-200"
                          : "rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-sm font-black text-destructive tabular-nums"
                      }
                    >
                      {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta}
                    </span>
                  </div>
                </div>
              ))}
              {dashboard.recentActivity.length === 0 ? <EmptyRow>Nenhum movimento ainda.</EmptyRow> : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function LoyaltyCustomerPanel({ customer }: { customer: LoyaltyCustomer }): React.ReactElement {
  const spentCents = customer.orders.reduce((sum, order) => sum + order.totalCents, 0);
  const activeCoupons = customer.assignedCoupons.filter((coupon) => coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date()));
  const usedCoupons = customer.assignedCoupons.filter((coupon) => coupon.usedCount > 0);
  const expiredCoupons = customer.assignedCoupons.filter((coupon) => coupon.expiresAt && coupon.expiresAt <= new Date());

  return (
    <details className="rounded-lg border bg-background">
      <summary className="grid cursor-pointer list-none gap-3 p-4 md:grid-cols-[minmax(0,1fr)_110px_110px_150px] md:items-center">
        <div className="min-w-0">
          <p className="truncate font-semibold">{customer.name ?? "Cliente sem nome"}</p>
          <p className="truncate text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <StatusPill>{customer.loyaltyPoints?.balance ?? 0} pts</StatusPill>
        <StatusPill>{customer.loyaltyPoints?.tier ?? "GENIN"}</StatusPill>
        <span className="text-sm text-muted-foreground md:text-right">{formatCurrency(spentCents)}</span>
      </summary>
      <div className="grid gap-4 border-t p-4 xl:grid-cols-3">
        <Panel title="Resumo">
          <Info label="Saldo atual" value={`${customer.loyaltyPoints?.balance ?? 0} pontos`} />
          <Info label="Ganhos vitalicios" value={`${customer.loyaltyPoints?.lifetimeEarned ?? 0} pontos`} />
          <Info label="Resgatados" value={`${customer.loyaltyPoints?.lifetimeRedeemed ?? 0} pontos`} />
          <Info label="Expirados" value={`${customer.loyaltyPoints?.lifetimeExpired ?? 0} pontos`} />
          <Info label="Código de indicação" value={customer.referralCode?.code ?? "Não gerado"} />
        </Panel>

        <Panel title="Cupons">
          <Info label="Ativos" value={activeCoupons.length.toString()} />
          <Info label="Usados" value={usedCoupons.length.toString()} />
          <Info label="Expirados" value={expiredCoupons.length.toString()} />
          {customer.assignedCoupons.slice(0, 5).map((coupon) => (
            <div className="rounded-md border p-3 text-sm" key={coupon.id}>
              <p className="font-mono font-semibold">{coupon.code}</p>
              <p className="text-muted-foreground">
                {formatCurrency(coupon.value)} / {coupon.usedCount > 0 ? "usado" : coupon.expiresAt ? `expira ${formatDateTime(coupon.expiresAt)}` : "sem validade"}
              </p>
              {coupon.redemptions.map((redemption) => (
                <Link className="mt-1 block text-xs text-primary hover:underline" href={`/admin/pedidos/${redemption.order.id}`} key={redemption.order.id}>
                  Usado no pedido {redemption.order.orderNumber}
                </Link>
              ))}
            </div>
          ))}
          {customer.assignedCoupons.length === 0 ? <EmptyText>Nenhum cupom pessoal.</EmptyText> : null}
        </Panel>

        <Panel title="Indicacoes">
          {customer.referralReceived ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-semibold">Foi indicado por {customer.referralReceived.inviter.name ?? customer.referralReceived.inviter.email}</p>
              <p className="text-muted-foreground">
                {getReferralStatusLabel(customer.referralReceived.status)} / código {customer.referralReceived.referralCode}
              </p>
            </div>
          ) : <EmptyText>Não veio por indicação.</EmptyText>}
          {customer.referralsSent.map((referral) => (
            <div className="rounded-md border p-3 text-sm" key={referral.id}>
              <p className="font-semibold">Indicou {referral.invitee.name ?? referral.invitee.email}</p>
              <p className="text-muted-foreground">
                {getReferralStatusLabel(referral.status)} / +{referral.inviterRewardPoints} pts
              </p>
            </div>
          ))}
        </Panel>

        <Panel title="Histórico de pontos">
          {customer.loyaltyLedger.map((entry) => (
            <div className="rounded-md border p-3 text-sm" key={entry.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{entry.reason}</p>
                <p className={entry.pointsDelta >= 0 ? "font-semibold text-emerald-700 dark:text-emerald-200" : "font-semibold text-destructive"}>
                  {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Saldo apos movimento: {entry.balanceAfter} / {formatDateTime(entry.createdAt)}
              </p>
              {entry.customerNote ? <p className="mt-1 text-xs text-muted-foreground">{entry.customerNote}</p> : null}
            </div>
          ))}
          {customer.loyaltyLedger.length === 0 ? <EmptyText>Nenhum movimento.</EmptyText> : null}
        </Panel>
      </div>
    </details>
  );
}

function RoutineButton({
  action,
  icon: Icon,
  label
}: {
  action: () => Promise<void>;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}): React.ReactElement {
  return (
    <form action={action} className="min-w-0">
      <RoutineSubmitButton label={label}>
        <Icon className="h-4 w-4" />
      </RoutineSubmitButton>
    </form>
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

function TextField({
  defaultValue = "",
  label,
  name,
  placeholder
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue} name={name} placeholder={placeholder} />
    </label>
  );
}

function MoneyField({
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
      <Input
        defaultValue={formatMoneyInput(defaultValue)}
        inputMode="decimal"
        min={0}
        name={name}
        placeholder="0,00"
        type="text"
      />
    </label>
  );
}

function DateTimeField({
  defaultValue = "",
  label,
  name
}: {
  defaultValue?: string;
  label: string;
  name: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue} name={name} type="datetime-local" />
    </label>
  );
}

function CheckboxField({
  defaultChecked = false,
  label,
  name
}: {
  defaultChecked?: boolean;
  label: string;
  name: string;
}): React.ReactElement {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      {label}
    </label>
  );
}

function CategorySelect({
  categories,
  selectedIds
}: {
  categories: Array<{ id: string; name: string }>;
  selectedIds: string[];
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      Categorias elegíveis
      <select
        className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
        defaultValue={selectedIds}
        multiple
        name="categoryIds"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">
        Sem categoria e sem tag significa campanha global.
      </span>
    </label>
  );
}

function formatMoneyInput(value: number | string): string {
  if (typeof value === "string") {
    return value;
  }

  return (value / 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function formatDateForInput(date: Date | null): string {
  if (!date) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return offsetDate.toISOString().slice(0, 16);
}

function Panel({ children, title }: { children: React.ReactNode; title: string }): React.ReactElement {
  return (
    <section className="grid content-start gap-3 rounded-lg border bg-muted/20 p-4 xl:first:col-span-1 xl:last:col-span-3">
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

function EmptyRow({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="p-3 text-sm text-muted-foreground">{children}</p>;
}

function SuccessMessage({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/25 dark:text-emerald-100">
      {children}
    </p>
  );
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

function formatRoutineMessage(routine: string, count: string): string {
  const labels: Record<string, string> = {
    birthday: `Rotina de aniversários concluída. ${count} crédito(s) processado(s).`,
    expire: `Rotina de expiração concluída. ${count} lote(s) vencido(s) processado(s).`,
    expiring: `Rotina de aviso de vencimento concluída. ${count} alerta(s) processado(s).`,
    referrals: `Rotina de códigos de indicação concluída. ${count} código(s) gerado(s).`
  };

  return labels[routine] ?? "Rotina concluída.";
}
