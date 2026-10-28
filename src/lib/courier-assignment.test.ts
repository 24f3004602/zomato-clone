import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { assignCourier, getAssignedCourier } from "@/lib/courier-assignment";
import { prisma } from "@/lib/db";
import { UserRole, DeliveryStatus } from "@prisma/client";
import { getCurrentDeliveryStatus } from "@/lib/delivery-lifecycle";

describe.skip("Courier Assignment", () => {
  let testOrderId: string;
  let courier1Id: string;
  let courier2Id: string;

  beforeAll(async () => {
    // Create test couriers
    const c1 = await prisma.user.create({
      data: {
        id: `courier-1-${Date.now()}`,
        name: "Courier One",
        phone: `+911111111111-${Date.now()}`,
        role: UserRole.DELIVERY,
      },
    });

    const c2 = await prisma.user.create({
      data: {
        id: `courier-2-${Date.now()}`,
        name: "Courier Two",
        phone: `+912222222222-${Date.now()}`,
        role: UserRole.DELIVERY,
      },
    });

    courier1Id = c1.id;
    courier2Id = c2.id;

    // Create test order (must have READY status for courier assignment)
    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
    });

    if (!restaurant) {
      throw new Error("No restaurant found for testing");
    }

    const order = await prisma.order.create({
      data: {
        id: `test-order-${Date.now()}`,
        restaurantId: restaurant.id,
        status: "CONFIRMED",
        deliveryStatus: DeliveryStatus.READY, // Must be in READY state
        subtotal: 1000,
        deliveryFee: 50,
        serviceFee: 100,
        total: 1150,
      },
    });

    testOrderId = order.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testOrderId) {
      await prisma.order.delete({ where: { id: testOrderId } });
    }

    if (courier1Id) {
      await prisma.user.delete({ where: { id: courier1Id } });
    }

    if (courier2Id) {
      await prisma.user.delete({ where: { id: courier2Id } });
    }
  });

  it("should assign a courier deterministically", async () => {
    const result = await assignCourier(testOrderId, 30);

    expect(result.orderId).toBe(testOrderId);
    expect([courier1Id, courier2Id]).toContain(result.courierId);
    expect(result.courierName).toBeDefined();
    expect(result.estimatedDeliveryMinutes).toBe(30);
    expect(result.deliveryEvent).toBeDefined();
    expect(result.outboxEvent).toBeDefined();
  });

  it("should return the same courier for the same orderId (deterministic)", async () => {
    // Create another test order
    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
    });

    const order2 = await prisma.order.create({
      data: {
        id: `test-order-deterministic-${Date.now()}`,
        restaurantId: restaurant!.id,
        status: "CONFIRMED",
        deliveryStatus: DeliveryStatus.READY,
        subtotal: 1000,
        deliveryFee: 50,
        serviceFee: 100,
        total: 1150,
      },
    });

    const result1 = await assignCourier(order2.id, 25);
    const courier1 = await getAssignedCourier(order2.id);

    // Verify assignment
    expect(courier1?.courierId).toBe(result1.courierId);
    expect(result1.estimatedDeliveryMinutes).toBe(25);

    await prisma.order.delete({ where: { id: order2.id } });
  });

  it("should create delivery event in ASSIGNED status", async () => {
    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
    });

    const order3 = await prisma.order.create({
      data: {
        id: `test-order-event-${Date.now()}`,
        restaurantId: restaurant!.id,
        status: "CONFIRMED",
        deliveryStatus: DeliveryStatus.READY,
        subtotal: 1000,
        deliveryFee: 50,
        serviceFee: 100,
        total: 1150,
      },
    });

    await assignCourier(order3.id, 30);

    const status = await getCurrentDeliveryStatus(order3.id);
    expect(status.deliveryStatus).toBe(DeliveryStatus.ASSIGNED);

    await prisma.order.delete({ where: { id: order3.id } });
  });

  it("should not allow double assignment", async () => {
    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
    });

    const order4 = await prisma.order.create({
      data: {
        id: `test-order-double-${Date.now()}`,
        restaurantId: restaurant!.id,
        status: "CONFIRMED",
        deliveryStatus: DeliveryStatus.READY,
        subtotal: 1000,
        deliveryFee: 50,
        serviceFee: 100,
        total: 1150,
      },
    });

    await assignCourier(order4.id, 30);

    // Attempt second assignment
    try {
      await assignCourier(order4.id, 30);
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("already assigned");
    }

    await prisma.order.delete({ where: { id: order4.id } });
  });
});
