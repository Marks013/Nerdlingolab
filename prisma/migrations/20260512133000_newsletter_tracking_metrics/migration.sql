ALTER TABLE "NewsletterCampaign"
ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "NewsletterCampaignDelivery"
ADD COLUMN "openedAt" TIMESTAMP(3),
ADD COLUMN "clickedAt" TIMESTAMP(3),
ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "NewsletterCampaignDelivery_openedAt_idx" ON "NewsletterCampaignDelivery"("openedAt");
CREATE INDEX "NewsletterCampaignDelivery_clickedAt_idx" ON "NewsletterCampaignDelivery"("clickedAt");
