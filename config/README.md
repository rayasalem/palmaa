# Environment configuration

Environments: **development**, **staging**, **production**.

| Environment     | Purpose                           | How it runs                                                                                          |
| --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **development** | Local dev; hot reload, debug logs | `npm run dev` (frontend) + `npm run start:server` (backend). Use `.env` from root and `server/.env`. |
| **staging**     | Pre-production; mirrors prod      | Docker Compose or cloud (e.g. Render). Uses `config/env.staging.example` (copy to env vars).         |
| **production**  | Live site                         | Docker/Kubernetes or PaaS. Env from secrets manager; no `.env` in repo.                              |

## Setup

1. **Development:** Copy `config/env.development.example` values into root `.env` and `server/.env`. Adjust `SUPABASE_*` and `FRONTEND_URL` for your dev Supabase project.
2. **Staging/Production:** Do not copy example files to repo. Inject variables via CI/CD secrets or server environment. Use `env.*.example` as a checklist only.

## Variable precedence

- Server reads `server/.env` (and `dotenv/config`). For Docker, env is passed via `docker-compose` or runtime.
- Frontend build injects `VITE_*` at build time from root `.env` or build args.
