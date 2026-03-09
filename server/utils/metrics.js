/**
 * In-memory metrics for Prometheus/OpenTelemetry integration.
 * Tracks request count, latency (histogram), status codes, and errors (4xx/5xx).
 * Labels: method, route (normalized), status. No PII; IDs in path are normalized to :id.
 */

const LABEL_NAMES = ['method', 'route', 'status'];

const requestCount = new Map();
const errorCount = new Map();
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

  return lines.join('\n') + '\n';
}

export default { recordRequest, getPrometheusText, normalizeRoute };
