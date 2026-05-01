import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab"
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  await prisma.loyaltyProgramSettings.upsert({
    where: { singletonKey: "default" },
    create: { singletonKey: "default" },
    update: {}
  });

  await ensureDefaultManualShippingRates();
  await ensureDefaultNotificationTemplates();

  const superadminName: string = process.env.SUPERADMIN_NAME ?? "NerdLingoLab Admin";
  const superadminEmail: string | undefined = process.env.SUPERADMIN_EMAIL;
  const superadminPassword: string | undefined = process.env.SUPERADMIN_PASSWORD;

  if (!superadminEmail || !superadminPassword) {
    throw new Error("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be defined before seeding.");
  }

  const existingSuperadmin = await prisma.user.findUnique({
    where: { email: superadminEmail }
  });

  const passwordHash: string = await bcrypt.hash(superadminPassword, 12);

  if (existingSuperadmin) {
    await prisma.user.update({
      where: { id: existingSuperadmin.id },
      data: {
        name: superadminName,
        passwordHash,
        role: UserRole.SUPERADMIN
      }
    });
    return;
  }

  await prisma.user.create({
    data: {
      name: superadminName,
      email: superadminEmail,
      passwordHash,
      role: UserRole.SUPERADMIN,
      loyaltyPoints: {
        create: {}
      }
    }
  });
}

async function ensureDefaultNotificationTemplates(): Promise<void> {
  const templates = [
    {
      body: "Olá, {{customerName}}! Você deixou alguns produtos no carrinho. Volte para finalizar com segurança.",
      cooldownHours: 24,
      ctaHref: "/carrinho",
      ctaLabel: "Voltar ao carrinho",
      name: "Carrinho abandonado",
      previewText: "Finalize sua compra antes que os itens acabem.",
      subject: "Seu carrinho geek ainda está te esperando",
      templateKey: "abandoned_cart"
    },
    {
      body: "Olá, {{customerName}}! Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo para continuar.",
      cooldownHours: 1,
      ctaHref: "/entrar",
      ctaLabel: "Redefinir senha",
      name: "Redefinição de senha",
      previewText: "Use o link seguro para criar uma nova senha.",
      subject: "Redefina sua senha NerdLingoLab",
      templateKey: "password_reset"
    },
    {
      body: "Olá, {{customerName}}! Separamos uma campanha especial para você aproveitar hoje.",
      cooldownHours: 24,
      ctaHref: "/ofertas",
      ctaLabel: "Ver ofertas",
      name: "Alerta de desconto",
      previewText: "Uma campanha especial está disponível por tempo limitado.",
      subject: "Tem desconto novo no laboratório",
      templateKey: "discount_alert"
    },
    {
      body: "Olá, {{customerName}}! Obrigado por entrar no laboratório. Seu cupom de R$ 10 já está pronto para a primeira missão.",
      cooldownHours: 168,
      ctaHref: "/cupons",
      ctaLabel: "Ver meu cupom",
      name: "Boas-vindas com cupom",
      previewText: "Ative sua conta, acumule NerdCoins e use seu desconto.",
      subject: "Seu cupom NerdLingoLab de R$ 10 chegou",
      templateKey: "welcome_coupon"
    },
    {
      body: "Olá, {{customerName}}! Recebemos o pedido {{orderNumber}} e vamos acompanhar cada etapa por aqui.",
      cooldownHours: 1,
      ctaHref: "/conta",
      ctaLabel: "Ver pedido",
      name: "Pedido recebido",
      previewText: "Agora é só concluir o pagamento para seguir com a preparação.",
      subject: "Recebemos seu pedido {{orderNumber}}",
      templateKey: "order_created"
    },
    {
      body: "Boa notícia, {{customerName}}! O pagamento do pedido {{orderNumber}} foi aprovado e a preparação já pode começar.",
      cooldownHours: 1,
      ctaHref: "/conta",
      ctaLabel: "Acompanhar pedido",
      name: "Pagamento aprovado",
      previewText: "Seu pedido entrou na fila de preparação.",
      subject: "Pagamento aprovado do pedido {{orderNumber}}",
      templateKey: "order_paid"
    },
    {
      body: "Olá, {{customerName}}! O pedido {{orderNumber}} passou do prazo estimado. Estamos analisando o atraso e acompanhando de perto até a entrega.",
      cooldownHours: 24,
      ctaHref: "/conta",
      ctaLabel: "Ver rastreio",
      name: "Entrega em atraso",
      previewText: "Nossa equipe está analisando o rastreio e acompanhando de perto.",
      subject: "Estamos acompanhando o atraso do pedido {{orderNumber}}",
      templateKey: "shipment_overdue"
    },
    {
      body: "Olá, {{customerName}}! Atualizamos seu atendimento. Entre na sua conta para conferir a resposta da equipe.",
      cooldownHours: 1,
      ctaHref: "/suporte",
      ctaLabel: "Abrir suporte",
      name: "Resposta do suporte",
      previewText: "Sua solicitação recebeu uma nova resposta.",
      subject: "Respondemos seu atendimento NerdLingoLab",
      templateKey: "support_reply"
    }
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      create: {
        ...template,
        channel: "EMAIL",
        isActive: true
      },
      update: {},
      where: { templateKey: template.templateKey }
    });
  }
}

async function ensureDefaultManualShippingRates(): Promise<void> {
  const existingCount = await prisma.manualShippingRate.count();

  if (existingCount > 0) {
    return;
  }

  await prisma.manualShippingRate.createMany({
    data: [
      {
        description: "Opção padrão com melhor custo para pedidos nacionais.",
        estimatedBusinessDays: 7,
        name: "Frete padrão econômico",
        priceCents: 1490,
        sortOrder: 10
      },
      {
        description: "Opção rápida para clientes que querem receber antes.",
        estimatedBusinessDays: 3,
        name: "Frete rápido prioritário",
        priceCents: 2490,
        sortOrder: 20
      }
    ]
  });
}

main()
  .catch((error: unknown) => {
    throw error;
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
  });
