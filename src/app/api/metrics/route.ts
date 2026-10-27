import { timingSafeEqual } from "node:crypto";
import { getPrometheusMetrics } from "@/lib/metrics";

function tokenMatches(request: Request) {
  const expected = process.env.METRICS_TOKEN;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function GET(request: Request) {
  if (!tokenMatches(request)) return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  return new Response(getPrometheusMetrics(), { headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8", "Cache-Control": "no-store" } });
}
