import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Integration Tests for Concurrent Delivery Claims
 *
 * REQUIREMENTS:
 * - Set DATABASE_URL environment variable (PostgreSQL connection string)
 * - Docker Compose must be running: docker compose up
 * - Test database must be accessible and migrated
 *
 * Run with: DATABASE_URL=postgresql://user:[REDACTED]@localhost/db npm test
 * Or with docker-compose: docker compose up, then npm test
 */

describe.skipIf(!process.env.DATABASE_URL)("Delivery Claim Integration Tests", () => {
  let testOrder: any;
  let deliveryUsers: any[] = [];

  beforeAll(async () => {
    const restaurant = await prisma.restaurant.upsert({
      where: { id: "test_restaurant_concurrent" },
      update: {},
      create: {
        id: "test_restaurant_concurrent",
        name: "Test Restaurant",
        rating: 4.5,
        reviewCount: 100,
        deliveryMinutes: 30,
        deliveryFee: 5000,
        priceForTwo: 50000,
        open: true,
      },
    });

    const customer = await prisma.user.upsert({
      where: { phone: "+91-test-concurrent-customer" },
      update: {},
      create: {
        phone: "+91-test-concurrent-customer",
        name: "Test Customer",
        role: "CUSTOMER",
      },
    });

    deliveryUsers = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        prisma.user.upsert({
          where: { id: `delivery_concurrent_${i}` },
          update: {},
          create: {
            id: `delivery_concurrent_${i}`,
            phone: `+91-delivery-concurrent-${i}`,
            name: `Delivery Partner ${i}`,
            role: "DELIVERY",
          },
        })
      )
    );

    testOrder = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        userId: customer.id,
        status: "READY_FOR_PICKUP",
        subtotal: 50000,
        deliveryFee: 5000,
        serviceFee: 2500,
        total: 57500,
        currency: "INR",
      },
    });
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { restaurantId: "test_restaurant_concurrent" } });
    await prisma.user.deleteMany({ where: { id: { in: deliveryUsers.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { phone: "+91-test-concurrent-customer" } });
    await prisma.restaurant.deleteMany({ where: { id: "test_restaurant_concurrent" } });
  });

  it("should allow exactly one delivery partner to claim order from 20 concurrent attempts", async () => {
    const claimPromises = deliveryUsers.map((user) =>
      prisma.order.updateMany({
        where: {
          id: testOrder.id,
          deliveryPartnerId: null,
        },
        data: {
          deliveryPartnerId: user.id,
          assignedAt: new Date(),
        },
      })
    );

    const results = await Promise.allSettled(claimPromises);

    const successfulClaims = results.filter((r) => r.status === "fulfilled" && r.value.count === 1);
    expect(successfulClaims).toHaveLength(1);

    const failedClaims = results.filter((r) => r.status === "fulfilled" && r.value.count === 0);
    expect(failedClaims.length).toBe(19);

    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
    expect(updatedOrder?.deliveryPartnerId).toBeDefined();
    expect(updatedOrder?.assignedAt).toBeDefined();
  });

  it("should prevent reassignment once delivery partner claims order", async () => {
    const firstClaim = await prisma.order.updateMany({
      where: {
        id: testOrder.id,
        deliveryPartnerId: null,
      },
      data: {
        deliveryPartnerId: deliveryUsers[0].id,
        assignedAt: new Date(),
      },
    });

    const orderAfterFirst = await prisma.order.findUnique({ where: { id: testOrder.id } });
    const originalAssignee = orderAfterFirst?.deliveryPartnerId;

    const reassignAttempt = await prisma.order.updateMany({
      where: {
        id: testOrder.id,
        deliveryPartnerId: null,
      },
      data: {
        deliveryPartnerId: deliveryUsers[1].id,
      },
    });

    expect(reassignAttempt.count).toBe(0);

    const orderAfterSecond = await prisma.order.findUnique({ where: { id: testOrder.id } });
    expect(orderAfterSecond?.deliveryPartnerId).toBe(originalAssignee);
  });

  it("should isolate concurrent claims across different orders", async () => {
    // Get or create a test user first
    const testUser = await prisma.user.findFirst();
    
    const orders = await Promise.all(
      ["order_1", "order_2"].map(async (id) =>
        prisma.order.upsert({
          where: { id },
          update: {},
          create: {
            id,
            restaurantId: "test_restaurant_concurrent",
            userId: testUser?.id || "dummy",
            status: "READY_FOR_PICKUP",
            subtotal: 50000,
            deliveryFee: 5000,
            serviceFee: 2500,
            total: 57500,
            currency: "INR",
          },
        })
      )
    );

    const [order1Claim, order2Claim] = await Promise.all([
      prisma.order.updateMany({
        where: { id: orders[0].id, deliveryPartnerId: null },
        data: { deliveryPartnerId: deliveryUsers[0].id, assignedAt: new Date() },
      }),
      prisma.order.updateMany({
        where: { id: orders[1].id, deliveryPartnerId: null },
        data: { deliveryPartnerId: deliveryUsers[1].id, assignedAt: new Date() },
      }),
    ]);

    expect(order1Claim.count).toBe(1);
    expect(order2Claim.count).toBe(1);

    const [order1, order2] = await Promise.all([
      prisma.order.findUnique({ where: { id: orders[0].id } }),
      prisma.order.findUnique({ where: { id: orders[1].id } }),
    ]);

    expect(order1?.deliveryPartnerId).toBe(deliveryUsers[0].id);
    expect(order2?.deliveryPartnerId).toBe(deliveryUsers[1].id);

    await prisma.order.deleteMany({ where: { id: { in: [orders[0].id, orders[1].id] } } });
  });
});
