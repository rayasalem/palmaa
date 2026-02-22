# Environment Variables Guide – Full Project (Backend + Frontend)

This guide explains **which environment variables are required** for the Palma Marketplace to run and what each one does.

---

## Before you start: check you have these

Answer these so you know what to fill in:

1. **Do you have your Supabase project ready?**
   - You need: **Supabase project URL** and **Service Role Key** (from Supabase dashboard → Project Settings → API).
   - If not: create a project at [supabase.com](https://supabase.com), then get the URL and the **service_role** key (not the anon key for backend server use).

2. **Do you have an SMTP account for sending emails?**
   - You need: **host** (e.g. smtp.gmail.com), **port** (e.g. 587), **email/user**, **password** (or app-specific password for Gmail).
   - If not: use Gmail with an [App Password](https://support.google.com/accounts/answer/185833), or another SMTP provider (SendGrid, Mailgun, etc.).

3. **Do you have your frontend URL ready?**
   - **Local:** e.g. `http://localhost:3000` (or whatever port Vite uses).
   - **Production:** e.g. `https://your-app.vercel.app`. The backend uses this for CORS and for redirects (e.g. after sandbox payment).

4. **Do you have LogesTechs Company ID for the shipment API?**
   - If you use LogesTechs for shipments, you need the **Company ID** (e.g. 634). If not using shipments yet, you can set a placeholder; the shipment endpoint will fail until it’s correct.

---

## Backend environment variables

These go in **`server/.env`** (copy from `server/.env.example`). The backend reads them via `process.env`.

| Variable | Required | What it does |
|----------|----------|----------------|
| **SUPABASE_URL** | Yes | **URL of your Supabase project.** Example: `https://xxxxx.supabase.co`. Found in Supabase → Project Settings → API → Project URL. |
| **SUPABASE_SERVICE_KEY** | Yes | **Service Role Key** from Supabase (secret, server-only). Used for all backend Supabase calls (orders, users, OTPs). Found in Supabase → Project Settings → API → `service_role` (not the anon key). |
| **EMAIL_HOST** | Yes (for auth emails) | **SMTP server host.** Example: `smtp.gmail.com`. Your email provider’s SMTP host. |
| **EMAIL_PORT** | Yes (for auth emails) | **SMTP port.** Common: `587` (TLS), `465` (SSL). Gmail usually uses 587. |
| **EMAIL_USER** | Yes (for auth emails) | **SMTP username.** Usually your full email (e.g. `your-email@gmail.com`). |
| **EMAIL_PASS** | Yes (for auth emails) | **SMTP password or app-specific password.** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your normal password. |
| **FRONTEND_URL** | Yes (for CORS & redirects) | **URL of your frontend.** Used for CORS (allowed origin) and for redirects (e.g. after sandbox payment). Local: `http://localhost:3000`. Production: `https://your-app.vercel.app`. For multiple origins use a comma-separated list. |
| **LOGESTECHS_COMPANY_ID** | Yes (for shipment API) | **Company ID for LogesTechs shipment API.** Sent in the `company-id` header when creating shipments (e.g. `634`). |
| **PORT** | No (optional) | **Port the backend listens on.** Default in code: `5000`. Vercel often sets `PORT` automatically; locally you can set it or leave default. |
| **SANDBOX_PAYMENT_URL** | No (for sandbox flow) | **Base URL for sandbox payment page.** When the user “goes to pay,” they’re redirected here. Local: `http://localhost:5000/sandbox-pay`. Production: `https://your-backend.vercel.app/sandbox-pay`. If missing, a default placeholder is used. |

**Summary (backend):** Required for full run are **SUPABASE_URL**, **SUPABASE_SERVICE_KEY**, **EMAIL_HOST**, **EMAIL_PORT**, **EMAIL_USER**, **EMAIL_PASS**, **FRONTEND_URL**, **LOGESTECHS_COMPANY_ID**. **PORT** and **SANDBOX_PAYMENT_URL** are optional but recommended.

---

## Frontend environment variables

These go in **`.env`** in the **project root** (where the React/Vite app lives). Vite only exposes variables that start with **`VITE_`**.

| Variable | Required | What it does |
|----------|----------|----------------|
| **VITE_API_URL** | Yes (for checkout/auth API) | **Backend API base URL.** The frontend uses this for all API calls (orders, payment, shipment, auth). Local: `http://localhost:5000`. Production: `https://your-backend.vercel.app`. |
| **VITE_SUPABASE_URL** | If app uses Supabase from browser | **Supabase project URL** for client-side Supabase (if you use it in the React app). |
| **VITE_SUPABASE_ANON_KEY** | If app uses Supabase from browser | **Supabase anon (public) key** for client-side Supabase. Not the service role key. |
| Other `VITE_*` | Depends on features | e.g. Cloudinary, SendGrid, FlashLine – only needed if those features are used in the frontend. |

**Summary (frontend):** For the backend-connected flows (checkout, payment, shipment, auth), **VITE_API_URL** is the one that must be set correctly. Other `VITE_*` variables depend on your features.

---

## Different env for local vs production?

**Do you want different env for local and production?**

- **Yes (recommended):**
  - **Local:** Use **`.env`** files (e.g. `server/.env` and root `.env`). Never commit real secrets; use `.gitignore` for `.env`.
  - **Production (e.g. Vercel):** Set **Environment Variables** in the Vercel project dashboard (Settings → Environment Variables). Use Production (and optionally Preview) so every deploy uses the right values.
- **No:** You can use the same values everywhere, but usually local URLs (localhost) and production URLs (https) differ, so separate config is simpler and safer.

**Suggested setup:**

- **Local**
  - Create `server/.env` from `server/.env.example` and fill in Supabase, SMTP, `FRONTEND_URL`, `LOGESTECHS_COMPANY_ID`, etc.
  - Create root `.env` from `.env.example` and set at least `VITE_API_URL=http://localhost:5000`.
- **Production (Vercel)**
  - **Backend project:** Add every backend variable (SUPABASE_URL, SUPABASE_SERVICE_KEY, EMAIL_*, FRONTEND_URL, LOGESTECHS_COMPANY_ID, PORT if needed, SANDBOX_PAYMENT_URL with your production backend URL).
  - **Frontend project:** Add `VITE_API_URL` = your production backend URL (e.g. `https://your-api.vercel.app`), and any other `VITE_*` your app needs.

---

## Summary checklist for env setup

Use this to confirm you’re ready to run or deploy.

- [ ] **Supabase:** `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in **backend** env (e.g. `server/.env` or Vercel backend project).
- [ ] **SMTP:** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` are set in **backend** env (auth/OTP emails will use these).
- [ ] **Frontend URL:** `FRONTEND_URL` is set in **backend** env (local or production URL, no trailing slash usually).
- [ ] **LogesTechs:** `LOGESTECHS_COMPANY_ID` is set in **backend** env (e.g. 634) if you use the shipment API.
- [ ] **Backend URL for frontend:** `VITE_API_URL` is set in **frontend** env (root `.env` or Vercel frontend project) to your backend URL (local or production).
- [ ] **Optional:** `PORT` and `SANDBOX_PAYMENT_URL` set in backend when you need a custom port or sandbox payment URL.
- [ ] **Correct values:** Local uses localhost URLs where appropriate; production uses real Supabase keys, real SMTP, and production frontend/backend URLs.
- [ ] **Ready to run:** Backend can start with `npm run dev` / `npm start` in `server/`; frontend can start with `npm run dev` in root; or both are deployed on Vercel with the same variables set in the dashboard.

Once every item you need is checked, you’re ready to run the project locally or deploy.
