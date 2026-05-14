import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getPrismaErrorCode, isPrismaSchemaDriftError } from "@/lib/prisma-errors";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail valido.").max(160),
  website: z.string().trim().max(0).optional()
});

export async function POST(request: Request): Promise<NextResponse> {
  const sameOriginError = assertSameOriginRequest(request);

  if (sameOriginError) {
    return sameOriginError;
  }

  const rateLimitError = rateLimitRequest(request, {
    intervalMs: 10 * 60 * 1000,
    limit: 8,
    name: "newsletter"
  });

  if (rateLimitError) {
    return rateLimitError;
  }

  const payload = await readJsonBody(request);
  const parsedInput = newsletterSchema.safeParse(payload);

  if (!parsedInput.success) {
    return NextResponse.json(
      { message: parsedInput.error.issues[0]?.message ?? "Informe um e-mail valido.", ok: false },
      { status: 400 }
    );
  }

  const email = parsedInput.data.email;

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        source: "footer"
      },
      update: {
        isActive: true,
        source: "footer",
        unsubscribedAt: null
      }
    });
  } catch (error) {
    if (!isPrismaSchemaDriftError(error, "NewsletterSubscriber")) {
      Sentry.captureException(error, {
        extra: {
          emailDomain: email.split("@")[1] ?? null,
          prismaCode: getPrismaErrorCode(error)
        },
        tags: {
          feature: "newsletter",
          operation: "subscribe-api"
        }
      });
    }

    return NextResponse.json(
      { message: getNewsletterFailureMessage(error), ok: false },
      { status: 503 }
    );
  }

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/dashboard");

  return NextResponse.json({ message: "Inscricao confirmada.", ok: true });
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getNewsletterFailureMessage(error: unknown): string {
  if (isPrismaSchemaDriftError(error, "NewsletterSubscriber")) {
    return "A newsletter esta aguardando atualizacao do banco. Tente novamente em instantes.";
  }

  return "Nao foi possivel confirmar sua inscricao agora. Tente novamente em instantes.";
}
