# Palma Marketplace – DevOps and operations

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) | High-level architecture and environments |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Folders, Docker, Nginx |
| [CICD.md](CICD.md) | GitHub Actions CI/CD |
| [MONITORING.md](MONITORING.md) | Health checks, logging, Prometheus/Grafana |
| [BACKUP_STRATEGY.md](BACKUP_STRATEGY.md) | DB backup and restore |
| [SCALABILITY.md](SCALABILITY.md) | Horizontal scaling, load balancing, caching |
| [SECURITY.md](SECURITY.md) | Security measures and recommendations |

## Quick start (Docker)

1. Set env: copy `config/env.staging.example` to `server/.env` and fill `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `FRONTEND_URL`.
2. Run: `docker-compose up -d`.
3. Open http://localhost (Nginx); API at http://localhost/api, health at http://localhost/health and http://localhost/ready.

## Backward compatibility

- All changes are additive: new routes (`/ready`), new configs, new workflows. Existing `/health` is still available via health routes. No breaking changes to current production behavior.
