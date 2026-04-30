import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

const shippingPresetSchema = z.object({
  heightCm: z.coerce.number().int().min(1).max(200),
  lengthCm: z.coerce.number().int().min(1).max(200),
  name: z.string().trim().min(2).max(80),
  shippingLeadTimeDays: z.coerce.number().int().min(0).max(90).optional().default(0),
  weightGrams: z.coerce.number().int().min(1).max(100_000),
  widthCm: z.coerce.number().int().min(1).max(200)
});

export async function POST(request: Request): Promise<NextResponse> {
  const sameOriginError = assertSameOriginRequest(request);
  const rateLimitError = rateLimitRequest(request, {
    intervalMs: 60_000,
    limit: 30,
    name: "admin-product-shipping-preset"
  });

  if (sameOriginError ?? rateLimitError) {
    return (sameOriginError ?? rateLimitError) as NextResponse;
  }

  if (!(await isAdminSession())) {
    return NextResponse.json({ message: "Acesso nao autorizado." }, { status: 401 });
  }

  try {
    const payload: unknown = await request.json();
    const parsedPayload = shippingPresetSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ message: "Informe nome, peso e dimensoes validos." }, { status: 400 });
    }

    const preset = await prisma.productShippingPreset.upsert({
      create: parsedPayload.data,
      update: {
        heightCm: parsedPayload.data.heightCm,
        lengthCm: parsedPayload.data.lengthCm,
        shippingLeadTimeDays: parsedPayload.data.shippingLeadTimeDays,
        weightGrams: parsedPayload.data.weightGrams,
        widthCm: parsedPayload.data.widthCm
      },
      where: { name: parsedPayload.data.name },
      select: {
        heightCm: true,
        id: true,
        lengthCm: true,
        name: true,
        shippingLeadTimeDays: true,
        weightGrams: true,
        widthCm: true
      }
    });

    return NextResponse.json({ preset });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ message: "Nao foi possivel salvar o atalho logistico." }, { status: 500 });
  }
}
