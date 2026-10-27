import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter (for single-instance deployment)
// For multi-instance, use Redis-based rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

function getRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Reset window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count++;
  return false;
}

export function rateLimitMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const clientIp = getClientIp(request);

  // Define rate limit rules: [path, limit, windowMs, keyPrefix]
  const rules: Array<[string | RegExp, number, number, string]> = [
    ["/api/auth/request-otp", 5, 60 * 60 * 1000, "otp"], // 5 OTPs per IP per hour
    ["/api/auth/verify-otp", 10, 15 * 60 * 1000, "verify"], // 10 verifications per IP per 15 min
    ["/api/orders", 10, 60 * 60 * 1000, "orders"], // 10 order requests per user per hour
  ];

  for (const [pathPattern, limit, windowMs, keyPrefix] of rules) {
    const matches = typeof pathPattern === "string" ? pathname === pathPattern : pathPattern.test(pathname);

    if (matches) {
      // For OTP requests, rate limit by IP
      // For orders, rate limit by user ID (if authenticated)
      let limitKey: string;

      if (keyPrefix === "orders") {
        // Try to get user ID from session cookie
        const sessionCookie = request.cookies.get("tabletrail_session")?.value;
        limitKey = getRateLimitKey(keyPrefix, sessionCookie || clientIp);
      } else {
        limitKey = getRateLimitKey(keyPrefix, clientIp);
      }

      if (isRateLimited(limitKey, limit, windowMs)) {
        return NextResponse.json(
          {
            error: "Too many requests. Please try again later.",
            retryAfter: Math.ceil(windowMs / 1000),
          },
          { status: 429, headers: { "Retry-After": Math.ceil(windowMs / 1000).toString() } }
        );
      }
    }
  }

  return null; // Continue to next middleware
}

// Cleanup old entries every 5 minutes (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);
