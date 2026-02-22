# How to Run the Full Project Locally and in Production

This guide covers the **backend** (Node.js + Express + Supabase + NodeMailer) and **frontend** (React + Vite) for the Palma Marketplace.

---

## Before you start: answer these

1. **Do you want to run the project locally or deploy to Vercel?**
   - **Locally** → follow [Run locally](#run-locally) below.
   - **Production (Vercel)** → follow [Deploy to Vercel](#deploy-to-vercel) below.

2. **Which part do you want to start first: backend or frontend?**
   - **Backend first** (recommended): start the API so the frontend can call it.
   - **Frontend first**: you can run it, but API calls will fail until the backend is up.

3. **Do you have all environment variables set?**
   - **Backend:** `.env` in the `server/` folder (copy from `server/.env.example`).
   - **Frontend:** `.env` in the project root (copy from `.env.example`); at least `VITE_API_URL` for the backend URL.
   - **Supabase:** tables created (`orders`, `users`, `otp_codes`) – see server README for SQL.

If anything is missing, set it up before or while following the steps below.

---

## Run locally

### Backend (Node.js + Express + Supabase + NodeMailer)

1. **Go to the server folder**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   - Copy the example file: `cp .env.example .env` (or copy `server/.env.example` to `server/.env`).
   - Edit `server/.env` and set:
     - **Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
     - **SMTP:** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` (e.g. Gmail app password)
     - **Frontend:** `FRONTEND_URL=http://localhost:3000` (or the port your Vite app uses)
     - **Optional:** `PORT=5000`, `LOGESTECHS_COMPANY_ID=634`, `SANDBOX_PAYMENT_URL=http://localhost:5000/sandbox-pay`

4. **Start the backend**
   ```bash
   npm run dev
   ```
   Or, without nodemon:
   ```bash
   node server.js
   ```
   Or:
   ```bash
   npm start
   ```

5. **Confirm the backend is running**
   - Open in browser or use curl: **GET** `http://localhost:5000/health`
   - You should see something like: `{"ok":true,"timestamp":"..."}`

---

### Frontend (React + Vite)

1. **Go to the project root** (where `package.json` and `vite.config.ts` are)
   ```bash
   cd ..
   ```
   Or from anywhere:
   ```bash
   cd path/to/palma-marketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set backend URL**
   - Ensure `.env` exists in the **project root** (copy from `.env.example` if needed).
   - Set:
     ```
     VITE_API_URL=http://localhost:5000
     ```
   - Use the same port as your backend (default 5000).

4. **Start the frontend**
   ```bash
   npm run dev
   ```
   Vite will show a URL, usually `http://localhost:3000` (or another port if 3000 is busy).

5. **Open in browser**
   - Visit the URL Vite printed (e.g. `http://localhost:3000`).
   - You can now use the app; ensure the backend is running so API calls (auth, orders, payment, shipment) work.

---

## Deploy to Vercel (production)

### 1. Set environment variables on Vercel

- Open your **Vercel project** → **Settings** → **Environment Variables**.
- Add these for the **backend** project:

| Name | Value | Notes |
|------|--------|--------|
| PORT | (optional) | Vercel often sets this automatically |
| SUPABASE_URL | Your Supabase project URL | From Supabase dashboard |
| SUPABASE_SERVICE_KEY | Your Supabase service role key | From Supabase dashboard |
| EMAIL_HOST | e.g. smtp.gmail.com | SMTP server |
| EMAIL_PORT | 587 | SMTP port |
| EMAIL_USER | your-email@gmail.com | Sender email |
| EMAIL_PASS | Your app password | Gmail: use App Password |
| FRONTEND_URL | https://your-frontend.vercel.app | Your Vercel frontend URL (for CORS) |
| LOGESTECHS_COMPANY_ID | 634 | Or your company ID |
| SANDBOX_PAYMENT_URL | https://your-backend.vercel.app/sandbox-pay | Your deployed backend URL + `/sandbox-pay` |

- For the **frontend** project, add:
  - **VITE_API_URL** = `https://your-backend.vercel.app` (your deployed backend URL)

Apply to **Production** (and Preview if you want).

### 2. Deploy backend

- Backend is an Express app. On Vercel you can:
  - Deploy the `server` folder as a **separate Vercel project** (if you use a build step that runs `npm install` and `npm start`), or
  - Use Vercel’s Node.js runtime and point the project root to `server` and use **Start Command**: `npm start` / `node server.js`.
- After deploy, note the backend URL (e.g. `https://your-api.vercel.app`).

### 3. Deploy frontend

- Create a **second Vercel project** for the React app (root where `vite.config.ts` and root `package.json` are).
- **Build Command:** `npm run build` (or `tsc && vite build` if that’s your script).
- **Output Directory:** `dist` (Vite’s default).
- Set **VITE_API_URL** in this project’s env vars to your **backend URL**.
- Deploy; then set the backend’s **FRONTEND_URL** to this frontend URL so CORS works.

### 4. Test APIs in production

- Use the backend URL as base, e.g. `https://your-backend.vercel.app`.
- **Health:** `GET https://your-backend.vercel.app/health`
- **Auth:** `POST https://your-backend.vercel.app/api/auth/register` (body: email, password, name?, role?).
- **Orders:** `POST https://your-backend.vercel.app/api/orders` (with required body).
- If the frontend is deployed, open it in the browser and use the app; check the network tab to see requests to the backend.

---

## Optional: API testing tools

You can use **Postman**, **Insomnia**, or **curl** to hit the APIs.

**Base URL (local):** `http://localhost:5000`  
**Base URL (production):** `https://your-backend.vercel.app`

### Example calls (local; replace with your production URL if needed)

**Health**
```bash
curl http://localhost:5000/health
```

**Register (sends OTP email)**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123","name":"Test User","role":"CUSTOMER"}'
```

**Verify email (OTP)**
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

**Forgot password**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Reset password**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","newPassword":"newsecret123"}'
```

**Create order**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"recipient_name":"Jane Doe","address":"123 Main St","city":"Riyadh","phone":"+966501234567","amount":99.99,"weight":1.5}'
```

**Create payment (sandbox URL)**
```bash
curl -X POST http://localhost:5000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<order-uuid-from-create-order>","amount":9999,"return_url":"http://localhost:3000/"}'
```

**Payment callback (simulate success)**
```bash
curl -X POST http://localhost:5000/api/payment/callback \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<order-uuid>","status":"success"}'
```

**Create shipment**
```bash
curl -X POST http://localhost:5000/api/shipment/create \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<order-uuid>","recipient_name":"Jane Doe","address":"123 Main St","city":"Riyadh","phone":"+966501234567","weight":1.5}'
```

In **Postman / Insomnia**: same URLs and methods; set body to **raw → JSON** and use the same JSON as in the `-d` examples.

---

## Summary checklist for running the project

Use this to confirm everything is ready.

- [ ] **Backend running**
  - `cd server && npm install && npm run dev` (or `npm start`).
  - `GET /health` returns `{"ok":true,...}`.

- [ ] **Frontend running**
  - In project root: `npm install && npm run dev`.
  - Browser opens to the Vite URL (e.g. `http://localhost:3000`).

- [ ] **Supabase configured**
  - `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `server/.env`.
  - Tables created: `orders`, `users`, `otp_codes` (see `server/README.md` for SQL).

- [ ] **NodeMailer (SMTP) configured**
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` in `server/.env`.
  - Registration and forgot-password will send OTP emails when SMTP is valid.

- [ ] **APIs ready for testing**
  - Backend URL set in frontend as `VITE_API_URL` (e.g. `http://localhost:5000`).
  - Auth (register, verify-email, forgot-password, reset-password), orders, payment, and shipment endpoints respond as expected (use health check and the example calls above).

**Production (Vercel):**

- [ ] Backend and frontend env vars set in Vercel (see table above).
- [ ] Backend deployed and `FRONTEND_URL` set to the frontend URL.
- [ ] Frontend deployed with `VITE_API_URL` set to the backend URL.
- [ ] Production health and one or two API calls tested (e.g. register, create order).
