ALTER TABLE "NewsletterSubscriber"
ADD COLUMN "unsubscribeToken" TEXT,
ADD COLUMN "lastSentAt" TIMESTAMP(3),
ADD COLUMN "unsubscribedAt" TIMESTAMP(3);

UPDATE "NewsletterSubscriber"
SET "unsubscribeToken" = id
WHERE "unsubscribeToken" IS NULL;

ALTER TABLE "NewsletterSubscriber"
ALTER COLUMN "unsubscribeToken" SET NOT NULL;

CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");
CREATE INDEX "NewsletterSubscriber_lastSentAt_idx" ON "NewsletterSubscriber"("lastSentAt");

CREATE TABLE "NewsletterCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "eyebrow" TEXT,
  "body" TEXT NOT NULL,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "audience" TEXT NOT NULL DEFAULT 'ACTIVE_SUBSCRIBERS',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsletterCampaignDelivery" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "subscriberId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NewsletterCampaignDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NewsletterCampaign_status_createdAt_idx" ON "NewsletterCampaign"("status", "createdAt");
CREATE INDEX "NewsletterCampaign_sentAt_idx" ON "NewsletterCampaign"("sentAt");
CREATE UNIQUE INDEX "NewsletterCampaignDelivery_campaignId_subscriberId_key" ON "NewsletterCampaignDelivery"("campaignId", "subscriberId");
CREATE INDEX "NewsletterCampaignDelivery_subscriberId_createdAt_idx" ON "NewsletterCampaignDelivery"("subscriberId", "createdAt");
CREATE INDEX "NewsletterCampaignDelivery_status_createdAt_idx" ON "NewsletterCampaignDelivery"("status", "createdAt");

ALTER TABLE "NewsletterCampaignDelivery"
ADD CONSTRAINT "NewsletterCampaignDelivery_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsletterCampaignDelivery"
ADD CONSTRAINT "NewsletterCampaignDelivery_subscriberId_fkey"
FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
