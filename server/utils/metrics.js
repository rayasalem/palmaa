/**
 * In-memory metrics for Prometheus/OpenTelemetry integration.
 * Tracks request count, latency (histogram), status codes, and errors (4xx/5xx).
 * Labels: method, route (normalized), status. No PII; IDs in path are normalized to :id.
 */

const LABEL_NAMES = ['method', 'route', 'status'];

const requestCount = new Map();
const errorCount = new Map();
const rateLimitHits = new Map(); // route -> count (429)
const validationFailures = new Map(); // route/source -> count (400)
const mfaFailures = new Map(); // label -> count (MFA verify/setup failures)
const durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const durationSums = new Map();
const durationCounts = new Map();
const durationBucketCounts = new Map();

function labelKey(labels) {
  return LABEL_NAMES.map((n) => `${n}="${String(labels[n] ?? '').replace(/"/g, '\\"')}"`).join(',');
}

function incCounter(map, labels, value = 1) {
  const key = labelKey(labels);
  map.set(key, (map.get(key) || 0) + value);
}

function observeDuration(labels, seconds) {
  const key = labelKey(labels);
  durationSums.set(key, (durationSums.get(key) || 0) + seconds);
  durationCounts.set(key, (durationCounts.get(key) || 0) + 1);
  for (const le of durationBuckets) {
    if (seconds <= le) {
      const bucketKey = `${key},le="${le}"`;
      durationBucketCounts.set(bucketKey, (durationBucketCounts.get(bucketKey) || 0) + 1);
    }
  }
  const infKey = `${key},le="+Inf"`;
  durationBucketCounts.set(infKey, (durationBucketCounts.get(infKey) || 0) + 1);
}

/**
 * Normalize path for low cardinality (e.g. /api/orders/abc-uuid -> /api/orders/:id).
 */
function normalizeRoute(path, routePath) {
  if (routePath && typeof routePath === 'string') return routePath;
  if (!path || typeof path !== 'string') return 'unknown';
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .substring(0, 120);
}

/**
 * Record a completed HTTP request for metrics.
 */
export function recordRequest(req, res, durationMs) {
  const route = normalizeRoute(req.originalUrl || req.path, req.route && req.route.path);
  const method = (req.method || 'GET').toUpperCase();
  const status = String(res.statusCode || 500);
  const labels = { method, route, status };

  incCounter(requestCount, labels);
  observeDuration(labels, durationMs / 1000);

  if (res.statusCode >= 400) {
    incCounter(errorCount, labels);
  }
}

