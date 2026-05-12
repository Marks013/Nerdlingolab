import { BadgeCheck, Coins, Crown, Gift, Share2, Sparkles, TicketPercent, Trophy } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoyaltyTracker } from "@/features/loyalty/components/loyalty-tracker";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import {
  calculateCouponValueCents,
  getLoyaltyProgramSettings,
  getVipProgress,
  loyaltyTierLabels
} from "@/lib/loyalty/settings";
import { getStorefrontLoyaltyCampaigns } from "@/lib/loyalty/campaigns";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  alternates: {
    canonical: "/programa-de-fidelidade"
  },
  description: "Conheça o programa Nerdcoins da NerdLingoLab e acompanhe seus benefícios, cupons e recompensas.",
  title: "Programa Nerdcoins"
};

const loyaltyBlocks = [
  {
    title: "Compre e acumule",
    description: "Cada pedido aprovado vira pontos para a próxima compra.",
    icon: Coins,
    tone: "bg-orange-50 text-primary dark:bg-orange-950/25"
  },
  {
    title: "Troque por desconto",
    description: "Converta NerdCoins em cupons pessoais direto na sua conta.",
    icon: TicketPercent,
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300"
  },
  {
    title: "Suba de nível",
    description: "Quanto mais você compra, mais forte fica seu multiplicador VIP.",
    icon: Trophy,
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300"
  }
];

export const dynamic = "force-dynamic";

