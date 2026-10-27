import { NextResponse } from "next/server";
import { getHealthChecks } from "@/lib/health";

export async function GET() {
  const health = await getHealthChecks(true);
  return NextResponse.json({ ...health, timestamp: new Date().toISOString() }, { status: health.status === "ok" ? 200 : 503 });
}
