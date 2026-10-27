import { prisma } from "./db";
import { incrementMetric } from "./metrics";
import { createClient } from "redis";

type HealthCheck = { status: "ok" | "degraded" | "unavailable"; detail?: string };

export async function getHealthChecks(includeDatabase: boolean) {
  const checks: Record<string, HealthCheck> = {
    application: { status: "ok" },
    configuration: { status: "ok" },
  };

  if (process.env.NODE_ENV === "production" && process.env.PAYMENT_PROVIDER === "test") {
    checks.configuration = { status: "degraded", detail: "PAYMENT_PROVIDER is still configured for test mode" };
  }

  if (process.env.AUTH_PROVIDER === "postgres" && process.env.ORDER_STORE !== "postgres") {
    checks.configuration = { status: "degraded", detail: "AUTH_PROVIDER=postgres requires ORDER_STORE=postgres" };
  }

  if (includeDatabase) {
    if (process.env.AUTH_PROVIDER !== "postgres" && process.env.ORDER_STORE !== "postgres") {
      checks.database = { status: "ok", detail: "Development providers are active" };
    } else {
      try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = { status: "ok" };
        incrementMetric("database.readiness.success");
      } catch {
        checks.database = { status: "unavailable", detail: "PostgreSQL connection failed" };
        incrementMetric("database.readiness.failure");
      }

    }
  }

  if (process.env.REDIS_URL) {
    const client = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 1000, reconnectStrategy: false } });
    try {
      await client.connect();
      await client.ping();
      checks.redis = { status: "ok" };
      incrementMetric("redis.readiness.success");
    } catch {
      checks.redis = { status: "unavailable", detail: "Redis connection failed" };
      incrementMetric("redis.readiness.failure");
    } finally {
      if (client.isOpen) await client.quit();
    }
  } else {
    checks.redis = process.env.NODE_ENV === "production"
      ? { status: "unavailable", detail: "REDIS_URL is required in production" }
      : { status: "ok", detail: "Redis is not configured" };
  }

  const ready = Object.values(checks).every((check) => check.status === "ok");
  return { status: ready ? "ok" : "degraded", checks };
}
