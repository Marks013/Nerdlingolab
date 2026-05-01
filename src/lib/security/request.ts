import { NextResponse } from "next/server";

export function assertSameOriginRequest(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) {
    return NextResponse.json({ message: "Solicitação inválida." }, { status: 400 });
  }

  try {
    const requestOrigin = origin ?? referer;

    if (!requestOrigin) {
      return NextResponse.json({ message: "Solicitação inválida." }, { status: 403 });
    }

    const originUrl = new URL(requestOrigin);
    const allowedHosts = new Set([
      host,
      getConfiguredHost(process.env.APP_URL),
      getConfiguredHost(process.env.AUTH_URL),
      getConfiguredHost(process.env.NEXTAUTH_URL)
    ].filter((value): value is string => Boolean(value)));

    if (allowedHosts.has(originUrl.host)) {
      return null;
    }
  } catch {
    return NextResponse.json({ message: "Solicitação inválida." }, { status: 400 });
  }

  return NextResponse.json({ message: "Solicitação inválida." }, { status: 403 });
}

function getConfiguredHost(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
