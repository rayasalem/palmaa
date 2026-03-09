# Security

## Current measures

- **Helmet:** Security headers (X-Content-Type-Options, etc.) via `server/middlewares/security.js`.
- **Rate limiting:** General and payment-specific limiters; configurable via `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`.
- **CORS:** Restricted to `FRONTEND_URL` in production.
- **Env:** No secrets in repo; use env vars or secrets manager. `config/env.*.example` are templates only.
- **JWT:** Auth tokens with `JWT_SECRET` and expiry; cookie signing with `COOKIE_SECRET`.

## Recommendations

- Use HTTPS in production; set `X-Forwarded-Proto` correctly at Nginx so the app knows the original scheme.
- Keep dependencies updated: `npm audit` and fix high/critical; consider Dependabot.
- Validate and sanitize all API inputs; the app uses express.json and route-level validation where implemented.
- Protect admin and payment routes with role checks and strict rate limits (already applied on payment routes).
- Do not log secrets or full request bodies; use structured logging (e.g. Winston) with log level `info` in production.
