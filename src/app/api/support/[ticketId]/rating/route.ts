import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { supportRatingSchema } from "@/lib/support/schema";

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
      limit: 8,
      name: "support-rating"
    });

    if (rateLimitError) {
      return rateLimitError;
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Entre na conta para avaliar o atendimento." }, { status: 401 });
    }

    const { ticketId } = await context.params;
    const parsedBody = supportRatingSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: parsedBody.error.issues[0]?.message ?? "Revise a avaliacao." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findFirst({
      select: {
        id: true,
        replies: { select: { id: true }, take: 1 }
      },
      where: {
        ticketId,
        userId: session.user.id
      }
    });

    if (!ticket) {
      return NextResponse.json({ message: "Protocolo nao encontrado." }, { status: 404 });
    }

    if (ticket.replies.length === 0) {
      return NextResponse.json({ message: "Avalie depois que a equipe responder." }, { status: 409 });
    }

    await prisma.supportTicket.update({
      data: {
        ratedAt: new Date(),
        rating: parsedBody.data.rating,
        ratingComment: parsedBody.data.comment || null
      },
      where: { id: ticket.id }
    });

    return NextResponse.json({ message: "Obrigado pela avaliacao.", ok: true });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ message: "Nao foi possivel registrar a avaliacao." }, { status: 500 });
  }
}
