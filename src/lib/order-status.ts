import { prisma } from "./db";
import { getCurrentDeliveryStatus, getDeliveryTimeline } from "./delivery-lifecycle";

export interface OrderStatusResponse {
  orderId: string;
  status: string;
  deliveryStatus: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
  restaurant: {
    id: string;
    name: string;
    deliveryMinutes: number;
  };
  deliveryPartner: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
  }>;
  timeline: Array<{
    id: string;
    status: string;
    courierId: string | null;
    reason: string | null;
    createdAt: string;
  }>;
}

export async function getOrderStatus(
  orderId: string
): Promise<OrderStatusResponse> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          deliveryMinutes: true,
        },
      },
      deliveryPartner: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          name: true,
          unitPrice: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Fetch delivery timeline
  const timeline = await getDeliveryTimeline(orderId);

  return {
    orderId: order.id,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    serviceFee: order.serviceFee,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    restaurant: order.restaurant,
    deliveryPartner: order.deliveryPartner,
    items: order.items,
    timeline: timeline.map((event) => ({
      id: event.id,
      status: event.status,
      courierId: event.assignedCourierId,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function getOrderStatusForCustomer(
  orderId: string,
  customerId: string
): Promise<OrderStatusResponse> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: customerId,
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          deliveryMinutes: true,
        },
      },
      deliveryPartner: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          name: true,
          unitPrice: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found or does not belong to customer`);
  }

  const timeline = await getDeliveryTimeline(orderId);

  return {
    orderId: order.id,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    serviceFee: order.serviceFee,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    restaurant: order.restaurant,
    deliveryPartner: order.deliveryPartner,
    items: order.items,
    timeline: timeline.map((event) => ({
      id: event.id,
      status: event.status,
      courierId: event.assignedCourierId,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
