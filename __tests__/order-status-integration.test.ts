import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { UserRole, DeliveryStatus, OrderStatus } from "@prisma/client";
import { getOrderStatus } from "@/lib/order-status";
import { assignCourier } from "@/lib/courier-assignment";
import { transitionDeliveryStatus } from "@/lib/delivery-lifecycle";

describe.skip("Order Status & Delivery Lifecycle Integration", () => {
  let orderId: string;
  let courierId: string;
  let restaurantId: string;

  beforeAll(async () => {
    // Create test restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        id: `test-rest-${Date.now()}`,
        name: "Test Restaurant",
        description: "Test",
        rating: 4.5,
        deliveryMinutes: 30,
        deliveryFee: 50,
        priceForTwo: 500,
      },
    });
    restaurantId = restaurant.id;

    // Create test courier
    const courier = await prisma.user.create({
      data: {
        id: `courier-${Date.now()}`,
        name: "Test Courier",
        phone: `+919999999999-${Date.now()}`,
        role: UserRole.DELIVERY,
      },
    });
    courierId = courier.id;

    // Create test order in READY state
    const order = await prisma.order.create({
      data: {
        id: `test-order-${Date.now()}`,
        restaurantId,
        status: OrderStatus.CONFIRMED,
        deliveryStatus: DeliveryStatus.READY,
        subtotal: 1000,
        deliveryFee: 50,
        serviceFee: 100,
        total: 1150,
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    if (orderId) await prisma.order.delete({ where: { id: orderId } });
    if (courierId) await prisma.user.delete({ where: { id: courierId } });
    if (restaurantId)
      await prisma.restaurant.delete({ where: { id: restaurantId } });
  });

  it("should assign courier and update delivery status", async () => {
    const result = await assignCourier(orderId, 30);

    expect(result.orderId).toBe(orderId);
    expect(result.courierId).toBeDefined();
    expect(result.estimatedDeliveryMinutes).toBe(30);
  });

  it("should fetch complete order status with timeline", async () => {
    const status = await getOrderStatus(orderId);

    expect(status.orderId).toBe(orderId);
    expect(status.deliveryStatus).toBe(DeliveryStatus.ASSIGNED);
    expect(status.deliveryPartner).toBeDefined();
    expect(status.restaurant.name).toBe("Test Restaurant");
    expect(status.timeline.length).toBeGreaterThan(0);
  });

  it("should track delivery status transitions in timeline", async () => {
    // Transition to DELIVERING
    await transitionDeliveryStatus(orderId, "start_delivery");

    const status = await getOrderStatus(orderId);

    expect(status.deliveryStatus).toBe(DeliveryStatus.DELIVERING);
    expect(status.timeline).toContainEqual(
      expect.objectContaining({
        status: DeliveryStatus.DELIVERING,
      })
    );
  });
});
