import { NextResponse, type NextRequest } from "next/server";

import { getEmailBaseUrl } from "@/lib/email/branded-template";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
): Promise<NextResponse> {
  const { deliveryId } = await params;
  const target = resolveSafeTarget(request.nextUrl.searchParams.get("to"));

  if (deliveryId) {
    await prisma.newsletterCampaignDelivery.update({
      where: { id: deliveryId },
      data: {
        campaign: { update: { clickCount: { increment: 1 } } },
        clickedAt: new Date(),
        clickCount: { increment: 1 }
      }
    }).catch(() => null);
  }

  return NextResponse.redirect(target);
}

function resolveSafeTarget(value: string | null): string {
  const baseUrl = getEmailBaseUrl();

  if (!value) {
    return `${baseUrl}/produtos`;
  }

  try {
    const target = new URL(value, baseUrl);
    const base = new URL(baseUrl);

    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return `${baseUrl}/produtos`;
    }

    if (target.origin !== base.origin) {
      return `${baseUrl}/produtos`;
    }

    return target.toString();
  } catch {
    return `${baseUrl}/produtos`;
  }
}
