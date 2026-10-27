import { describe, expect, it } from "vitest";
import { getPrometheusMetrics, incrementMetric, recordTiming } from "./metrics";

describe("operational metrics", () => {
  it("exports counters and timings in Prometheus format", () => {
    incrementMetric("test.transition");
    recordTiming("test.latency_ms", 12);
    const output = getPrometheusMetrics();
    expect(output).toContain("tabletrail_test_transition_total 1");
    expect(output).toContain("tabletrail_test_latency_ms_count 1");
    expect(output).toContain("tabletrail_test_latency_ms_sum 12");
  });
});
