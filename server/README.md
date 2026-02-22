# Palma Marketplace – Backend

Node.js (Express) backend with Supabase, sandbox payment, and LogesTechs shipment API.

## Setup

1. **Install dependencies**
   ```bash
   cd server && npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
- Set: `PORT`, `SANDBOX_PAYMENT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LOGESTECHS_COMPANY_ID`, `FRONTEND_URL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` (replace with your SMTP credentials for auth emails)
  - For full flow: `SANDBOX_PAYMENT_URL=http://localhost:5000/sandbox-pay`, `FRONTEND_URL=http://localhost:3000`

3. **Supabase**
  - Create an `orders` table with columns: `id` (uuid, primary key), `status` (text), `payment_status` (text), `amount` (numeric), `recipient_name`, `address`, `city`, `phone`, `weight` (numeric), `customer_id` (uuid, nullable), `updated_at` (timestamptz), `shipment_id` (text), `shipment_status` (text).
   - Example:
     ```sql
     create table if not exists orders (
       id uuid primary key default gen_random_uuid(),
       status text default 'pending',
       payment_status text default 'pending',
       amount numeric,
       recipient_name text,
       address text,
       city text,
       phone text,
       weight numeric,
       customer_id uuid references users(id),
       updated_at timestamptz default now(),
       shipment_id text,
       shipment_status text
     );
     ```
   - Optional: create `order_items` for line items (product_id, quantity, price):
     ```sql
     create table if not exists order_items (
       id uuid primary key default gen_random_uuid(),
       order_id uuid not null references orders(id) on delete cascade,
       product_id uuid not null,
       quantity int not null default 1,
       price numeric not null default 0,
       created_at timestamptz default now()
     );
     ```
   - For products (merchant catalog): create `products` with at least: id (uuid), merchant_id (uuid), title, name, description, price, price_ils, stock, category, status, is_active, images (jsonb or text[]), image_url, created_at, updated_at.
   - For auth (email confirmation + password reset OTP), create `users` and `otp_codes` tables. Add `status` (text, e.g. PENDING/APPROVED/REJECTED) and `phone` to users if using admin approval:
     ```sql
     create table if not exists users (
       id uuid primary key default gen_random_uuid(),
       email text unique not null,
       password text not null,
       name text,
       role text default 'CUSTOMER',
       is_email_verified boolean default false,
       created_at timestamptz default now(),
       updated_at timestamptz default now()
     );
     create table if not exists otp_codes (
       id uuid primary key default gen_random_uuid(),
       email text not null,
       code text not null,
       type text not null check (type in ('email_verification', 'password_reset')),
       expires_at timestamptz not null,
       created_at timestamptz default now()
     );
     ```

## Run

- **Development:** `npm run dev` (nodemon)
- **Production:** `npm start`

## Vercel deployment

- **Environment variables:** In the Vercel project dashboard, set:
  - `PORT` (Vercel usually assigns automatically; optional to set)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
  - `FRONTEND_URL` (your Vercel frontend URL, e.g. `https://your-app.vercel.app`) so CORS allows the frontend
  - `LOGESTECHS_COMPANY_ID`
  - `SANDBOX_PAYMENT_URL` (your backend URL + `/sandbox-pay` when deployed)
- **CORS:** The server allows origins from `FRONTEND_URL`. For multiple origins use a comma-separated list.
- **Start script:** The app uses `npm start` → `node server.js` and reads `process.env.PORT || 5000`.

