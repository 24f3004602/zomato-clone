const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const concurrency = Number(process.env.CONCURRENCY || 10);
const requests = Number(process.env.REQUESTS || 100);

const started = performance.now();
const results = [];
for (let offset = 0; offset < requests; offset += concurrency) {
  const batch = Math.min(concurrency, requests - offset);
  results.push(...await Promise.all(Array.from({ length: batch }, () => fetch(`${baseUrl}/api/orders`, { headers: { Accept: "application/json" } }).then((response) => response.status).catch(() => 0))));
}
const elapsed = performance.now() - started;
const successful = results.filter((status) => status > 0).length;
const errors = results.length - successful;
console.log(JSON.stringify({ baseUrl, concurrency, requests, successful, errors, elapsedMs: Math.round(elapsed), requestsPerSecond: Math.round(successful / (elapsed / 1000)) }));
