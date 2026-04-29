ALTER TABLE "SupportTicket"
  ADD COLUMN "emailDeliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "emailProviderError" TEXT;

UPDATE "SupportTicket"
SET "emailDeliveryStatus" = CASE
  WHEN "resendId" IS NULL THEN 'UNKNOWN'
  ELSE 'SENT'
END;
