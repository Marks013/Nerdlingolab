-- Add support replies so admin answers stay attached to each customer ticket.
CREATE TABLE "SupportTicketReply" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "adminUserId" TEXT,
  "message" TEXT NOT NULL,
  "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "providerMessageId" TEXT,
  "providerError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupportTicketReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicketReply_ticketId_createdAt_idx" ON "SupportTicketReply"("ticketId", "createdAt");
CREATE INDEX "SupportTicketReply_adminUserId_idx" ON "SupportTicketReply"("adminUserId");

ALTER TABLE "SupportTicketReply"
ADD CONSTRAINT "SupportTicketReply_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketReply"
ADD CONSTRAINT "SupportTicketReply_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
