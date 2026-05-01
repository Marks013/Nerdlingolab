import { Crown, History, TicketPercent } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import {
  calculateCouponValueCents,
  getLoyaltyProgramSettings,
  getVipProgress,
  loyaltyTierLabels
} from "@/lib/loyalty/settings";
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
    title: "Ganhe pontos",
    description: "Compras aprovadas geram pontos conforme seus benefícios atuais.",
    icon: Crown
  },
  {
    title: "Resgate no checkout",
    description: "Pontos viram desconto confirmado antes do pagamento.",
    icon: TicketPercent
  },
  {
    title: "Histórico claro",
    description: "Cada ganho, resgate, ajuste ou estorno fica disponível para consulta.",
    icon: History
  }
];

export const dynamic = "force-dynamic";

export default async function LoyaltyPage(): Promise<React.ReactElement> {
  const session = await auth();
  const settings = await getLoyaltyProgramSettings();
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
      <div className="mx-auto max-w-5xl">
      <h1 className="geek-title text-3xl font-bold tracking-normal">Programa de Fidelidade</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Acumule {settings.programName} em compras elegíveis, acompanhe seus benefícios e use
        recompensas em novos pedidos.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {loyaltyBlocks.map((block) => (
          <Card key={block.title}>
            <CardHeader>
              <block.icon className="h-5 w-5 text-primary" />
              <CardTitle>{block.title}</CardTitle>
              <CardDescription>{block.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{loyaltyPoints?.balance ?? 0} Nerdcoins disponíveis</CardTitle>
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
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Histórico recente</CardTitle>
            <CardDescription>
              {ledger.map((entry) => `${entry.pointsDelta > 0 ? "+" : ""}${entry.pointsDelta} · ${entry.reason}`).join(" | ")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      </div>
    </main>
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
