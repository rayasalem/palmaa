# Deployment architecture

- **Frontend:** SPA (Vite/React), built to `dist/`, served by Nginx or static host.
- **Backend:** Node Express on port 5000; uses Supabase (Postgres) and optional Redis.
- **Reverse proxy:** Nginx in front; routing: `/api/*` to backend, `/*` to frontend.

Environments: **development** (local), **staging** (pre-prod), **production** (live). See `config/README.md` for env setup. Nginx config: `deploy/nginx-reverse-proxy.conf`; enable HTTPS by uncommenting ssl lines and setting certificate paths.
