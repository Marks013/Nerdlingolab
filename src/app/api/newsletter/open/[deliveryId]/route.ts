import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

const pixel = Buffer.from("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
): Promise<NextResponse> {
  const { deliveryId } = await params;

  if (deliveryId) {
    await prisma.newsletterCampaignDelivery.update({
      where: { id: deliveryId },
      data: {
        campaign: { update: { openCount: { increment: 1 } } },
        openedAt: new Date(),
        openCount: { increment: 1 }
      }
    }).catch(() => null);
  }

  return new NextResponse(pixel, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "image/gif"
    }
  });
}
