import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentPartner } from "@/lib/auth";
import { nextOrderStatus, partnerOrderQueue } from "@/lib/partner";
import { recordAudit } from "@/lib/audit";
import { publishOrderEvent } from "@/lib/realtime";
import { incrementMetric } from "@/lib/metrics";

const updateSchema = z.object({ orderId: z.string().min(1), status: z.enum(["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"]) });

export async function GET() {
  const context = await partnerOrderQueue();
  if (!context) return NextResponse.json({ error: "Partner access required" }, { status: 403 });
  return NextResponse.json({ data: context.orders });
}

export async function PATCH(request: Request) {
  const partner = await currentPartner();
  const context = await partnerOrderQueue();
  if (!partner || !context) return NextResponse.json({ error: "Partner access required" }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid order transition", details: parsed.error.flatten() }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ error: "Durable partner storage is required" }, { status: 503 });
  const order = await prisma.order.findFirst({ where: { id: parsed.data.orderId, restaurantId: context.restaurant.id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (nextOrderStatus(order.status) !== parsed.data.status) return NextResponse.json({ error: `Cannot move ${order.status} to ${parsed.data.status}` }, { status: 409 });
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: parsed.data.status } });
  incrementMetric("orders.partner_transition.success");
  await recordAudit({ actorId: partner.id, action: "order.status_changed", entityType: "Order", entityId: order.id, metadata: { from: order.status, to: parsed.data.status } });
  await publishOrderEvent("partner", { orderId: order.id, status: updated.status, restaurantId: order.restaurantId });
  return NextResponse.json({ data: updated });
}