## Environment variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default 5000) |
| SANDBOX_PAYMENT_URL | Sandbox payment base URL (use `http://localhost:5000/sandbox-pay` for full flow) |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_KEY | Supabase service role key |
| LOGESTECHS_COMPANY_ID | LogesTechs company-id header (default 634) |
| SHIPMENT_API_BASE | LogesTechs API base URL (default https://apisv2.logestechs.com/api) |
| LOGESTECHS_EMAIL | LogesTechs account email (required for create shipment / cancel) |
| LOGESTECHS_PASSWORD | LogesTechs account password (required for create shipment / cancel) |
| FRONTEND_URL | Frontend origin for sandbox redirect (e.g. http://localhost:3000) |
| EMAIL_HOST | SMTP host (e.g. smtp.gmail.com) |
| EMAIL_PORT | SMTP port (e.g. 587) |
| EMAIL_USER | SMTP user / sender email |
| EMAIL_PASS | SMTP password or app password (replace with real credentials) |

## API list

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/orders | Create order (body: recipient_name, address, city, phone, amount, weight, items?). Optional JWT for customer_id. |
| GET | /api/orders | List current user's orders (auth required). |
| GET | /api/orders/:id | Get order by id (with items if order_items exists). |
| GET | /api/products | List active products (public). |
| GET | /api/products/merchant/:merchantId | List products by merchant (public). |
| GET | /api/products/:id | Get product by id (public). |
| POST | /api/products | Create product (auth: MERCHANT). |
| PUT | /api/products/:id | Update product (auth: MERCHANT, owner only). |
| DELETE | /api/products/:id | Delete product (auth: MERCHANT, owner only). |
| POST | /api/payment/create | Create payment; body: orderId, amount, return_url. Returns sandbox payment URL. |
| POST | /api/payment/callback | Payment result; body: orderId, status (success\|failed). Updates order to paid/failed. |
| POST | /api/shipment/create | Create shipment; body: orderId, ... Calls LogesTechs, saves shipment_id and shipment_status to order. |
| GET | /sandbox-pay | Serves sandbox payment page. |
| GET | /health | Health check. |
| POST | /api/auth/login | Login; body: email, password. Sets httpOnly JWT cookie. |
| POST | /api/auth/logout | Clear JWT cookie. |
| GET | /api/auth/me | Current user (auth required). |
| POST | /api/auth/register | Register; body: email, password, name?, role?. Sends OTP email. |
| POST | /api/auth/verify-email | Verify email; body: email, otp. |
| POST | /api/auth/forgot-password | Forgot password; body: email. |
| POST | /api/auth/reset-password | Reset password; body: email, otp, newPassword. |
| POST | /api/auth/resend-verification | Resend OTP; body: email. |
| GET | /api/admin/users | List users (auth: ADMIN). |
| PATCH | /api/admin/users/:id/status | Update user status (auth: ADMIN); body: status. |
| GET | /api/admin/orders | List all orders (auth: ADMIN). |
| POST | /api/follow/:merchantId | Follow merchant (auth: CUSTOMER only). |
| DELETE | /api/follow/:merchantId | Unfollow merchant (auth). |
| GET | /api/merchant/:id/followers-count | Get follower count (public). |
| GET | /api/merchant/:id/following | Check if current user follows (optional auth). |
| POST | /api/products/:id/like | Like product (auth). |
| DELETE | /api/products/:id/like | Unlike product (auth). |
| GET | /api/products/:id/likes-count | Get likes count (public). |
| GET | /api/products/:id/liked | Check if current user liked (optional auth). |
| POST | /api/products/:id/comment | Add comment (auth: CUSTOMER; rate limited). |
| GET | /api/products/:id/comments | List comments (public). |
| GET | /api/notifications | List notifications (auth). |
| PATCH | /api/notifications/:id/read | Mark notification read (auth). |

## Sandbox and test instructions

- **Full flow:** Set `SANDBOX_PAYMENT_URL=http://localhost:5000/sandbox-pay`. From frontend checkout, user is redirected to this page, clicks “Pay (Success)” or “Cancel (Fail)”, then is redirected back to frontend with `?orderId=...&payment=success|failed`.
- **Simulate callback only:** Open `http://localhost:5000/test-payment.html`, enter an order ID, click “Simulate success” or “Simulate failure” to call `POST /api/payment/callback` without going through the sandbox page.
- **LogesTechs:** Ensure `LOGESTECHS_COMPANY_ID=634` (or your company id). All required fields must be present and weight > 0.
