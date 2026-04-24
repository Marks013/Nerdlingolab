import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

const adminRoles = new Set(["ADMIN", "SUPERADMIN"]);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";

  if (!isAdminRoute || isLoginRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET
  });
  const role = typeof token?.role === "string" ? token.role : null;

  if (!role || !adminRoles.has(role)) {
    const loginUrl = new URL("/admin/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};
