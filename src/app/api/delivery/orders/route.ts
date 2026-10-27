import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentDelivery } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { publishOrderEvent } from "@/lib/realtime";
import { incrementMetric, recordTiming } from "@/lib/metrics";

const updateSchema = z.object({ orderId: z.string().min(1), action: z.enum(["CLAIM", "PICKUP", "DELIVER"]) });

export async function GET() {
  const delivery = await currentDelivery();
  if (!delivery) return NextResponse.json({ error: "Delivery access required" }, { status: 403 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ error: "Durable delivery storage is required" }, { status: 503 });
  const orders = await prisma.order.findMany({
    where: delivery.role === "ADMIN"
      ? { status: { in: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } }
      : { OR: [{ status: "READY_FOR_PICKUP", deliveryPartnerId: null }, { status: "OUT_FOR_DELIVERY", deliveryPartnerId: delivery.id }] },
    include: { restaurant: true, address: true, items: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: orders });
}

export async function PATCH(request: Request) {
  const delivery = await currentDelivery();
  if (!delivery) return NextResponse.json({ error: "Delivery access required" }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid delivery action", details: parsed.error.flatten() }, { status: 400 });
  if (process.env.AUTH_PROVIDER !== "postgres") return NextResponse.json({ error: "Durable delivery storage is required" }, { status: 503 });
  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const now = new Date();
  if (parsed.data.action === "CLAIM") {
    if (order.status !== "READY_FOR_PICKUP" || order.deliveryPartnerId) return NextResponse.json({ error: "Order is no longer available to claim" }, { status: 409 });
    const updated = await prisma.order.updateMany({ where: { id: order.id, status: "READY_FOR_PICKUP", deliveryPartnerId: null }, data: { deliveryPartnerId: delivery.id, assignedAt: now } });
    if (!updated.count) return NextResponse.json({ error: "Order is no longer available to claim" }, { status: 409 });
    await recordAudit({ actorId: delivery.id, action: "delivery.claimed", entityType: "Order", entityId: order.id });
    incrementMetric("orders.delivery.claim.success");
    await publishOrderEvent(`delivery:${delivery.id}`, { orderId: order.id, status: "READY_FOR_PICKUP", deliveryPartnerId: delivery.id });
    return NextResponse.json({ data: { id: order.id, status: "READY_FOR_PICKUP", deliveryPartnerId: delivery.id } });
  }
  if (order.deliveryPartnerId !== delivery.id && delivery.role !== "ADMIN") return NextResponse.json({ error: "Order is assigned to another delivery partner" }, { status: 403 });
  if (parsed.data.action === "PICKUP") {
    if (order.status !== "READY_FOR_PICKUP") return NextResponse.json({ error: "Order must be ready for pickup" }, { status: 409 });
    const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "OUT_FOR_DELIVERY", pickedUpAt: now } });
    await recordAudit({ actorId: delivery.id, action: "delivery.picked_up", entityType: "Order", entityId: order.id });
    incrementMetric("orders.delivery.pickup.success");
    await publishOrderEvent(`partner`, { orderId: order.id, status: updated.status, deliveryPartnerId: delivery.id });
    await publishOrderEvent(`delivery:${delivery.id}`, { orderId: order.id, status: updated.status, deliveryPartnerId: delivery.id });
    return NextResponse.json({ data: updated });
  }
  if (order.status !== "OUT_FOR_DELIVERY") return NextResponse.json({ error: "Order must be out for delivery" }, { status: 409 });
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED", deliveredAt: now } });
  await recordAudit({ actorId: delivery.id, action: "delivery.delivered", entityType: "Order", entityId: order.id });
  incrementMetric("orders.delivery.delivered.success");
  recordTiming("orders.delivery.fulfillment_ms", now.getTime() - order.createdAt.getTime());
  await publishOrderEvent(`partner`, { orderId: order.id, status: updated.status, deliveryPartnerId: delivery.id });
  await publishOrderEvent(`delivery:${delivery.id}`, { orderId: order.id, status: updated.status, deliveryPartnerId: delivery.id });
  return NextResponse.json({ data: updated });
}
