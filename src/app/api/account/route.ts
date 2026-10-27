import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const profileSchema = z.object({ name: z.string().trim().min(2).max(80) });

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const addresses = process.env.AUTH_PROVIDER === "postgres" ? await prisma.address.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }) : [];
  return NextResponse.json({ data: { user, addresses } });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile", details: parsed.error.flatten() }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ data: { ...user, name: parsed.data.name } });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  return NextResponse.json({ data: updated });
}
