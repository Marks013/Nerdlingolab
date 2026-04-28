export function shouldUseSecureAuthCookies(): boolean {
  const publicUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!publicUrl) {
    return process.env.NODE_ENV === "production";
  }

  try {
    return new URL(publicUrl).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}
