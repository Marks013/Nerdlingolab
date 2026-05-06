import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Coins, Gift, History, Rocket, Share2, Sparkles, TicketPercent, Trophy } from "lucide-react";

import { convertNerdcoinsToCoupon } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { buildReferralSignupUrl, ensureReferralCode, getReferralStatusLabel } from "@/lib/loyalty/referrals";
import {
  calculateCouponValueCents,
  getLoyaltyProgramSettings,
  getVipProgress,
  loyaltyTierLabels
} from "@/lib/loyalty/settings";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Meus Nerdcoins"
};

export const dynamic = "force-dynamic";

export default async function AccountNerdcoinsPage(): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const [settings, loyaltyPoints, ledger, coupons, nextExpiringLedger, referralCode, referralsSent] = await Promise.all([
    getLoyaltyProgramSettings(),
    prisma.loyaltyPoints.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {}
    }),
    prisma.loyaltyLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      where: { userId: session.user.id }
    }),
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      where: { assignedUserId: session.user.id }
    }),
    prisma.loyaltyLedger.findFirst({
      orderBy: { expiresAt: "asc" },
      where: {
        expiresAt: { gte: new Date() },
        pointsDelta: { gt: 0 },
        userId: session.user.id
      }
    }),
    ensureReferralCode(session.user.id),
    prisma.referral.findMany({
      include: {
        invitee: { select: { email: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      where: { inviterId: session.user.id }
    })
  ]);
  const minCouponValue = calculateCouponValueCents(settings.minRedeemPoints, settings.redeemCentsPerPoint);
  const currentCouponValue = calculateCouponValueCents(loyaltyPoints.balance, settings.redeemCentsPerPoint);
  const pointsToCoupon = Math.max(0, settings.minRedeemPoints - loyaltyPoints.balance);
  const vipProgress = getVipProgress({
    orderCount: loyaltyPoints.tierOrderCount,
    settings,
    spendCents: loyaltyPoints.tierSpendCents,
    tier: loyaltyPoints.tier
  });
  const referralUrl = buildReferralSignupUrl(process.env.APP_URL ?? "http://localhost:3000", referralCode);

  return (
    <main className="geek-page min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
      <Link className="text-sm font-semibold text-primary underline-offset-4 hover:underline" href="/conta">Conta</Link>
      <section className="mt-3 overflow-hidden rounded-lg border border-primary/30 bg-card shadow-md">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="mr-2 h-4 w-4" />
              Carteira de recompensas
            </span>
            <h1 className="mt-4 text-balance text-3xl font-black tracking-normal text-foreground sm:text-4xl">
              Seus NerdCoins estão trabalhando pela próxima compra.
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
              Veja quanto seu saldo já pode virar desconto, acompanhe seu nível VIP e convide amigos para acelerar suas recompensas.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/produtos">
                  <Rocket className="mr-2 h-4 w-4" />
                  Comprar e ganhar mais
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/programa-de-fidelidade">Como funciona</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-5">
            <p className="text-sm font-black uppercase text-primary">Poder de desconto</p>
            <p className="mt-2 text-5xl font-black text-primary">{loyaltyPoints.balance}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">NerdCoins disponíveis</p>
            <div className="mt-4 rounded-lg border border-primary/25 bg-background p-4">
              <p className="text-sm text-muted-foreground">
                {loyaltyPoints.balance >= settings.minRedeemPoints
                  ? `Seu saldo pode gerar até ${formatCurrency(currentCouponValue)} em cupom.`
                  : `Faltam ${pointsToCoupon} NerdCoins para liberar seu primeiro cupom.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="border-primary/35 bg-primary/10">
          <CardHeader>
            <Coins className="h-5 w-5 text-primary" />
            <CardDescription>Saldo disponível</CardDescription>
            <CardTitle>{loyaltyPoints.balance} NerdCoins</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/35 bg-orange-50/80 dark:bg-orange-950/20">
          <CardHeader>
            <Trophy className="h-5 w-5 text-primary" />
            <CardDescription>Nível atual</CardDescription>
            <CardTitle>{loyaltyTierLabels[loyaltyPoints.tier]}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/35 bg-emerald-50/80 dark:bg-emerald-950/20">
          <CardHeader>
            <Gift className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <CardDescription>Total ganho</CardDescription>
            <CardTitle>{loyaltyPoints.lifetimeEarned}</CardTitle>
            <CardDescription>
              {nextExpiringLedger?.expiresAt
                ? `${nextExpiringLedger.pointsDelta} pontos em ${formatDateTime(nextExpiringLedger.expiresAt)}`
                : "Sem pontos com vencimento"}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <MissionCard
          icon={TicketPercent}
          title="Cupom mais próximo"
          text={loyaltyPoints.balance >= settings.minRedeemPoints
            ? `Você já pode transformar pontos em desconto. Mínimo atual: ${settings.minRedeemPoints} pontos.`
            : `Ganhe mais ${pointsToCoupon} pontos para gerar um cupom de pelo menos ${formatCurrency(minCouponValue)}.`}
        />
        <MissionCard
          icon={BadgeCheck}
          title="Benefício VIP"
          text={vipProgress.isMaxTier
            ? "Você está no topo do programa. Continue comprando para manter seu histórico forte."
            : `Próximo nível: ${vipProgress.nextLabel}. Falta pouco para melhorar seu multiplicador.`}
        />
        <MissionCard
          icon={Share2}
          title="Indicação estratégica"
          text={`Cada convite pode render ${settings.referralInviterBonusPoints} pontos quando a primeira compra do indicado for aprovada.`}
        />
      </section>

      <Card className="mt-6 border-primary/35">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {vipProgress.isMaxTier
              ? "Você está no nível máximo"
              : `Rumo ao nível ${vipProgress.nextLabel}`}
          </CardTitle>
          <CardDescription>
            {vipProgress.isMaxTier
              ? "Continue comprando para manter o histórico do programa."
              : `Faltam ${vipProgress.ordersRemaining} pedido(s) ou ${formatCurrency(vipProgress.spendRemainingCents)} em compras aprovadas.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ProgressMeter label="Pedidos" value={vipProgress.orderPercent} />
          <ProgressMeter label="Gasto acumulado" value={vipProgress.spendPercent} />
        </CardContent>
      </Card>

      <Card className="mt-6 border-primary/35 bg-orange-50/70 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-primary" />
            Transformar pontos em cupom
          </CardTitle>
          <CardDescription>
            Mínimo: {settings.minRedeemPoints} NerdCoins. Seu saldo atual pode chegar a {formatCurrency(currentCouponValue)} em desconto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={convertNerdcoinsToCoupon} className="grid gap-3 sm:grid-cols-[220px_auto]">
            <Input
              defaultValue={settings.minRedeemPoints}
              max={loyaltyPoints.balance}
              min={settings.minRedeemPoints}
              name="points"
              type="number"
            />
            <Button disabled={!settings.isEnabled || loyaltyPoints.balance < settings.minRedeemPoints} type="submit">
              <TicketPercent className="mr-2 h-4 w-4" />
              Gerar meu cupom
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Indique e ganhe
          </CardTitle>
          <CardDescription>
            Seu convidado ganha {settings.referralInviteeBonusPoints} NerdCoins no cadastro. Você ganha {settings.referralInviterBonusPoints} quando a primeira compra for aprovada.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 text-sm">
            <span className="font-medium">Seu link</span>
            <code className="overflow-x-auto rounded-lg border bg-muted px-3 py-2 text-xs">{referralUrl}</code>
          </div>
          <div className="divide-y rounded-lg border">
            {referralsSent.map((referral) => (
              <div className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto]" key={referral.id}>
                <div>
                  <p className="font-medium">{referral.invitee.name ?? referral.invitee.email}</p>
                  <p className="text-muted-foreground">{getReferralStatusLabel(referral.status)}</p>
                </div>
                <p className="text-muted-foreground">{referral.inviterRewardPoints} NerdCoins</p>
              </div>
            ))}
            {referralsSent.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Nenhuma indicação vinculada ainda.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketPercent className="h-5 w-5 text-primary" />
              Cupons gerados
            </CardTitle>
            <CardDescription>Estes códigos são pessoais e não aparecem na vitrine pública.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {coupons.map((coupon) => (
                <div className="grid gap-1 p-3 text-sm" key={coupon.id}>
                  <p className="font-mono font-semibold">{coupon.code}</p>
                  <p className="text-muted-foreground">
                    {formatCurrency(coupon.value)} · {coupon.usedCount > 0 ? "Usado" : "Disponível"} · expira {formatDateTime(coupon.expiresAt)}
                  </p>
                </div>
              ))}
              {coupons.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum cupom gerado ainda.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico
            </CardTitle>
            <CardDescription>Movimentações auditáveis do seu saldo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {ledger.map((entry) => (
                <div className="grid gap-1 p-3 text-sm" key={entry.id}>
                  <p className="font-medium">
                    {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta} NerdCoins
                  </p>
                  <p className="text-muted-foreground">
                    {entry.reason} · {formatDateTime(entry.createdAt)}
                    {entry.expiresAt ? ` · expira ${formatDateTime(entry.expiresAt)}` : ""}
                  </p>
                </div>
              ))}
              {ledger.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </main>
  );
}

function ProgressMeter({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MissionCard({
  icon: Icon,
  text,
  title
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  title: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-primary/30 bg-card p-5 shadow-sm">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="mt-3 font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
