import { prisma } from "./db";

export interface OutboxEventPayload {
  [key: string]: any;
}

export async function logOutboxEvent(
  orderId: string,
  eventType: string,
  payload: OutboxEventPayload
) {
  return prisma.outboxEvent.create({
    data: {
      orderId,
      eventType,
      payload,
    },
  });
}

export async function getUnprocessedOutboxEvents(limit = 100) {
  return prisma.outboxEvent.findMany({
    where: { processed: false },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function markOutboxEventProcessed(eventId: string) {
  return prisma.outboxEvent.update({
    where: { id: eventId },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  });
}

export async function getOrderOutboxHistory(orderId: string) {
  return prisma.outboxEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
}
