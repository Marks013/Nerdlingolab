CREATE TABLE "StorefrontTheme" (
    "id" TEXT NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'Tema principal',
    "heroSlides" JSONB NOT NULL DEFAULT '[]',
    "promoSlides" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorefrontTheme_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorefrontTheme_singletonKey_key" ON "StorefrontTheme"("singletonKey");
