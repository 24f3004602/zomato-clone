type MetricSnapshot = {
  counters: Record<string, number>;
  timings: Record<string, { count: number; totalMs: number; maxMs: number }>;
};

const globalMetrics = globalThis as typeof globalThis & {
  tableTrailMetrics?: { counters: Map<string, number>; timings: Map<string, { count: number; totalMs: number; maxMs: number }> };
};

const state = globalMetrics.tableTrailMetrics ?? { counters: new Map(), timings: new Map() };
globalMetrics.tableTrailMetrics = state;

export function incrementMetric(name: string, value = 1) {
  state.counters.set(name, (state.counters.get(name) ?? 0) + value);
}

export function recordTiming(name: string, durationMs: number) {
  const current = state.timings.get(name) ?? { count: 0, totalMs: 0, maxMs: 0 };
  current.count += 1;
  current.totalMs += Math.max(0, durationMs);
  current.maxMs = Math.max(current.maxMs, durationMs);
  state.timings.set(name, current);
}

export function getMetricSnapshot(): MetricSnapshot {
  return {
    counters: Object.fromEntries(state.counters),
    timings: Object.fromEntries(state.timings),
  };
}

export function getPrometheusMetrics() {
  const snapshot = getMetricSnapshot();
  const lines = [
    "# HELP tabletrail_info Application information.",
    "# TYPE tabletrail_info gauge",
    'tabletrail_info{service="tabletrail"} 1',
  ];
  for (const [name, value] of Object.entries(snapshot.counters)) {
    const metricName = `tabletrail_${name.replace(/[^a-zA-Z0-9_]/g, "_")}_total`;
    lines.push(`# TYPE ${metricName} counter`, `${metricName} ${value}`);
  }
  for (const [name, timing] of Object.entries(snapshot.timings)) {
    const metricName = `tabletrail_${name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    lines.push(`# TYPE ${metricName}_count counter`, `${metricName}_count ${timing.count}`);
    lines.push(`# TYPE ${metricName}_sum gauge`, `${metricName}_sum ${timing.totalMs}`);
    lines.push(`# TYPE ${metricName}_max gauge`, `${metricName}_max ${timing.maxMs}`);
  }
  return `${lines.join("\n")}\n`;
}
