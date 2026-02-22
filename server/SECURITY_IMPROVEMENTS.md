# Security Hardening & Production Refactor

## 1. Environment Security

- **All secrets in env**: No API keys or passwords in code. Use `.env` and `.env.example` as template.
- **dotenv**: Loaded at startup via `import 'dotenv/config'`.
- **Validation**: `config/env.js` validates required env at startup (optional list; extend `required` for strict deploy).
- **.env.example**: Documents all variables without real values; removed hardcoded email.

## 2. Payment Security (Arabic Bank & Sandbox)

- **Redirect-based flow**: Payment creates a URL; user redirects to bank/sandbox. No card data on our server.
- **Webhook signature**: Arabic Bank module verifies `x-arabic-bank-signature` (HMAC-SHA256) before updating order.
- **Idempotency**: Payment callback accepts `Idempotency-Key` (or `X-Idempotency-Key`). Duplicate keys return cached result; prevents double processing.
- **Logging**: Payment events logged without card/token; `sanitizeForLog` redacts sensitive fields.
- **Validation**: All payment request bodies validated (orderId, amount, status).

## 3. Authentication & Authorization

- **JWT**: `services/jwtService.js` issues and verifies JWT with expiration (`JWT_EXPIRES_IN`, default 7d).
- **Bcrypt**: Passwords hashed with **12 rounds** (was 10).
- **Login endpoint**: `POST /api/auth/login` (email + password) validates against `users` table, returns user and sets **httpOnly cookie** with JWT.
- **Logout**: `POST /api/auth/logout` clears cookie.
- **RBAC**: `middlewares/authMiddleware.js` – `authenticate`, `requireRole(...roles)`, `optionalAuth`. Use for protected routes, e.g. `router.get('/admin', authenticate, requireRole('ADMIN'), ...)`.
- **Privilege escalation**: Role comes from JWT payload (set at login from DB); do not trust client-supplied role.

## 4. Encryption

- **AES-256-GCM**: `security/encryption.js` – `encrypt(plaintext)` / `decrypt(base64)` for sensitive fields. Key: 32-byte hex in `ENCRYPTION_KEY`.
- **Token hashing**: `hashToken(token)` (SHA-256) for storing one-time tokens without plaintext.
- **Password reset**: OTP invalidated after use; password updated server-side with bcrypt.

## 5. API Protection

- **Rate limiting**: `express-rate-limit` – general (200/15min), auth (10/15min), payment (20/min).
- **Helmet**: Security headers (CSP in production, HSTS, etc.).
- **CORS**: Uses `FRONTEND_URL`; credentials allowed for cookie auth.
- **Request validation**: Auth and payment bodies validated in controllers; extend with Joi/Zod if needed.
- **Sanitization**: `security/sanitize.js` – `sanitizeString`, `sanitizeObject` to reduce XSS/injection in logs and display.
- **SQL injection**: Supabase client uses parameterized queries; no raw SQL concatenation.
- **Global error handler**: `middlewares/errorHandler.js` – returns JSON error; **stack traces only in non-production**.
- **Body size**: `express.json({ limit: '1mb' })` to avoid large payloads.

## 6. Database Hardening

- **Indexes**: Add indexes on frequently queried columns (e.g. `users.email`, `orders.status`, `otp_codes.email,type`) in Supabase.
- **UUID**: Use UUID for primary keys where applicable (Supabase default).
- **Timestamps**: `created_at` / `updated_at` used in orders and users.
- **Mass assignment**: Controllers only pass allowed fields to services; no `req.body` spread into DB.

## 7. Logging & Monitoring

- **Winston**: `utils/logger.js` – structured logs with timestamp and level.
- **Request logging**: `middlewares/requestLogger.js` – logs method, url, status, duration, IP (no body).
- **No sensitive data**: `sanitizeForLog` redacts password, token, secret, authorization, cookie, otp, code, card.
- **Separate errors**: Error handler logs with `logger.error`; stack only in development.

## 8. Project Structure

- **config/**: env validation, Supabase client.
- **routes/**: Express routers.
- **controllers/**: Request/response, validation, call services.
- **services/**: Business logic, DB, external APIs.
- **middlewares/**: security, auth, requestLogger, errorHandler, httpsEnforce.
- **utils/**: logger (and sanitizeForLog).
- **security/**: encryption, sanitize.

## 9. Production Settings

- **HTTPS**: `middlewares/httpsEnforce.js` – in production, redirects HTTP to HTTPS when `x-forwarded-proto` is set.
- **Cookies**: JWT in httpOnly, secure in production, sameSite strict.
- **x-powered-by**: Disabled.
- **Compression**: Enabled (gzip).
- **Graceful shutdown**: SIGTERM/SIGINT close server and exit; 10s timeout then force exit.

## 10. Frontend Security

- **Backend login**: Use `POST /api/auth/login` with `credentials: 'include'` so the httpOnly cookie is sent and stored by the browser. Do not store the JWT in localStorage when using cookie auth.
- **Secrets**: No API keys or secrets in frontend code; use `VITE_*` only for non-secret config (e.g. API URL).
- **Forms**: Validate and sanitize on submit; backend re-validates.
- **Tampering**: Critical actions (e.g. role change, payment) must be authorized server-side (JWT + role).

## Critical Vulnerabilities Addressed

1. **Hardcoded credentials**: Removed from .env.example; all secrets from env.
2. **Weak bcrypt**: Salt rounds increased to 12.
3. **No rate limiting**: Added per-route and global limits.
4. **Stack traces in production**: Hidden by error handler.
5. **Missing security headers**: Added via Helmet.
6. **Duplicate payment processing**: Idempotency key support in payment callback.
7. **Token in localStorage**: Backend login uses httpOnly cookie; frontend can adopt same for API calls.

## Optional Next Steps

- Add Joi or Zod schemas for all request bodies.
- Store idempotency keys in Redis/DB for multi-instance deployments.
- Add audit log for admin actions.
- Use ENCRYPTION_KEY to encrypt sensitive columns (e.g. PII) at rest.
