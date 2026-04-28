import { prisma } from "@/lib/prisma";

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
  }
] as const;

export async function getActiveMarketingPopup(): Promise<PublicMarketingPopup | null> {
  const now = new Date();
  const popup = await prisma.marketingPopup.findFirst({
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
  });

  if (!popup) {
    return null;
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
