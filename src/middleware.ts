import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { rateLimitMiddleware } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  // Apply rate limiting first
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  if (process.env.NODE_ENV === "production") {
    logger.info("request.completed", {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get("user-agent")?.slice(0, 200),
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
