import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

import { shouldUseSecureAuthCookies } from "@/lib/auth-cookies";

const adminRoles = new Set(["ADMIN", "SUPERADMIN"]);
const maintenanceBypassHeader = "x-nerdlingolab-maintenance-bypass";
const maintenanceBypassCookie = "nerdlingolab_maintenance_bypass";
const maintenanceBypassQuery = "maintenance_bypass";
const maintenanceAllowedPrefixes = [
  "/admin",
  "/api/auth",
  "/api/health",
  "/api/media",
  "/api/webhooks/mercadopago",
  "/brand-assets",
  "/favicon.ico",
  "/manutencao",
  "/robots.txt",
  "/sitemap.xml"
];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";
  const maintenanceResponse = handleMaintenanceMode(request);

  if (maintenanceResponse) {
    return maintenanceResponse;
  }

  if (!isAdminRoute || isLoginRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: shouldUseSecureAuthCookies()
  });
  const role = typeof token?.role === "string" ? token.role : null;

  if (!role || !adminRoles.has(role)) {
    const loginUrl = new URL("/admin/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webp|xml)$).*)"
  ]
};

function handleMaintenanceMode(request: NextRequest): NextResponse | null {
  if (!isMaintenanceModeEnabled() || isMaintenanceAllowedPath(request.nextUrl.pathname)) {
    return null;
  }

  const bypassToken = process.env.MAINTENANCE_BYPASS_TOKEN?.trim();

  if (hasValidMaintenanceBypass(request, bypassToken)) {
    const response = NextResponse.next();
    setMaintenanceBypassCookie(response, bypassToken);
    return response;
  }

  const maintenanceUrl = new URL("/manutencao", request.url);
  maintenanceUrl.searchParams.set("from", request.nextUrl.pathname);

  return NextResponse.rewrite(maintenanceUrl, {
    status: 503,
    headers: {
      "cache-control": "no-store, max-age=0",
      "retry-after": process.env.MAINTENANCE_RETRY_AFTER_SECONDS?.trim() || "900",
      "x-nerdlingolab-maintenance": "1"
    }
  });
}

function isMaintenanceModeEnabled(): boolean {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on";
}

function isMaintenanceAllowedPath(pathname: string): boolean {
  return maintenanceAllowedPrefixes.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));
}

function hasValidMaintenanceBypass(request: NextRequest, bypassToken?: string): boolean {
  if (!bypassToken) {
    return false;
  }

  const headerToken = request.headers.get(maintenanceBypassHeader)?.trim();
  const queryToken = request.nextUrl.searchParams.get(maintenanceBypassQuery)?.trim();
  const cookieToken = request.cookies.get(maintenanceBypassCookie)?.value?.trim();

  return headerToken === bypassToken || queryToken === bypassToken || cookieToken === bypassToken;
}

function setMaintenanceBypassCookie(response: NextResponse, bypassToken?: string): void {
  if (!bypassToken) {
    return;
  }

  response.cookies.set(maintenanceBypassCookie, bypassToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 6,
    sameSite: "lax",
    secure: shouldUseSecureAuthCookies()
  });
}
