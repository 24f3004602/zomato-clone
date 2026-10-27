import { describe, expect, it, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { closeRealtimePublisher, publishOrderEvent, subscribeToOrderEvents } from "../../src/lib/realtime";

const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
const describeIntegration = enabled ? describe : describe.skip;
const prisma = new PrismaClient();

describeIntegration("PostgreSQL and Redis runtime", () => {
  it("has an applied migration history", async () => {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`;
    expect(Number(rows[0].count)).toBeGreaterThan(0);
  });

  it("allows exactly one of twenty concurrent delivery claims", async () => {
    const suffix = Date.now().toString();
    const users = await Promise.all(Array.from({ length: 20 }, (_, index) => prisma.user.create({ data: { id: `integration_delivery_${suffix}_${index}`, name: "Integration delivery", role: "DELIVERY" } })));
    const restaurant = await prisma.restaurant.create({ data: { id: `integration_restaurant_${suffix}`, name: "Integration restaurant", description: "Integration fixture", rating: 0, deliveryMinutes: 20, deliveryFee: 0, priceForTwo: 0 } });
    const order = await prisma.order.create({ data: { id: `integration_order_${suffix}`, restaurantId: restaurant.id, status: "READY_FOR_PICKUP", subtotal: 100, deliveryFee: 0, serviceFee: 0, total: 100 } });
    const claims = await Promise.all(Array.from({ length: 20 }, (_, index) => prisma.order.updateMany({
      where: { id: order.id, status: "READY_FOR_PICKUP", deliveryPartnerId: null },
      data: { deliveryPartnerId: users[index].id },
    })));
    expect(claims.filter((claim) => claim.count === 1)).toHaveLength(1);
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.restaurant.delete({ where: { id: restaurant.id } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  });

  it("delivers an event after subscription and supports cleanup", async () => {
    const scope = `integration-${Date.now()}`;
    let resolveEvent: (event: { orderId: string }) => void = () => undefined;
    const received = new Promise<{ orderId: string }>((resolve) => { resolveEvent = resolve; });
    const close = await subscribeToOrderEvents(scope, resolveEvent);
    expect(close).not.toBeNull();
    await publishOrderEvent(scope, { orderId: "integration-order", status: "READY_FOR_PICKUP" });
    await expect(received).resolves.toMatchObject({ orderId: "integration-order" });
    await close!();
  });

  it("degrades when Redis is unavailable", async () => {
    const previous = process.env.REDIS_URL;
    await closeRealtimePublisher();
    process.env.REDIS_URL = "redis://127.0.0.1:6399";
    await expect(publishOrderEvent("integration-outage", { orderId: "outage", status: "READY_FOR_PICKUP" })).resolves.toBeUndefined();
    if (previous === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous;
  });
});

afterAll(async () => {
  await closeRealtimePublisher();
  await prisma.$disconnect();
});
