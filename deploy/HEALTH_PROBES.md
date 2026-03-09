# Health and Readiness Probes

Backend exposes two endpoints. Use them so **traffic is only routed to fully ready instances**.

| Endpoint   | Purpose   | When to use |
|-----------|-----------|-------------|
| `GET /health` | **Liveness** – process is up | Restart container if unresponsive |
| `GET /ready`  | **Readiness** – DB (and optional deps) reachable | Route traffic only when this returns 200 |

## Behaviour

- **`/health`** – Always returns `200` with `{ ok: true, timestamp }`. Use for liveness: "is the process alive?"
- **`/ready`** – Returns `200` when Supabase (and optionally payment env) is reachable; `503` otherwise. Use for readiness: "can this instance serve traffic?"

## Orchestrator setup

### Docker Compose

- Backend **healthcheck** uses **`/ready`** so the container is marked healthy only when ready.
- **Nginx** (or other front) uses `depends_on: backend: condition: service_healthy`, so traffic is only sent to the backend once it is healthy (i.e. `/ready` passes).

### Kubernetes

- **livenessProbe** → `GET /health` (restart pod if process is dead).
- **readinessProbe** → `GET /ready` (remove from Service endpoints until ready).
- The **Service** only sends traffic to pods that pass the readiness probe.

See `deploy/kubernetes-backend.example.yaml` for a full example.

### Render

- Set **healthCheckPath** to **`/ready`** so the platform only routes traffic when the instance is ready.

### Docker (standalone)

- **HEALTHCHECK** in the Dockerfile uses **`/ready`** so `docker ps` shows the container as healthy only when it can serve traffic.

## Summary

- Use **`/ready`** for any check that gates **routing traffic** (readiness).
- Use **`/health`** for **liveness** where two probes are supported (e.g. Kubernetes).
- This ensures traffic is only routed to backend instances that have passed the readiness check (DB and optional deps up).