/** Record a rate limit (429) hit for monitoring. */
export function recordRateLimitHit(routeLabel) {
  const key = String(routeLabel || 'unknown').replace(/"/g, '\\"');
  rateLimitHits.set(key, (rateLimitHits.get(key) || 0) + 1);
}

/** Record a validation failure (400) for monitoring. */
export function recordValidationFailure(source) {
  const key = String(source || 'unknown').replace(/"/g, '\\"');
  validationFailures.set(key, (validationFailures.get(key) || 0) + 1);
}

/** Record an MFA verify/setup failure for monitoring. */
export function recordMfaFailure(label) {
  const key = String(label || 'unknown').replace(/"/g, '\\"');
  mfaFailures.set(key, (mfaFailures.get(key) || 0) + 1);
}

/**
 * Render Prometheus text exposition format.
 */
export function getPrometheusText() {
  const lines = [];
  const metricPrefix = 'palma_http';

  lines.push('# HELP palma_http_requests_total Total HTTP requests');
  lines.push('# TYPE palma_http_requests_total counter');
  for (const [key, value] of requestCount.entries()) {
    lines.push(`${metricPrefix}_requests_total{${key}} ${value}`);
  }

  lines.push('# HELP palma_http_errors_total Total HTTP errors (4xx/5xx)');
  lines.push('# TYPE palma_http_errors_total counter');
  for (const [key, value] of errorCount.entries()) {
    lines.push(`${metricPrefix}_errors_total{${key}} ${value}`);
  }

  lines.push('# HELP palma_http_request_duration_seconds Request duration in seconds');
  lines.push('# TYPE palma_http_request_duration_seconds histogram');
  for (const [key, sum] of durationSums.entries()) {
    const count = durationCounts.get(key) || 0;
    const base = key.replace(/,le="[^"]*"$/, '');
    lines.push(`${metricPrefix}_request_duration_seconds_sum{${base}} ${sum.toFixed(6)}`);
    lines.push(`${metricPrefix}_request_duration_seconds_count{${base}} ${count}`);
  }
  for (const [key, value] of durationBucketCounts.entries()) {
    lines.push(`${metricPrefix}_request_duration_seconds_bucket{${key}} ${value}`);
  }

  lines.push('# HELP palma_http_rate_limit_hits_total Rate limit (429) hits by route');
  lines.push('# TYPE palma_http_rate_limit_hits_total counter');
  for (const [route, value] of rateLimitHits.entries()) {
    lines.push(`${metricPrefix}_rate_limit_hits_total{route="${route}"} ${value}`);
  }

  lines.push('# HELP palma_http_validation_failures_total Validation (400) failures by source');
  lines.push('# TYPE palma_http_validation_failures_total counter');
  for (const [source, value] of validationFailures.entries()) {
    lines.push(`${metricPrefix}_validation_failures_total{source="${source}"} ${value}`);
  }

  lines.push('# HELP palma_http_mfa_failures_total MFA verify/setup failures');
  lines.push('# TYPE palma_http_mfa_failures_total counter');
  for (const [label, value] of mfaFailures.entries()) {
    lines.push(`${metricPrefix}_mfa_failures_total{label="${label}"} ${value}`);
  }

  // Process memory for CPU/RAM monitoring (Prometheus/Grafana)
  const mem = process.memoryUsage();
  lines.push('# HELP palma_process_resident_memory_bytes Resident set size in bytes');
  lines.push('# TYPE palma_process_resident_memory_bytes gauge');
  lines.push(`palma_process_resident_memory_bytes ${Math.round(mem.rss || 0)}`);
  lines.push('# HELP palma_process_heap_used_bytes V8 heap used in bytes');
  lines.push('# TYPE palma_process_heap_used_bytes gauge');
  lines.push(`palma_process_heap_used_bytes ${Math.round(mem.heapUsed || 0)}`);
  lines.push('# HELP palma_process_heap_total_bytes V8 heap total in bytes');
  lines.push('# TYPE palma_process_heap_total_bytes gauge');
  lines.push(`palma_process_heap_total_bytes ${Math.round(mem.heapTotal || 0)}`);
  lines.push('# HELP palma_process_external_memory_bytes External memory in bytes');
  lines.push('# TYPE palma_process_external_memory_bytes gauge');
  lines.push(`palma_process_external_memory_bytes ${Math.round(mem.external || 0)}`);

  // CPU usage (user + system in microseconds; optional for capacity planning)
  try {
    const cpu = process.cpuUsage();
    const userSec = (cpu.user || 0) / 1e6;
    const systemSec = (cpu.system || 0) / 1e6;
    lines.push('# HELP palma_process_cpu_user_seconds Total user CPU time in seconds');
    lines.push('# TYPE palma_process_cpu_user_seconds gauge');
    lines.push(`palma_process_cpu_user_seconds ${userSec.toFixed(6)}`);
    lines.push('# HELP palma_process_cpu_system_seconds Total system CPU time in seconds');
    lines.push('# TYPE palma_process_cpu_system_seconds gauge');
    lines.push(`palma_process_cpu_system_seconds ${systemSec.toFixed(6)}`);
  } catch (_) {
    /* ignore on unsupported platforms */
  }

  return lines.join('\n') + '\n';
}

export default {
  recordRequest,
  getPrometheusText,
  normalizeRoute,
  recordRateLimitHit,
  recordValidationFailure,
  recordMfaFailure,
};
