# Scalability

## Horizontal scaling

- **Backend:** Run multiple instances behind a load balancer; ensure no in-process state (sessions in JWT or DB). Nginx or cloud LB distributes to backend replicas.
- **Frontend:** Static assets; scale by CDN and/or more Nginx replicas.

## Load balancing

- Nginx `upstream backend { server backend1:5000; server backend2:5000; }` or use cloud LB (e.g. ALB, GCP LB) with health check `GET /health` and readiness `GET /ready`.

## Caching

- **Redis:** Optional for session or API response cache; add in backend and wire via env (e.g. `REDIS_URL`). docker-compose already includes Redis service.
- **CDN:** Serve `dist/` (and optionally `/api` GET cache) via CDN for static and cacheable responses.

## Metrics to monitor

- CPU and memory (per container/node).
- API latency (p50, p95, p99) and error rate.
- Database connections and query latency (Supabase dashboard or PG metrics).
- Payment gateway availability (optional check in `/ready` when `HEALTH_CHECK_PAYMENT=true`).
