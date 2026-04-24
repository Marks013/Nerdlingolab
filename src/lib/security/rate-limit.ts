import { NextResponse } from "next/server";

interface RateLimitOptions {
  intervalMs: number;
  limit: number;
  name: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

function getClientKey(request: Request, name: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.slice(0, 120) ?? "unknown";

  return `${name}:${forwardedFor ?? realIp ?? "local"}:${userAgent}`;
}

export function isRateLimitedKey(key: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const currentBucket = buckets.get(key);

  if (!currentBucket || currentBucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.intervalMs });
    return false;
  }

  if (currentBucket.count >= options.limit) {
    return true;
  }

  currentBucket.count += 1;
  buckets.set(key, currentBucket);

  return false;
}

export function rateLimitRequest(
  request: Request,
  options: RateLimitOptions
): NextResponse | null {
  const key = getClientKey(request, options.name);

  if (isRateLimitedKey(key, options)) {
    const retryAfterSeconds = Math.max(1, Math.ceil(((buckets.get(key)?.resetAt ?? Date.now()) - Date.now()) / 1000));

    return NextResponse.json(
      { message: "Muitas tentativas. Aguarde um instante e tente novamente." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

  return null;
}
