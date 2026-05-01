import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  defaultFreeShippingThresholdCents,
  quoteDefaultManualShippingOptions,
  quoteManualShippingOptions,
  quoteShippingOptions
} from "@/lib/shipping/quotes";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";
import { getStorefrontTheme } from "@/lib/theme/storefront";

const shippingQuoteSchema = z.object({
  itemCount: z.coerce.number().int().positive().max(99).default(1),
  items: z.array(z.object({
    heightCm: z.number().int().min(0).nullable().optional(),
    id: z.string().trim().min(1).max(120),
    lengthCm: z.number().int().min(0).nullable().optional(),
    quantity: z.number().int().positive().max(99),
    shippingLeadTimeDays: z.number().int().min(0).max(90).nullable().optional(),
    unitPriceCents: z.number().int().min(0).max(1_000_000),
    weightGrams: z.number().int().min(0).nullable().optional(),
    widthCm: z.number().int().min(0).nullable().optional()
  })).max(99).optional(),
  postalCode: z.string()
    .trim()
    .min(8)
    .max(12)
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 8, "CEP inválido."),
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

    let freeShippingThresholdCents = defaultFreeShippingThresholdCents;

    try {
      const theme = await getStorefrontTheme();
      freeShippingThresholdCents = theme.freeShippingThresholdCents;
    } catch (error) {
      captureException(error);
    }

    let options = await quoteShippingOptions({
      ...parsedBody.data,
      freeShippingThresholdCents
    }).catch(async (error: unknown) => {
      captureException(error);

      try {
        return await quoteManualShippingOptions({
          ...parsedBody.data,
          freeShippingThresholdCents
        });
      } catch (fallbackError) {
        captureException(fallbackError);

        return quoteDefaultManualShippingOptions({
          ...parsedBody.data,
          freeShippingThresholdCents
        });
      }
    });

    if (options.length === 0) {
      options = quoteDefaultManualShippingOptions({
        ...parsedBody.data,
        freeShippingThresholdCents
      });
    }

    return NextResponse.json({
      freeShippingThresholdCents,
      options
    });
  } catch (error) {
    captureException(error);

    return NextResponse.json({ message: "Não foi possível calcular o frete." }, { status: 500 });
  }
}

function captureException(error: unknown): void {
  try {
    Sentry.captureException(error);
  } catch {
    // Observability must never block checkout shipping quotes.
  }
}
