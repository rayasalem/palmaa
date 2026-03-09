/**
 * Read-only load test for GET endpoints. Run with: node scripts/load-test-get.mjs
 * Requires server running (e.g. port 5000). No auth; tests /health, /ready, /api/products.
 */
const BASE = process.env.PALMA_BASE_URL || 'http://localhost:5000';

async function fetchAndTime(url) {
  const start = performance.now();
  let status = 0;
  try {
    const res = await fetch(url, { method: 'GET' });
    status = res.status;
    await res.text();
    return { durationMs: performance.now() - start, status };
  } catch (e) {
    return { durationMs: performance.now() - start, status: 0, error: e.message };
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

async function run() {
  const endpoints = [
    { name: 'GET /health', url: `${BASE}/health` },
    { name: 'GET /ready', url: `${BASE}/ready` },
    { name: 'GET /api/products', url: `${BASE}/api/products` },
  ];
  const concurrency = 5;
  const requestsPerEndpoint = 20;

  console.log('Load test (read-only GET)', BASE, '\n');

  for (const { name, url } of endpoints) {
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < requestsPerEndpoint; i++) {
      promises.push(fetchAndTime(url));
    }
    const results = await Promise.all(promises);
    const totalMs = Date.now() - start;
    const durations = results.map((r) => r.durationMs).filter((n) => n >= 0).sort((a, b) => a - b);
    const success = results.filter((r) => r.status >= 200 && r.status < 300).length;
    const failed = results.filter((r) => r.status === 0 || r.status >= 400).length;

    console.log(name);
    console.log('  Count:', results.length, '| Success:', success, '| Failed:', failed, '| Total time (ms):', totalMs);
    if (durations.length > 0) {
      console.log('  Latency (ms) – p50:', percentile(durations, 50).toFixed(0), '| p95:', percentile(durations, 95).toFixed(0), '| p99:', percentile(durations, 99).toFixed(0));
    }
    console.log('');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
