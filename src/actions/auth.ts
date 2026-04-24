"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth";
import { isRateLimitedKey } from "@/lib/security/rate-limit";

export async function signInWithCredentials(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 120) ?? "unknown";
  const loginKey = `admin-login:${forwardedFor ?? realIp ?? "local"}:${userAgent}:${email.toLowerCase()}`;

  if (
    isRateLimitedKey(loginKey, {
      intervalMs: 15 * 60 * 1000,
      limit: 8,
      name: "admin-login"
    })
  ) {
    redirect("/admin/login?error=too_many_attempts");
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/admin/dashboard"
  });
}

export async function signOutFromAdmin(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
