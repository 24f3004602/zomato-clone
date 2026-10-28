import { prisma } from "@/lib/db";
import { transitionDeliveryStatus } from "@/lib/delivery-lifecycle";
import crypto from "crypto";

/**
 * Deterministic courier assignment based on order hash.
 * Same orderId will always be assigned to the same courier index.
 * Enables reproducible tests and fair distribution.
 */
async function getAvailableCouriers() {
  // Fetch all users with DELIVERY role
  const couriers = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    select: { id: true, name: true, phone: true },
  });

  return couriers;
}

function hashOrderToCourierId(orderId: string, courierIds: string[]): string {
  if (courierIds.length === 0) {
    throw new Error("No available couriers");
  }

  // Hash orderId to deterministic index
  const hash = crypto.createHash("md5").update(orderId).digest("hex");
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const index = hashNum % courierIds.length;

  return courierIds[index];
}

interface AssignmentResult {
  orderId: string;
  courierId: string;
  courierName: string;
  estimatedDeliveryMinutes: number;
  deliveryEvent: any;
  outboxEvent: any;
}

export async function assignCourier(
  orderId: string,
  estimatedDeliveryMinutes: number = 30
): Promise<AssignmentResult> {
  // Fetch order to verify it exists and state
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: true, deliveryPartner: true },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.deliveryPartner) {
    throw new Error(
      `Order ${orderId} already assigned to courier ${order.deliveryPartner.id}`
    );
  }

  // Get available couriers
  const couriers = await getAvailableCouriers();

  if (couriers.length === 0) {
    throw new Error("No available couriers for assignment");
  }

  // Deterministic assignment
  const courierId = hashOrderToCourierId(
    orderId,
    couriers.map((c) => c.id)
  );

  const courier = couriers.find((c) => c.id === courierId)!;

  // Transition delivery status and log outbox event
  const { event, outboxEvent } = await transitionDeliveryStatus(
    orderId,
    "assign_courier",
    {
      courierId,
      estimatedDeliveryMinutes,
    }
  );

  return {
    orderId,
    courierId,
    courierName: courier.name,
    estimatedDeliveryMinutes,
    deliveryEvent: event,
    outboxEvent,
  };
}

export async function getAssignedCourier(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      deliveryPartner: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (!order.deliveryPartner) {
    return null;
  }

  return {
    courierId: order.deliveryPartner.id,
    courierName: order.deliveryPartner.name,
    phone: order.deliveryPartner.phone,
    estimatedDeliveryAt: order.estimatedDeliveryAt,
  };
}
