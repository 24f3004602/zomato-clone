import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const addressSchema = z.object({ label: z.string().trim().min(1).max(40), line: z.string().trim().min(8).max(240) });

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = addressSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid address", details: parsed.error.flatten() }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ data: { id: `dev_address_${Date.now()}`, userId: user.id, ...parsed.data } }, { status: 201 });
  const address = await prisma.address.create({ data: { userId: user.id, ...parsed.data } });
  return NextResponse.json({ data: address }, { status: 201 });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ data: [] });
  return NextResponse.json({ data: await prisma.address.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }) });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Address id is required" }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ data: { deleted: true } });
  const result = await prisma.address.deleteMany({ where: { id, userId: user.id } });
  if (!result.count) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  return NextResponse.json({ data: { deleted: true } });
}
