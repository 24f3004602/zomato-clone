import { createClient, type RedisClientType } from "redis";
import { incrementMetric } from "./metrics";

type OrderEvent = { orderId: string; status: string; restaurantId?: string; deliveryPartnerId?: string };

let publisher: RedisClientType | null = null;

function channel(scope: string) {
  return `tabletrail:orders:${scope}`;
}

async function getPublisher() {
  if (!process.env.REDIS_URL) return null;
  if (!publisher) {
    publisher = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 1000, reconnectStrategy: false } });
    publisher.on("error", () => undefined);
    try {
      await Promise.race([
        publisher.connect(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Redis connection timed out")), 1000)),
      ]);
    } catch (error) {
      publisher.destroy();
      publisher = null;
      throw error;
    }
  }
  return publisher;
}

export async function publishOrderEvent(scope: string, event: OrderEvent) {
  try {
    const client = await getPublisher();
    if (!client) {
      incrementMetric("redis.publish.skipped");
      return;
    }

    await client.publish(channel(scope), JSON.stringify(event));
    incrementMetric("redis.publish.success");
  } catch {
    incrementMetric("redis.publish.failure");
  }
}

export async function closeRealtimePublisher() {
  if (publisher?.isOpen) await publisher.quit();
  publisher = null;
}

export async function subscribeToOrderEvents(scope: string, onEvent: (event: OrderEvent) => void) {
  if (!process.env.REDIS_URL) return null;
  const subscriber = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 1000, reconnectStrategy: false } });
  subscriber.on("error", () => undefined);
  await Promise.race([
    subscriber.connect(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Redis connection timed out")), 1000)),
  ]);
  await subscriber.subscribe(channel(scope), (message) => {
    try {
      onEvent(JSON.parse(message) as OrderEvent);
    } catch {
      // Ignore malformed messages from external publishers.
    }
  });
  return async () => {
    await subscriber.unsubscribe(channel(scope));
    await subscriber.quit();
  };
}
