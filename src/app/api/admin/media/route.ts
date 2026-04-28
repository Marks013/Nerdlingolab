import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

export async function GET(request: Request): Promise<NextResponse> {
  const sameOriginError = assertSameOriginRequest(request);
  const rateLimitError = rateLimitRequest(request, {
    intervalMs: 60_000,
    limit: 80,
    name: "admin-media-list"
  });

  if (sameOriginError ?? rateLimitError) {
    return (sameOriginError ?? rateLimitError) as NextResponse;
  }

  if (!(await isAdminSession())) {
    return NextResponse.json({ message: "Acesso não autorizado." }, { status: 401 });
  }

  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      altText: true,
      fileName: true,
      id: true,
      mimeType: true,
      url: true
    },
    take: 80,
    where: { deletedAt: null }
  });

  return NextResponse.json({ assets });
}
