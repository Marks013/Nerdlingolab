import { SupportTicketStatus } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { supportReopenSchema } from "@/lib/support/schema";

interface RouteContext {
  params: Promise<{ ticketId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);

    if (sameOriginError) {
      return sameOriginError;
    }

    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 10 * 60 * 1000,
      limit: 5,
      name: "support-reopen"
    });

    if (rateLimitError) {
      return rateLimitError;
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Entre na conta para reabrir o atendimento." }, { status: 401 });
    }

    const { ticketId } = await context.params;
    const parsedBody = supportReopenSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: parsedBody.error.issues[0]?.message ?? "Revise o motivo da reabertura." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findFirst({
      select: {
        id: true,
        ratedAt: true,
        rating: true,
        reopenCount: true,
        status: true
      },
      where: {
        ticketId,
        userId: session.user.id
      }
    });

    if (!ticket) {
      return NextResponse.json({ message: "Protocolo nao encontrado." }, { status: 404 });
    }

    if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return NextResponse.json({ message: "Este protocolo ainda esta em atendimento." }, { status: 409 });
    }

    if (ticket.rating || ticket.ratedAt) {
      return NextResponse.json(
        { message: "Este atendimento ja foi avaliado. Abra um novo protocolo para continuar." },
        { status: 409 }
      );
    }

    if (ticket.reopenCount >= 3) {
      return NextResponse.json(
        { message: "Limite de reaberturas atingido. Abra um novo protocolo para continuar." },
        { status: 409 }
      );
    }

    await prisma.supportTicket.update({
      data: {
        ratedAt: null,
        rating: null,
        ratingComment: null,
        reopenCount: { increment: 1 },
        reopenReason: parsedBody.data.reason,
        reopenedAt: new Date(),
        status: SupportTicketStatus.OPEN
      },
      where: { id: ticket.id }
    });

    return NextResponse.json({ message: "Protocolo reaberto com sucesso.", ok: true });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ message: "Nao foi possivel reabrir o protocolo." }, { status: 500 });
  }
}
