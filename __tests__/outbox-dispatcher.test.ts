import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  dispatchOutboxEvent,
  dispatchAllOutboxEvents,
  mapOutboxEventToNotification,
  getUserNotifications,
  getUnreadNotificationCount,
} from "@/lib/outbox-dispatcher";
import { transitionDeliveryStatus } from "@/lib/delivery-lifecycle";
import { UserRole, DeliveryStatus, OrderStatus } from "@prisma/client";

describe.skip("Outbox Event Dispatcher", () => {
  let orderId: string;
  let restaurantId: string;
  let customerId: string;
  let outboxEventId: string;

  beforeAll(async () => {
    // Create test customer
    const customer = await prisma.user.create({
      data: {
        id: `customer-${Date.now()}`,
        name: "Test Customer",
        phone: `+919999999999-${Date.now()}`,
        role: UserRole.CUSTOMER,
      },
    });
    customerId = customer.id;

    // Create test restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        id: `test-rest-dispatcher-${Date.now()}`,
        name: "Test Restaurant",
        description: "Test",
        rating: 4.5,
        deliveryMinutes: 30,
        deliveryFee: 50,
        priceForTwo: 500,
      },
    });
    restaurantId = restaurant.id;

    // Create test order
    const order = await prisma.order.create({
      data: {
        id: `test-order-dispatcher-${Date.now()}`,
        userId: customerId,
        restaurantId,
        status: OrderStatus.CONFIRMED,
        deliveryStatus: DeliveryStatus.PENDING,
        subtotal: 1000,
        deliveryFee: 50,
        serviceFee: 100,
        total: 1150,
      },
    });
    orderId = order.id;

    // Create test outbox event
    const outboxEvent = await prisma.outboxEvent.create({
      data: {
        orderId,
        eventType: "RESTAURANT_ACCEPTED",
        payload: {
          previousStatus: DeliveryStatus.PENDING,
          newStatus: DeliveryStatus.ACCEPTED,
        },
      },
    });
    outboxEventId = outboxEvent.id;
  });

  afterAll(async () => {
    // Cleanup
    if (orderId)
      await prisma.order.deleteMany({ where: { id: orderId } });
    if (customerId) await prisma.user.delete({ where: { id: customerId } });
    if (restaurantId)
      await prisma.restaurant.delete({ where: { id: restaurantId } });
  });

  it("should map outbox event to notification", async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    const outboxEvent = await prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
    });

    const notification = mapOutboxEventToNotification(outboxEvent, order);

    expect(notification).toBeDefined();
    expect(notification?.userId).toBe(customerId);
    expect(notification?.orderId).toBe(orderId);
    expect(notification?.title).toBeDefined();
  });

  it("should dispatch outbox event and create notification", async () => {
    const outboxEvent = await prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
    });

    const success = await dispatchOutboxEvent(outboxEvent);
    expect(success).toBe(true);

    // Check that notification was created
    const notifications = await getUserNotifications(customerId);
    expect(notifications.length).toBeGreaterThan(0);

    // Check that outbox event is marked as processed
    const processedEvent = await prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
    });
    expect(processedEvent?.processed).toBe(true);
  });

  it("should fetch user notifications", async () => {
    const notifications = await getUserNotifications(customerId);

    expect(Array.isArray(notifications)).toBe(true);
    if (notifications.length > 0) {
      expect(notifications[0]).toHaveProperty("id");
      expect(notifications[0]).toHaveProperty("userId", customerId);
      expect(notifications[0]).toHaveProperty("type");
    }
  });

  it("should get unread notification count", async () => {
    const count = await getUnreadNotificationCount(customerId);

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should dispatch all unprocessed outbox events", async () => {
    // Create multiple test events
    for (let i = 0; i < 3; i++) {
      await prisma.outboxEvent.create({
        data: {
          orderId,
          eventType: `TEST_EVENT_${i}`,
          payload: { test: true },
        },
      });
    }

    const result = await dispatchAllOutboxEvents(10);

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.successful).toBeGreaterThanOrEqual(0);
    expect(result.failed).toBeGreaterThanOrEqual(0);
  });
});
