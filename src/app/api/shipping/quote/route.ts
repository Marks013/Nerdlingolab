import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { quoteShippingOptions } from "@/lib/shipping/quotes";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { getStorefrontTheme } from "@/lib/theme/storefront";

const shippingQuoteSchema = z.object({
  itemCount: z.coerce.number().int().positive().max(99).default(1),
  postalCode: z.string().trim().min(8).max(12),
  subtotalCents: z.coerce.number().int().min(0).max(1_000_000)
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);
    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 60,
      name: "shipping-quote"
    });

    if (sameOriginError ?? rateLimitError) {
      return (sameOriginError ?? rateLimitError) as NextResponse;
    }

    const body: unknown = await request.json();
    const parsedBody = shippingQuoteSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ message: "Informe um CEP válido." }, { status: 400 });
    }

    const theme = await getStorefrontTheme();

    return NextResponse.json({
      freeShippingThresholdCents: theme.freeShippingThresholdCents,
        options: await quoteShippingOptions({
          ...parsedBody.data,
          freeShippingThresholdCents: theme.freeShippingThresholdCents
        })
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ message: "Não foi possível calcular o frete." }, { status: 500 });
  }
}
