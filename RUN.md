# Palma Marketplace – Run Guide

Step-by-step instructions to install, run, and connect the frontend and backend without authentication errors.

---

## Prerequisites

- **Node.js** 18+ (LTS)
- **npm** 9+
- **Supabase account** (for database)

---

## 1. Install Dependencies

### Frontend (root)

```bash
npm install
```

### Backend (server)

```bash
cd server
npm install
cd ..
```

---

## 2. Environment Variables

### Frontend (root)

Copy `.env.example` to `.env` in the project root (optional; defaults work for local dev):

```bash
cp .env.example .env
```

Edit `.env` if needed:

- **VITE_API_URL** – Backend API URL. Default: `http://localhost:5000` if not set.

### Backend (server)

Copy `server/.env.example` to `server/.env` and fill in values:

```bash
cp server/.env.example server/.env
```

**Required** for DB and auth (prevents 401 / 429 errors):

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase **service role** key (Settings → API) | `eyJhbGci...` |
| `JWT_SECRET` | Secret for JWT (64+ char hex recommended) | `a1b2c3...` (run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `FRONTEND_URL` | Frontend origin(s), comma-separated | `http://localhost:3000,http://127.0.0.1:3000` |

Optional (emails, shipment, payments):

- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` – SMTP for OTP/verification
- `LOGESTECHS_EMAIL`, `LOGESTECHS_PASSWORD`, `LOGESTECHS_COMPANY_ID` – Shipment API
- `SANDBOX_PAYMENT_URL` – Payment sandbox

---

## 3. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from Settings → API
3. Run SQL in Supabase SQL Editor:
   - `supabase/setup.sql`
   - `server/db/schema-follow-interaction.sql`
   - `supabase/migrations/002_carts_and_admin_messages.sql` (if present)

---

## 4. Run Backend (TypeScript auth + hot reload)

From project root:

```bash
cd server
npm run dev
```

- Uses **nodemon** for hot reload on file changes
- Listens on **http://localhost:5000**
- TypeScript auth: run `npm run build` first to compile `auth/` and `types/` to `dist/`

Or from root:

```bash
npm run dev:server
```

---

## 5. Run Frontend (TypeScript)

From project root:

```bash
npm run dev
```

- Uses **Vite** with React + TypeScript
- Dev server on **http://localhost:3000**
- Hot module replacement

---

## 6. Link Frontend to Backend

1. **API base URL**: Frontend uses `VITE_API_URL` (or `http://localhost:5000` by default)
2. **CORS**: Backend allows `FRONTEND_URL` (set in `server/.env`). Use both `http://localhost:3000` and `http://127.0.0.1:3000` if you switch between them
3. **Auth**: JWT stored in httpOnly cookie; frontend sends `credentials: 'include'` on every API request

Ensure:

- Backend runs **first** (port 5000)
- Frontend runs on port 3000
- Access frontend at **same origin** as in `FRONTEND_URL` (e.g. `http://localhost:3000`, not `http://127.0.0.1:3000` if only `localhost` is in CORS)

---

## 7. Run Both at Once (single command)

From project root:

```bash
npm run start:all
```

Runs frontend (Vite) and backend (nodemon) in parallel. Use `Ctrl+C` to stop both.

---

## Scripts Summary

| Script | Location | Command |
|--------|----------|---------|
| `npm run dev` | root | Frontend (Vite) |
| `npm run dev:server` | root | Backend (nodemon) |
| `npm run start:all` | root | Frontend + Backend |
| `npm run build` | root | Frontend build |
| `npm run dev` | server | Backend (nodemon) |
| `npm run start` | server | Backend (node) |
| `npm run build` | server | Compile TS auth module |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **401 Unauthorized** on `/api/auth/me`, `/api/cart` | 1. Ensure backend is running. 2. Login first (JWT cookie set on login). 3. Use same origin for frontend as in `FRONTEND_URL`. 4. Check `JWT_SECRET` is set in `server/.env`. |
| **429 Too Many Requests** on register/login | Auth rate limit (default 200/15min per IP). Wait 15 min or restart server. Set `AUTH_RATE_LIMIT_MAX=500` in `server/.env` for dev. |
| **CORS errors** | Add your frontend origin to `FRONTEND_URL` in `server/.env`, e.g. `http://localhost:3000,http://127.0.0.1:3000` |
| **DB connection failed** | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role, not anon) in `server/.env` |
| **Auth routes 404** | Run `cd server && npm run build` to compile TypeScript auth module |
| **TypeError: reading 'payload'** | Ensure frontend is built and cart/auth responses are handled safely (fixed in code) |
