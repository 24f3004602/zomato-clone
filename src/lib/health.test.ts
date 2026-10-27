import { describe, expect, it } from "vitest";
import { getHealthChecks } from "./health";

describe("health checks", () => {
  it("reports development readiness without Redis configured", async () => {
    const previousRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      const result = await getHealthChecks(true);
      expect(result.checks.redis).toEqual({ status: "ok", detail: "Redis is not configured" });
    } finally {
      if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = previousRedisUrl;
    }
  });
});
