import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { validateCartItems } from "@/lib/cart/validation";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

const cartValidationSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.coerce.number().int().positive().max(99)
    })
  ).min(1).max(60),
  couponCode: z.string().trim().max(64).optional(),
  shippingOptionId: z.string().trim().max(64).optional(),
  shippingPostalCode: z.string().trim().max(12).optional()
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);
    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 60,
      name: "cart-validate"
    });

    if (sameOriginError ?? rateLimitError) {
      return (sameOriginError ?? rateLimitError) as NextResponse;
    }

    const body: unknown = await request.json();
    const parsedBody = cartValidationSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ message: "Revise os itens do carrinho." }, { status: 400 });
    }

    const session = await auth();
    const validatedCart = await validateCartItems({
      ...parsedBody.data,
      userId: session?.user?.id
    });

    return NextResponse.json(validatedCart);
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Não foi possível validar o carrinho." },
      { status: 500 }
    );
  }
}