export default async function LoyaltyPage(): Promise<React.ReactElement> {
  const session = await auth();
  const [settings, activeCampaigns] = await Promise.all([
    getLoyaltyProgramSettings(),
    getStorefrontLoyaltyCampaigns()
  ]);
  const loyaltyPoints = session?.user?.id
    ? await prisma.loyaltyPoints.findUnique({ where: { userId: session.user.id } })
    : null;
  const ledger = session?.user?.id
    ? await prisma.loyaltyLedger.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        where: { userId: session.user.id }
      })
    : [];
  const minCouponValue = calculateCouponValueCents(settings.minRedeemPoints, settings.redeemCentsPerPoint);
  const examplePurchaseCents = 10_000;
  const exampleBasePoints = Math.floor((examplePurchaseCents / 100) * settings.pointsPerReal);
  const exampleBaseCouponCents = calculateCouponValueCents(exampleBasePoints, settings.redeemCentsPerPoint);
  const vipProgress = loyaltyPoints
    ? getVipProgress({
        orderCount: loyaltyPoints.tierOrderCount,
        settings,
        spendCents: loyaltyPoints.tierSpendCents,
        tier: loyaltyPoints.tier
      })
    : null;

  return (
    <main className="geek-page min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <LoyaltyTracker
        eventName="loyalty_campaign_viewed"
        properties={{
          activeCampaignCount: activeCampaigns.length,
          isLoggedIn: Boolean(session?.user?.id),
          minRedeemPoints: settings.minRedeemPoints,
          pointsPerReal: settings.pointsPerReal,
          surface: "loyalty_program"
        }}
      />
      <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-lg border border-primary/35 bg-card shadow-md">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase text-primary">
              <Sparkles className="mr-2 h-4 w-4" />
              Programa oficial da NerdLingoLab
            </span>
            <h1 className="mt-4 text-balance text-4xl font-black tracking-normal text-foreground sm:text-5xl">
              NerdCoins: sua compra volta em forma de desconto.
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
              Entre no clube, ganhe pontos em compras aprovadas, avance nos níveis VIP e transforme seu saldo em cupons para novas compras geek.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={session?.user?.id ? "/conta/nerdcoins" : "/cadastro"}>{session?.user?.id ? "Ver meus NerdCoins" : "Criar conta e começar"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/produtos">Comprar e acumular</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-5 shadow-inner">
            <p className="text-sm font-black uppercase text-primary">Conversão ativa</p>
            <div className="mt-4 grid gap-3">
              <HeroStat label="Você ganha" value={`${settings.pointsPerReal} pts`} detail="a cada R$ 1 em pedido aprovado" />
              <HeroStat label="Resgate mínimo" value={`${settings.minRedeemPoints} pts`} detail={`equivale a ${formatCurrency(minCouponValue)}`} />
              <HeroStat label="Bônus de cadastro" value={`${settings.signupBonusPoints} pts`} detail="liberado ao completar a conta" />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {loyaltyBlocks.map((block) => (
          <Card className="border-primary/30 bg-card" key={block.title}>
            <CardHeader>
              <div className={`mb-1 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 ${block.tone}`}>
                <block.icon className="h-5 w-5" />
              </div>
              <CardTitle>{block.title}</CardTitle>
              <CardDescription>{block.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      {activeCampaigns.length > 0 ? (
        <section className="mt-8 rounded-lg border border-primary/30 bg-card p-6 shadow-sm sm:p-8">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase text-primary">
            <Sparkles className="mr-1.5 size-3.5" />
            Campanhas ativas
          </p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-normal text-foreground">
            Missões temporárias para ganhar mais NerdCoins.
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activeCampaigns.map((campaign) => (
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-4" key={campaign.id}>
                <p className="font-black text-foreground">{campaign.name}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {campaign.description || "Campanha especial válida enquanto estiver ativa no site."}
                </p>
                <p className="mt-3 text-sm font-black text-primary">
                  {campaign.pointsMultiplier}% dos pontos{campaign.bonusPoints > 0 ? ` + ${campaign.bonusPoints} extras` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-8 rounded-lg border border-primary/30 bg-primary/10 p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="inline-flex items-center rounded-full bg-background px-3 py-1 text-xs font-black uppercase text-primary">
              <TicketPercent className="mr-1.5 size-3.5" />
              Exemplo real de benefício
            </p>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-normal text-foreground">
              Compre hoje, alimente o próximo cupom.
            </h2>
            <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">
              Em uma compra aprovada de {formatCurrency(examplePurchaseCents)}, um cliente Genin acumula cerca de {exampleBasePoints} NerdCoins,
              que podem virar {formatCurrency(exampleBaseCouponCents)} em desconto quando convertidos. Nos níveis VIP, esse retorno fica ainda maior.
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-primary/20 bg-background p-4">
            <RuleLine label="Genin" value={`${exampleBasePoints} pts · ${formatCurrency(exampleBaseCouponCents)}`} />
            <RuleLine label="Chunin" value={`${Math.floor((exampleBasePoints * settings.chuninMultiplier) / 100)} pts`} />
            <RuleLine label="Jonin" value={`${Math.floor((exampleBasePoints * settings.joninMultiplier) / 100)} pts`} />
            <RuleLine label="Hokage" value={`${Math.floor((exampleBasePoints * settings.hokageMultiplier) / 100)} pts`} />
          </div>
        </div>
      </section>
      <Card className="mt-8 border-primary/35 bg-orange-50/80 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            {loyaltyPoints?.balance ?? 0} NerdCoins disponíveis
          </CardTitle>
          <CardDescription>
            Nível atual: {loyaltyPoints ? loyaltyTierLabels[loyaltyPoints.tier] : "Genin"} · {settings.pointsPerReal} pontos por R$ 1 ·
            resgate mínimo {settings.minRedeemPoints} pontos ({formatCurrency(minCouponValue)})
          </CardDescription>
          {session?.user?.id ? (
            <Button asChild className="mt-2 w-fit">
              <Link href="/conta/nerdcoins">Ver saldo e cupons</Link>
            </Button>
          ) : (
            <Button asChild className="mt-2 w-fit">
              <Link href="/conta">Entrar para ver saldo</Link>
            </Button>
          )}
        </CardHeader>
        {vipProgress ? (
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ProgressMeter label="Pedidos para o próximo nível" value={vipProgress.orderPercent} />
            <ProgressMeter label="Gasto para o próximo nível" value={vipProgress.spendPercent} />
          </CardContent>
        ) : null}
      </Card>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <MarketingCard
          icon={Gift}
          title="Cadastro com recompensa"
          text={`Complete sua conta e comece com ${settings.signupBonusPoints} NerdCoins para entrar no jogo já com saldo.`}
        />
        <MarketingCard
          icon={Share2}
          title="Indicação vale ponto"
          text={`Convide alguém: quem entra recebe ${settings.referralInviteeBonusPoints} pontos e você pode ganhar ${settings.referralInviterBonusPoints}.`}
        />
        <MarketingCard
          icon={BadgeCheck}
          title="Tudo auditável"
          text="Ganhos, resgates, expiração e estornos ficam registrados para você acompanhar sem surpresa."
        />
      </section>
      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Formas de ganhar</CardTitle>
            <CardDescription>Regras ativas do programa, sem texto decorativo solto.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <RuleLine label="Compras aprovadas" value={`${settings.pointsPerReal} ponto(s) por R$ 1`} />
            <RuleLine label="Cadastro" value={`${settings.signupBonusPoints} ponto(s)`} />
            <RuleLine label="Aniversário" value={`${settings.birthdayBonusPoints} ponto(s) processados pelo admin`} />
            <RuleLine label="Indicação recebida" value={`${settings.referralInviteeBonusPoints} ponto(s) no cadastro`} />
            <RuleLine label="Indicação convertida" value={`${settings.referralInviterBonusPoints} ponto(s) após primeira compra aprovada`} />
            <RuleLine
              label="Validade dos pontos"
              value={settings.pointsExpireInDays ? `${settings.pointsExpireInDays} dia(s)` : "Sem vencimento configurado"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Níveis VIP</CardTitle>
            <CardDescription>Bônus aplicado sobre os pontos das compras aprovadas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <RuleLine label="Genin" value="100% dos pontos base" />
            <RuleLine label="Chunin" value={`${settings.chuninOrderThreshold} pedidos ou ${formatCurrency(settings.chuninSpendThresholdCents)} · ${settings.chuninMultiplier}%`} />
            <RuleLine label="Jonin" value={`${settings.joninOrderThreshold} pedidos ou ${formatCurrency(settings.joninSpendThresholdCents)} · ${settings.joninMultiplier}%`} />
            <RuleLine label="Hokage" value={`${settings.hokageOrderThreshold} pedidos ou ${formatCurrency(settings.hokageSpendThresholdCents)} · ${settings.hokageMultiplier}%`} />
          </CardContent>
        </Card>
      </section>
      {ledger.length > 0 ? (
        <Card className="mt-4 border-primary/30 bg-card">
          <CardHeader>
            <CardTitle>Histórico recente</CardTitle>
            <CardDescription className="text-pretty">
              Últimos movimentos da sua carteira, com ganhos, usos e ajustes separados para ficar fácil de acompanhar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {ledger.slice(0, 6).map((entry) => (
              <div className="rounded-lg border bg-background p-3 text-sm" key={entry.id}>
                <p className={entry.pointsDelta >= 0 ? "font-black text-emerald-700 dark:text-emerald-300" : "font-black text-destructive"}>
                  {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta} NerdCoins
                </p>
                <p className="mt-1 text-muted-foreground">{entry.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      </div>
    </main>
  );
}

function HeroStat({ detail, label, value }: { detail: string; label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-primary/25 bg-background p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function MarketingCard({
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
      <Icon className="h-6 w-6 text-primary" />
      <h2 className="mt-3 text-lg font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function RuleLine({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3">
      <span className="font-medium">{label}</span>
      <span className="text-right text-muted-foreground">{value}</span>
    </div>
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
