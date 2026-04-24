import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { checkoutRequestSchema } from "@/features/checkout/schemas";
import { auth } from "@/lib/auth";
import { createCheckout } from "@/lib/checkout/create-checkout";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);
    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 12,
      name: "checkout"
    });

    if (sameOriginError ?? rateLimitError) {
      return (sameOriginError ?? rateLimitError) as NextResponse;
    }

    const body: unknown = await request.json();
    const parsedBody = checkoutRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ message: "Revise os dados de entrega." }, { status: 400 });
    }

    const session = await auth();
    const checkout = await createCheckout({
      ...parsedBody.data,
      userId: session?.user?.id
    });

    return NextResponse.json(checkout);
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      {
        message: "Não foi possível iniciar o checkout. Revise o carrinho e tente novamente."
      },
      { status: 500 }
    );
  }
}
