import { NextResponse } from "next/server";
import { createOrderSchema, priceOrder } from "@/lib/orders";
import { getOrderRepository } from "@/lib/order-repository";
import { currentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 120) {
    return NextResponse.json({ error: "A valid Idempotency-Key header is required" }, { status: 400 });
  }
  let repository;
  try {
    repository = getOrderRepository();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Order storage is unavailable" }, { status: 503 });
  }
  const existing = await repository.findByIdempotencyKey(idempotencyKey);
  if (existing) return NextResponse.json({ data: existing }, { status: 200 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid order details", details: parsed.error.flatten() }, { status: 400 });
  try {
    const priced = process.env.ORDER_STORE === "postgres" ? undefined : priceOrder(parsed.data);
    const order = await repository.create({ userId: user.id, idempotencyKey, data: parsed.data, priced });
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create order" }, { status: 409 });
  }
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    return NextResponse.json({ data: await getOrderRepository().listForUser(user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load order history" }, { status: 503 });
  }
}
