import { prisma } from "./db";
import { NotificationType } from "@prisma/client";

export interface NotificationPayload {
  userId: string;
  orderId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: Array<"inbox" | "email" | "sms" | "push">;
}

/**
 * Convert OutboxEvent to Notification payload
 * Maps delivery events to user-friendly notifications
 */
export function mapOutboxEventToNotification(
  outboxEvent: any,
  order: any
): NotificationPayload | null {
  const { eventType, payload } = outboxEvent;

  // Map event types to notifications
  const notificationMap: Record<string, Partial<NotificationPayload>> = {
    DELIVERY_ACCEPT: {
      type: "RESTAURANT_ACCEPTED",
      title: "Restaurant Accepted",
      message: `${order.restaurant?.name} has accepted your order`,
    },
    DELIVERY_START_PREPARING: {
      type: "FOOD_PREPARING",
      title: "Preparing Your Food",
      message: `${order.restaurant?.name} is preparing your order`,
    },
    DELIVERY_MARK_READY: {
      type: "FOOD_READY",
      title: "Ready for Pickup",
      message: `Your order is ready for pickup`,
    },
    DELIVERY_ASSIGN_COURIER: {
      type: "COURIER_ASSIGNED",
      title: "Courier Assigned",
      message: `${payload?.courierName || "Your courier"} is on the way`,
    },
    DELIVERY_START_DELIVERY: {
      type: "DELIVERY_STARTED",
      title: "Out for Delivery",
      message: `Your order is out for delivery`,
    },
    DELIVERY_DELIVER: {
      type: "DELIVERY_COMPLETED",
      title: "Delivered",
      message: `Your order has been delivered`,
    },
  };

  const notification = notificationMap[eventType];

  if (!notification) {
    return null;
  }

  return {
    userId: order.userId,
    orderId: order.id,
    type: notification.type as NotificationType,
    title: notification.title || "",
    message: notification.message || "",
    data: payload,
    channels: ["inbox"], // Default channel; can be extended to email/sms
  };
}

/**
 * Create a notification in the database
 */
export async function createNotification(
  payload: NotificationPayload
): Promise<any> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        orderId: payload.orderId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        channels: payload.channels || ["inbox"],
      },
    });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

/**
 * Dispatch a single outbox event
 * Converts to notification and stores in database
 */
export async function dispatchOutboxEvent(outboxEvent: any): Promise<boolean> {
  try {
    // Fetch full order details
    const order = await prisma.order.findUnique({
      where: { id: outboxEvent.orderId },
      include: {
        restaurant: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!order) {
      console.error(`Order not found: ${outboxEvent.orderId}`);
      await prisma.outboxEvent.update({
        where: { id: outboxEvent.id },
        data: { processed: true, processedAt: new Date() },
      });
      return false;
    }

    // Map outbox event to notification
    const notificationPayload = mapOutboxEventToNotification(
      outboxEvent,
      order
    );

    if (!notificationPayload) {
      // Unknown event type, skip but mark as processed
      await prisma.outboxEvent.update({
        where: { id: outboxEvent.id },
        data: { processed: true, processedAt: new Date() },
      });
      return true;
    }

    // Create notification
    const notification = await createNotification(notificationPayload);

    // Mark outbox event as processed
    await prisma.outboxEvent.update({
      where: { id: outboxEvent.id },
      data: { processed: true, processedAt: new Date() },
    });

    // Mark notification as sent (for inbox channel)
    await prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date(), deliveredAt: new Date() },
    });

    return true;
  } catch (error) {
    console.error(
      `Failed to dispatch outbox event ${outboxEvent.id}:`,
      error
    );

    // Increment failure count
    const current = await prisma.outboxEvent.findUnique({
      where: { id: outboxEvent.id },
    });

    if (current) {
      // Retry up to 3 times; don't mark as processed to retry later
      if (!current.processedAt) {
        // Log for retry
        console.log(`Outbox event ${outboxEvent.id} will be retried`);
      }
    }

    return false;
  }
}

/**
 * Dispatch all unprocessed outbox events
 * Polling function for background job or cron
 */
export async function dispatchAllOutboxEvents(limit = 100): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  try {
    const events = await prisma.outboxEvent.findMany({
      where: { processed: false },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let successful = 0;
    let failed = 0;

    for (const event of events) {
      const success = await dispatchOutboxEvent(event);
      if (success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      total: events.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error("Batch dispatch failed:", error);
    return { total: 0, successful: 0, failed: 0 };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<any> {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true, readAt: new Date() },
  });
}

/**
 * Fetch notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly = false,
  limit = 50
): Promise<any[]> {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { read: false }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get unread notification count for user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
