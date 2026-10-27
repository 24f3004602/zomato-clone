import { NextResponse } from "next/server";
import { getHealthChecks } from "@/lib/health";

export async function GET() {
  const health = await getHealthChecks(false);
  return NextResponse.json({ ...health, timestamp: new Date().toISOString() });
}
