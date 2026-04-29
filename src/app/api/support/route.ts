import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { sendSupportEmail } from "@/lib/support/send-support-email";
import { supportRequestSchema, supportSubjectLabels } from "@/lib/support/schema";

export async function GET(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ tickets: [] });
  }

  const tickets = await prisma.supportTicket.findMany({
    include: {
      replies: {
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          deliveryStatus: true,
          id: true,
          message: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    where: { userId: session.user.id }
  });

  return NextResponse.json({
    tickets: tickets.map((ticket) => ({
      createdAt: ticket.createdAt.toISOString(),
      id: ticket.id,
      message: ticket.message,
      replies: ticket.replies.map((reply) => ({
        createdAt: reply.createdAt.toISOString(),
        deliveryStatus: reply.deliveryStatus,
        id: reply.id,
        message: reply.message
      })),
      status: ticket.status,
      subjectLabel: ticket.subjectLabel,
      ticketId: ticket.ticketId,
      updatedAt: ticket.updatedAt.toISOString()
    }))
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);

    if (sameOriginError) {
      return sameOriginError;
    }

    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 10 * 60 * 1000,
      limit: 5,
      name: "support"
    });

    if (rateLimitError) {
      return rateLimitError;
    }

    const parsedBody = supportRequestSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: parsedBody.error.issues[0]?.message ?? "Revise os dados do contato." },
        { status: 400 }
      );
    }

    const [result, session] = await Promise.all([
      sendSupportEmail(parsedBody.data),
      auth()
    ]);

    await prisma.supportTicket.create({
      data: {
        email: parsedBody.data.email,
        message: parsedBody.data.message,
        name: parsedBody.data.name,
        phone: parsedBody.data.phone || null,
        subject: parsedBody.data.subject,
        subjectLabel: supportSubjectLabels[parsedBody.data.subject],
        ticketId: result.ticketId,
        userId: session?.user?.id
      }
    });

    return NextResponse.json({
      message: "Mensagem enviada com sucesso.",
      subject: parsedBody.data.subject,
      ticketId: result.ticketId
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Nao foi possivel enviar sua mensagem agora." },
      { status: 503 }
    );
  }
}
