# Infrastructure

## Folders and files

| Path                  | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `config/`             | Env examples for development, staging, production          |
| `deploy/`             | Nginx configs (reverse proxy, frontend), Prometheus config |
| `docker-compose.yml`  | Full stack: frontend, backend, postgres, redis, nginx      |
| `Dockerfile.frontend` | Multi-stage frontend build; serve with Nginx               |
| `server/Dockerfile`   | Backend image (Node, server only)                          |
| `.github/workflows/`  | CI (build, audit), CD staging, CD production               |

## Running with Docker

- Copy env from `config/env.staging.example` into `server/.env` and set `SUPABASE_*`, `JWT_SECRET`, etc.
- Build and run: `docker-compose up -d`. Frontend at http://localhost, API at http://localhost/api.
- Production often uses hosted DB (Supabase) and optional managed Redis; you can remove postgres/redis from compose and set env to point to hosted services.

## Nginx HTTPS

- In `deploy/nginx-reverse-proxy.conf`, uncomment the `listen 443 ssl` block and set `ssl_certificate` and `ssl_certificate_key` to your certificate paths (e.g. Let's Encrypt).
