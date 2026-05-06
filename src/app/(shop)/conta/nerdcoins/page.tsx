import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeCheck,
  Coins,
  Gift,
  History,
  Rocket,
  Share2,
  Sparkles,
  TicketPercent,
  Trophy
} from "lucide-react";

import { convertNerdcoinsToCoupon } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NerdcoinsCouponForm } from "@/features/loyalty/components/nerdcoins-coupon-form";
import {
  AnimatedProgressMeter,
  CopyCouponButton,
  ShareReferralButton
} from "@/features/loyalty/components/nerdcoins-interactions";
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
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Meus Nerdcoins"
};

export const dynamic = "force-dynamic";

export default async function AccountNerdcoinsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const resolvedSearchParams = await searchParams;
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
  const couponWasGenerated = readSearchParam(resolvedSearchParams?.cupom) === "gerado";

  return (
    <main className="geek-page min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
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

      {couponWasGenerated ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <p className="font-black">Cupom gerado com sucesso.</p>
          <p className="mt-1">Ele já aparece em Cupons gerados e pode ser usado no carrinho.</p>
        </div>
      ) : null}

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
          <AnimatedProgressMeter label="Pedidos" value={vipProgress.orderPercent} />
          <AnimatedProgressMeter label="Gasto acumulado" value={vipProgress.spendPercent} />
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
          <NerdcoinsCouponForm
            action={convertNerdcoinsToCoupon}
            balance={loyaltyPoints.balance}
            currentCouponValueLabel={formatCurrency(currentCouponValue)}
            isEnabled={settings.isEnabled}
            minRedeemPoints={settings.minRedeemPoints}
          />
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
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <code className="overflow-x-auto rounded-lg border bg-muted px-3 py-2 text-xs">{referralUrl}</code>
              <ShareReferralButton referralUrl={referralUrl} />
            </div>
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
        <Card className="overflow-hidden border-orange-100 shadow-sm" id="cupons-gerados">
          <CardHeader className="bg-[#fffaf6]">
            <CardTitle className="flex items-center gap-2">
              <TicketPercent className="h-5 w-5 text-primary" />
              Cupons gerados
            </CardTitle>
            <CardDescription>Seus descontos pessoais ficam aqui, prontos para usar no carrinho.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {coupons.map((coupon) => (
                <article
                  className={cn(
                    "overflow-hidden rounded-lg border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                    coupon.usedCount > 0 ? "border-slate-200" : "border-primary/35"
                  )}
                  key={coupon.id}
                >
                  <div className={cn("px-4 py-3 text-white", coupon.usedCount > 0 ? "bg-slate-600" : "bg-primary")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase">Cupom pessoal</p>
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
                        {coupon.usedCount > 0 ? "Usado" : "Disponível"}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black">{formatCurrency(coupon.value)} de desconto</p>
                  </div>
                  <div className="grid gap-3 p-4 text-sm">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">Digite no carrinho</p>
                      <code className="mt-1 inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-2 font-mono text-sm font-black text-primary">
                        {coupon.code}
                      </code>
                    </div>
                    <p className="text-muted-foreground">Expira em {formatDateTime(coupon.expiresAt)}</p>
                    <CopyCouponButton code={coupon.code} />
                    {coupon.usedCount === 0 ? (
                      <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                        <Link href="/carrinho">Usar no carrinho</Link>
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
              {coupons.length === 0 ? (
                <p className="rounded-lg border border-dashed border-orange-200 bg-orange-50/60 p-4 text-sm text-muted-foreground">
                  Nenhum cupom gerado ainda. Quando converter seus pontos, o código aparece aqui.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-orange-100 shadow-sm">
          <CardHeader className="bg-[#fffaf6]">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico
            </CardTitle>
            <CardDescription>Entradas ficam em verde. Usos e saídas ficam em vermelho.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {ledger.map((entry) => (
                <LedgerEntryCard entry={entry} key={entry.id} />
              ))}
              {ledger.length === 0 ? (
                <p className="rounded-lg border border-dashed border-orange-200 bg-orange-50/60 p-4 text-sm text-muted-foreground">
                  Nenhuma movimentação ainda.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </main>
  );
}

function LedgerEntryCard({
  entry
}: {
  entry: {
    createdAt: Date;
    expiresAt: Date | null;
    pointsDelta: number;
    reason: string;
  };
}): React.ReactElement {
  const isGain = entry.pointsDelta > 0;
  const Icon = isGain ? ArrowUpCircle : ArrowDownCircle;
  const tone = isGain
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-800";

  return (
    <article className={cn("rounded-lg border p-4 shadow-sm", tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/75">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="font-black">
              {isGain ? "+" : ""}{entry.pointsDelta} NerdCoins
            </p>
            <p className="mt-1 text-sm font-medium">{entry.reason}</p>
          </div>
        </div>
        <span className="rounded-full bg-white/75 px-2.5 py-1 text-xs font-bold">
          {isGain ? "Ganho" : "Uso"}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium opacity-80">
        {formatDateTime(entry.createdAt)}
        {entry.expiresAt ? ` · expira ${formatDateTime(entry.expiresAt)}` : ""}
      </p>
    </article>
  );
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
