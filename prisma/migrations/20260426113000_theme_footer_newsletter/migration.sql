ALTER TABLE "StorefrontTheme"
ADD COLUMN "announcementText" TEXT NOT NULL DEFAULT 'FRETE GRÁTIS em compras acima de R$99,90',
ADD COLUMN "supportEmail" TEXT NOT NULL DEFAULT 'nerdlingolab@gmail.com',
ADD COLUMN "whatsappLabel" TEXT NOT NULL DEFAULT '(44) 99136-2488',
ADD COLUMN "instagramUrl" TEXT NOT NULL DEFAULT 'https://instagram.com/nerdlingolab',
ADD COLUMN "footerNotice" TEXT NOT NULL DEFAULT 'Oferta exclusiva neste site oficial, sujeita a variação. Evite comprar produtos mais baratos ou de outras lojas, para evitar golpes.',
ADD COLUMN "newsletterTitle" TEXT NOT NULL DEFAULT 'Receba nossas promoções',
ADD COLUMN "newsletterDescription" TEXT NOT NULL DEFAULT 'Inscreva-se para receber descontos exclusivos direto no seu e-mail!';

CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'footer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
CREATE INDEX "NewsletterSubscriber_isActive_createdAt_idx" ON "NewsletterSubscriber"("isActive", "createdAt");
