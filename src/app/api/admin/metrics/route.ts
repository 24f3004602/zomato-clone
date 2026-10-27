import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { getMetricSnapshot } from "@/lib/metrics";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return NextResponse.json({ data: getMetricSnapshot(), scope: "process-local", timestamp: new Date().toISOString() });
}
