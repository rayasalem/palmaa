# Monitoring and logging

## Health endpoints

| Endpoint  | Purpose   | Returns                    |
|-----------|-----------|----------------------------|
| `GET /health` | Liveness  | `{ ok: true, timestamp }`  |
| `GET /ready`  | Readiness | DB (and optional payment) check; 200 or 503 |

Use in load balancers and Kubernetes: liveness = `/health`, readiness = `/ready`.

## Application logging

- Backend uses **Winston** (`server/utils/logger.js`). Level via `LOG_LEVEL` (e.g. `info` in production).
- Strategy: log JSON in production; avoid logging secrets or full request bodies.
- Centralized logging: ship logs to your provider (e.g. Datadog, ELK, CloudWatch) via sidecar or agent using the same log stream.

## Metrics (Prometheus / Grafana)

- **Config:** `deploy/prometheus.yml` scrapes `backend:5000/metrics` if the app exposes `/metrics`.
- To add `/metrics`: use `prom-client` in the backend and expose HTTP GET `/metrics` (see Node/Express + Prometheus docs).
- **Suggested metrics:** request duration, request count by path/status, error count, active connections. Optionally: DB pool size, cache hit rate if using Redis.

## Grafana

- Point Grafana to Prometheus as data source.
- Dashboards: API latency, error rate, CPU/memory (from node_exporter if installed), and custom app metrics.
