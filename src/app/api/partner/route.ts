import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentPartner } from "@/lib/auth";
import { partnerRestaurant } from "@/lib/partner";
import { recordAudit } from "@/lib/audit";

const onboardingSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().min(10).max(500) });

export async function GET() {
  const context = await partnerRestaurant();
  if (!context) return NextResponse.json({ error: "Partner access required" }, { status: 403 });
  return NextResponse.json({ data: context });
}

export async function POST(request: Request) {
  const partner = await currentPartner();
  if (!partner) return NextResponse.json({ error: "Partner access required" }, { status: 403 });
  const parsed = onboardingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid restaurant details", details: parsed.error.flatten() }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ error: "Durable partner storage is required" }, { status: 503 });
  const restaurant = await prisma.restaurant.create({ data: { id: `restaurant_${crypto.randomUUID()}`, ownerId: partner.id, rating: 0, reviewCount: 0, deliveryMinutes: 45, deliveryFee: 4900, priceForTwo: 50000, vegetarian: false, ...parsed.data } });
  await recordAudit({ actorId: partner.id, action: "restaurant.created", entityType: "Restaurant", entityId: restaurant.id });
  return NextResponse.json({ data: restaurant }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await partnerRestaurant();
  if (!context) return NextResponse.json({ error: "Partner access required" }, { status: 403 });
  const parsed = z.object({ open: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid restaurant availability" }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ error: "Durable partner storage is required" }, { status: 503 });
  const updated = await prisma.restaurant.updateMany({ where: { id: context.restaurant.id, ...(context.partner.role === "ADMIN" ? {} : { ownerId: context.partner.id }) }, data: parsed.data });
  if (!updated.count) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  await recordAudit({ actorId: context.partner.id, action: parsed.data.open ? "restaurant.opened" : "restaurant.paused", entityType: "Restaurant", entityId: context.restaurant.id, metadata: { open: parsed.data.open } });
  return NextResponse.json({ data: { open: parsed.data.open } });
}
