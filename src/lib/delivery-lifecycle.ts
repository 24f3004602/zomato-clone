import { DeliveryStatus } from "@prisma/client";
import { prisma } from "./db";

export type DeliveryTransition =
  | "accept"
  | "start_preparing"
  | "mark_ready"
  | "assign_courier"
  | "start_delivery"
  | "deliver"
  | "cancel";

export const VALID_TRANSITIONS: Record<
  DeliveryStatus,
  DeliveryTransition[]
> = {
  [DeliveryStatus.PENDING]: ["accept", "cancel"],
  [DeliveryStatus.ACCEPTED]: ["start_preparing", "cancel"],
  [DeliveryStatus.PREPARING]: ["mark_ready", "cancel"],
  [DeliveryStatus.READY]: ["assign_courier", "cancel"],
  [DeliveryStatus.ASSIGNED]: ["start_delivery", "cancel"],
  [DeliveryStatus.DELIVERING]: ["deliver"],
  [DeliveryStatus.DELIVERED]: [],
};

interface TransitionOptions {
  courierId?: string;
  reason?: string;
  estimatedDeliveryMinutes?: number;
}

export async function transitionDeliveryStatus(
  orderId: string,
  transition: DeliveryTransition,
  options: TransitionOptions = {}
): Promise<{ status: DeliveryStatus; event: any; outboxEvent: any }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { deliveryStatus: true, estimatedDeliveryAt: true },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const currentStatus = order.deliveryStatus;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(transition)) {
    throw new Error(
      `Cannot transition from ${currentStatus} via ${transition}. Allowed: ${allowed.join(", ")}`
    );
  }

  // Determine next status
  let nextStatus: DeliveryStatus;
  switch (transition) {
    case "accept":
      nextStatus = DeliveryStatus.ACCEPTED;
      break;
    case "start_preparing":
      nextStatus = DeliveryStatus.PREPARING;
      break;
    case "mark_ready":
      nextStatus = DeliveryStatus.READY;
      break;
    case "assign_courier":
      nextStatus = DeliveryStatus.ASSIGNED;
      break;
    case "start_delivery":
      nextStatus = DeliveryStatus.DELIVERING;
      break;
    case "deliver":
      nextStatus = DeliveryStatus.DELIVERED;
      break;
    case "cancel":
      // Keep status as-is for cancellation (handled separately if needed)
      nextStatus = currentStatus;
      break;
    default:
      throw new Error(`Unknown transition: ${transition}`);
  }

  // Create delivery event + outbox in transaction
  const result = await prisma.$transaction(async (tx) => {
    const deliveryEvent = await tx.deliveryEvent.create({
      data: {
        orderId,
        status: nextStatus,
        assignedCourierId: options.courierId,
        reason: options.reason,
      },
    });

    const estimatedDeliveryAt = options.estimatedDeliveryMinutes
      ? new Date(Date.now() + options.estimatedDeliveryMinutes * 60 * 1000)
      : order.estimatedDeliveryAt;

    // Update order delivery status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        deliveryStatus: nextStatus,
        deliveryPartnerId: options.courierId || undefined,
        estimatedDeliveryAt,
        ...(nextStatus === DeliveryStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      },
    });

    // Create outbox event
    const outboxEvent = await tx.outboxEvent.create({
      data: {
        orderId,
        eventType: `DELIVERY_${transition.toUpperCase()}`,
        payload: {
          previousStatus: currentStatus,
          newStatus: nextStatus,
          transition,
          courierId: options.courierId,
          reason: options.reason,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return { deliveryEvent, updatedOrder, outboxEvent };
  });

  return {
    status: nextStatus,
    event: result.deliveryEvent,
    outboxEvent: result.outboxEvent,
  };
}

export async function getDeliveryTimeline(orderId: string) {
  const events = await prisma.deliveryEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });

  return events;
}

export async function getCurrentDeliveryStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      deliveryStatus: true,
      deliveryPartnerId: true,
      estimatedDeliveryAt: true,
      updatedAt: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  return order;
}
