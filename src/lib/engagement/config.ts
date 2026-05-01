import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError } from "@/lib/prisma-errors";

export interface PublicMarketingPopup {
  ctaHref: string | null;
  ctaLabel: string | null;
  description: string;
  eyebrow: string | null;
  frequencyHours: number;
  id: string;
  imageUrl: string | null;
  themeTone: string;
  title: string;
  triggerType: string;
  triggerValue: number;
}

const welcomeNerdcoinsPopup: PublicMarketingPopup = {
  ctaHref: "/cadastro",
  ctaLabel: "Criar conta e ganhar R$ 10",
  description: "Entre no sistema de NerdCoins, acumule pontos nas compras e receba um cupom exclusivo de R$ 10 ao concluir seu cadastro.",
  eyebrow: "Boas-vindas ao laboratório",
  frequencyHours: 72,
  id: "welcome-nerdcoins-r10",
  imageUrl: "/brand-assets/nerd-icon-nerdcoins.webp",
  themeTone: "ORANGE",
  title: "Ganhe NerdCoins desde a primeira missão",
  triggerType: "DELAY",
  triggerValue: 1200
};

export const defaultNotificationTemplates = [
  {
    templateKey: "abandoned_cart",
    name: "Carrinho abandonado",
    subject: "Seu carrinho geek ainda está te esperando",
    previewText: "Finalize sua compra antes que os itens acabem.",
    body: "Olá, {{customerName}}! Você deixou alguns produtos no carrinho. Volte para finalizar com segurança.",
    ctaLabel: "Voltar ao carrinho",
    ctaHref: "/carrinho",
    cooldownHours: 24
  },
  {
    templateKey: "password_reset",
    name: "Redefinição de senha",
    subject: "Redefina sua senha NerdLingoLab",
    previewText: "Use o link seguro para criar uma nova senha.",
    body: "Olá, {{customerName}}! Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo para continuar.",
    ctaLabel: "Redefinir senha",
    ctaHref: "/entrar",
    cooldownHours: 1
  },
  {
    templateKey: "discount_alert",
    name: "Alerta de desconto",
    subject: "Tem desconto novo no laboratório",
    previewText: "Uma campanha especial está disponível por tempo limitado.",
    body: "Olá, {{customerName}}! Separamos uma campanha especial para você aproveitar hoje.",
    ctaLabel: "Ver ofertas",
    ctaHref: "/ofertas",
    cooldownHours: 24
  },
  {
    templateKey: "welcome_coupon",
    name: "Boas-vindas com cupom",
    subject: "Seu cupom NerdLingoLab de R$ 10 chegou",
    previewText: "Ative sua conta, acumule NerdCoins e use seu desconto.",
    body: "Olá, {{customerName}}! Obrigado por entrar no laboratório. Seu cupom de R$ 10 já está pronto para a primeira missão.",
    ctaLabel: "Ver meu cupom",
    ctaHref: "/cupons",
    cooldownHours: 168
  },
  {
    templateKey: "order_created",
    name: "Pedido recebido",
    subject: "Recebemos seu pedido {{orderNumber}}",
    previewText: "Agora é só concluir o pagamento para seguir com a preparação.",
    body: "Olá, {{customerName}}! Recebemos o pedido {{orderNumber}} e vamos acompanhar cada etapa por aqui.",
    ctaLabel: "Ver pedido",
    ctaHref: "/conta",
    cooldownHours: 1
  },
  {
    templateKey: "order_paid",
    name: "Pagamento aprovado",
    subject: "Pagamento aprovado do pedido {{orderNumber}}",
    previewText: "Seu pedido entrou na fila de preparação.",
    body: "Boa notícia, {{customerName}}! O pagamento do pedido {{orderNumber}} foi aprovado e a preparação já pode começar.",
    ctaLabel: "Acompanhar pedido",
    ctaHref: "/conta",
    cooldownHours: 1
  },
  {
    templateKey: "shipment_overdue",
    name: "Entrega em atraso",
    subject: "Estamos acompanhando o atraso do pedido {{orderNumber}}",
    previewText: "Nossa equipe está analisando o rastreio e acompanhando de perto.",
    body: "Olá, {{customerName}}! O pedido {{orderNumber}} passou do prazo estimado. Estamos analisando o atraso e acompanhando de perto até a entrega.",
    ctaLabel: "Ver rastreio",
    ctaHref: "/conta",
    cooldownHours: 24
  },
  {
    templateKey: "support_reply",
    name: "Resposta do suporte",
    subject: "Respondemos seu atendimento NerdLingoLab",
    previewText: "Sua solicitação recebeu uma nova resposta.",
    body: "Olá, {{customerName}}! Atualizamos seu atendimento. Entre na sua conta para conferir a resposta da equipe.",
    ctaLabel: "Abrir suporte",
    ctaHref: "/suporte",
    cooldownHours: 1
  }
] as const;

export async function getActiveMarketingPopup(): Promise<PublicMarketingPopup | null> {
  const now = new Date();
  const popup = await prisma.marketingPopup
    .findFirst({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      where: {
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ]
          }
        ]
      }
    })
    .catch((error: unknown) => {
      if (isPrismaMissingTableError(error, "MarketingPopup")) {
        return null;
      }

      throw error;
    });

  if (!popup) {
    return welcomeNerdcoinsPopup;
  }

  return {
    ctaHref: popup.ctaHref,
    ctaLabel: popup.ctaLabel,
    description: popup.description,
    eyebrow: popup.eyebrow,
    frequencyHours: popup.frequencyHours,
    id: popup.id,
    imageUrl: popup.imageUrl,
    themeTone: popup.themeTone,
    title: popup.title,
    triggerType: popup.triggerType,
    triggerValue: popup.triggerValue
  };
}

export async function ensureNotificationTemplates(): Promise<void> {
  await Promise.all(
    defaultNotificationTemplates.map((template) =>
      prisma.notificationTemplate.upsert({
        where: { templateKey: template.templateKey },
        create: {
          ...template,
          channel: "EMAIL",
          isActive: true
        },
        update: {}
      })
    )
  );
}
