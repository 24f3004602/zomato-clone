import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { partnerRestaurant } from "@/lib/partner";
import { recordAudit } from "@/lib/audit";
import { toMinorUnits } from "@/lib/money";

const itemSchema = z.object({ category: z.string().trim().min(1).max(60), name: z.string().trim().min(2).max(120), description: z.string().trim().min(5).max(400), price: z.number().int().positive().max(100000), vegetarian: z.boolean() });

export async function POST(request: Request) {
  const context = await partnerRestaurant();
  if (!context) return NextResponse.json({ error: "Partner access required" }, { status: 403 });
  const parsed = itemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid menu item", details: parsed.error.flatten() }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ error: "Durable partner storage is required" }, { status: 503 });
  const item = await prisma.menuItem.create({ data: { id: `item_${crypto.randomUUID()}`, restaurantId: context.restaurant.id, ...parsed.data, price: toMinorUnits(parsed.data.price) } });
  await recordAudit({ actorId: context.partner.id, action: "menu_item.created", entityType: "MenuItem", entityId: item.id, metadata: { restaurantId: context.restaurant.id, price: item.price } });
  return NextResponse.json({ data: item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await partnerRestaurant();
  if (!context) return NextResponse.json({ error: "Partner access required" }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1), available: z.boolean().optional(), price: z.number().int().positive().max(100000).optional() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid menu update", details: parsed.error.flatten() }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ error: "Durable partner storage is required" }, { status: 503 });
  const item = await prisma.menuItem.updateMany({ where: { id: parsed.data.id, restaurantId: context.restaurant.id }, data: { available: parsed.data.available, price: parsed.data.price === undefined ? undefined : toMinorUnits(parsed.data.price) } });
  if (!item.count) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  await recordAudit({ actorId: context.partner.id, action: "menu_item.updated", entityType: "MenuItem", entityId: parsed.data.id, metadata: { available: parsed.data.available ?? null, price: parsed.data.price ?? null } });
  return NextResponse.json({ data: { updated: true } });
}
