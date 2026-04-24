import { NextResponse } from "next/server";

export function assertSameOriginRequest(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return null;
  }

  try {
    const originUrl = new URL(origin);

    if (originUrl.host === host) {
      return null;
    }
  } catch {
    return NextResponse.json({ message: "Solicitação inválida." }, { status: 400 });
  }

  return NextResponse.json({ message: "Solicitação inválida." }, { status: 403 });
}
