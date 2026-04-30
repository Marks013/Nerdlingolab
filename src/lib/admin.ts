import { UserRole } from "@/generated/prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

const adminRoles = new Set<UserRole>([UserRole.ADMIN, UserRole.SUPERADMIN]);

export async function requireAdmin(fallbackPath = "/admin/dashboard"): Promise<void> {
  const session = await auth();
  const role = session?.user?.role;

  if (!role || !adminRoles.has(role)) {
    const requestHeaders = await headers();
    const currentPath = requestHeaders.get("x-current-path") ?? fallbackPath;

    redirect(`/admin/login?callbackUrl=${encodeURIComponent(sanitizeAdminCallbackUrl(currentPath))}`);
  }
}

export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  const role = session?.user?.role;

  return Boolean(role && adminRoles.has(role));
}

export function sanitizeAdminCallbackUrl(value: string | null | undefined): string {
  if (!value) {
    return "/admin";
  }

  if (!value.startsWith("/admin") || value.startsWith("/admin/login") || value.includes("://")) {
    return "/admin";
  }

  return value;
}
