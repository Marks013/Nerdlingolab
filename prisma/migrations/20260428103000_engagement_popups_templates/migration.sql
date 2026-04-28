CREATE TABLE "MarketingPopup" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "eyebrow" TEXT,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "imageUrl" TEXT,
  "placement" TEXT NOT NULL DEFAULT 'GLOBAL',
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "triggerType" TEXT NOT NULL DEFAULT 'DELAY',
  "triggerValue" INTEGER NOT NULL DEFAULT 1200,
  "frequencyHours" INTEGER NOT NULL DEFAULT 24,
  "themeTone" TEXT NOT NULL DEFAULT 'ORANGE',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketingPopup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "body" TEXT NOT NULL,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "cooldownHours" INTEGER NOT NULL DEFAULT 24,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingPopup_isActive_placement_priority_idx" ON "MarketingPopup"("isActive", "placement", "priority");
CREATE INDEX "MarketingPopup_startsAt_endsAt_idx" ON "MarketingPopup"("startsAt", "endsAt");
CREATE UNIQUE INDEX "NotificationTemplate_templateKey_key" ON "NotificationTemplate"("templateKey");
