import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const roleSchema = z.object({ userId: z.string().min(1), role: z.enum(["CUSTOMER", "PARTNER", "DELIVERY"]) });

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const users = await prisma.user.findMany({ select: { id: true, name: true, phone: true, role: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ data: users });
}

export async function PATCH(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = roleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid role assignment", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.userId === admin.id) return NextResponse.json({ error: "You cannot change your own admin role" }, { status: 409 });
  const updated = await prisma.user.updateMany({ where: { id: parsed.data.userId }, data: { role: parsed.data.role } });
  if (!updated.count) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await recordAudit({ actorId: admin.id, action: "user.role_assigned", entityType: "User", entityId: parsed.data.userId, metadata: { role: parsed.data.role } });
  return NextResponse.json({ data: { id: parsed.data.userId, role: parsed.data.role } });
}
