import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
      <Link className="text-sm text-muted-foreground" href="/conta">Conta</Link>
      <h1 className="geek-title mt-3 text-3xl font-bold tracking-normal">Meus Nerdcoins</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Acompanhe saldo, histórico e converta pontos em cupons exclusivos da sua conta.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Saldo disponível</CardDescription>
            <CardTitle>{loyaltyPoints.balance} Nerdcoins</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Nível atual</CardDescription>
            <CardTitle>{loyaltyTierLabels[loyaltyPoints.tier]}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Converter em cupom</CardTitle>
          <CardDescription>
            Mínimo: {settings.minRedeemPoints} Nerdcoins, equivalente a {formatCurrency(minCouponValue)}.
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
              Gerar cupom
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Indique e ganhe</CardTitle>
          <CardDescription>
            Seu convidado ganha {settings.referralInviteeBonusPoints} Nerdcoins no cadastro. Voce ganha {settings.referralInviterBonusPoints} quando a primeira compra for aprovada.
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
                <p className="text-muted-foreground">{referral.inviterRewardPoints} Nerdcoins</p>
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
            <CardTitle>Cupons gerados</CardTitle>
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
            <CardTitle>Histórico</CardTitle>
            <CardDescription>Movimentações auditáveis do seu saldo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {ledger.map((entry) => (
                <div className="grid gap-1 p-3 text-sm" key={entry.id}>
                  <p className="font-medium">
                    {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta} Nerdcoins
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
