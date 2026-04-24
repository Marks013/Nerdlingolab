import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

const adminRoles = new Set<UserRole>([UserRole.ADMIN, UserRole.SUPERADMIN]);

export async function requireAdmin(): Promise<void> {
  const session = await auth();
  const role = session?.user?.role;

  if (!role || !adminRoles.has(role)) {
    redirect("/admin/login");
  }
}

export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  const role = session?.user?.role;

  return Boolean(role && adminRoles.has(role));
}
