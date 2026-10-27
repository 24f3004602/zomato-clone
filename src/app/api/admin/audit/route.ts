import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentAdmin } from "@/lib/auth";

const querySchema = z.object({
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(50).optional(),
});

export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ action: url.searchParams.get("action") || undefined, entityType: url.searchParams.get("entityType") || undefined });
  if (!parsed.success) return NextResponse.json({ error: "Invalid audit filters", details: parsed.error.flatten() }, { status: 400 });
  const logs = await prisma.auditLog.findMany({
    where: {
      action: parsed.data.action ? { contains: parsed.data.action, mode: "insensitive" } : undefined,
      entityType: parsed.data.entityType ? { equals: parsed.data.entityType, mode: "insensitive" } : undefined,
    },
    select: { id: true, actorId: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true, actor: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: logs });
}
