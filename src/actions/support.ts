"use server";

import { SupportTicketStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSupportReplyEmail } from "@/lib/support/send-support-email";

const replySchema = z.object({
  message: z.string().trim().min(10, "Escreva uma resposta com pelo menos 10 caracteres.").max(5000),
  ticketId: z.string().min(1)
});

export async function replySupportTicket(formData: FormData): Promise<void> {
  await requireAdmin();
  const session = await auth();
  const parsedInput = replySchema.parse({
    message: formData.get("message"),
    ticketId: formData.get("ticketId")
  });

  const ticket = await prisma.supportTicket.findUnique({
    include: {
      replies: {
        include: {
          adminUser: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    },
    where: { id: parsedInput.ticketId }
  });

  if (!ticket) {
    throw new Error("Chamado não encontrado.");
  }

  if (ticket.status === SupportTicketStatus.CLOSED) {
    throw new Error("Reabra o chamado antes de responder.");
  }

  const reply = await prisma.supportTicketReply.create({
    data: {
      adminUserId: session?.user?.id || null,
      message: parsedInput.message,
      ticketId: ticket.id
    }
  });

  const result = await sendSupportReplyEmail({
    adminName: session?.user?.name ?? session?.user?.email ?? "Equipe NerdLingoLab",
    contactEmail: ticket.email,
    contactName: ticket.name,
    originalMessage: ticket.message,
    replyMessage: parsedInput.message,
    subjectLabel: ticket.subjectLabel,
    ticketId: ticket.ticketId
  });

  await prisma.$transaction([
    prisma.supportTicketReply.update({
      data: {
        deliveryStatus: result.ok ? "SENT" : "FAILED",
        providerError: result.error ?? null,
        providerMessageId: result.providerMessageId ?? null
      },
      where: { id: reply.id }
    }),
    prisma.supportTicket.update({
      data: { status: SupportTicketStatus.IN_PROGRESS },
      where: { id: ticket.id }
    })
  ]);

  revalidateSupport();
}

export async function updateSupportTicketStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedInput = z.object({
    status: z.nativeEnum(SupportTicketStatus),
    ticketId: z.string().min(1)
  }).parse({
    status: formData.get("status"),
    ticketId: formData.get("ticketId")
  });

  await prisma.supportTicket.update({
    data: { status: parsedInput.status },
    where: { id: parsedInput.ticketId }
  });

  revalidateSupport();
}

function revalidateSupport(): void {
  revalidatePath("/admin/suporte");
  revalidatePath("/suporte");
}
