# Frontend instructions: Email confirmation and password reset (OTP)

Use these flows with the backend auth endpoints. Show success or error messages clearly.

---

## 1. Registration page

- **Submit:** Collect email, password, name (optional), role (optional). POST to `POST /api/auth/register` with body: `{ email, password, name?, role? }`.
- **After submit:** Show message: **"Check your email for OTP"** (or similar). Do not log the user in yet; they must verify email first.
- **On error:** Display backend error (e.g. "An account with this email already exists", "Password must be at least 6 characters").

---

## 2. OTP verification page (email confirmation)

- **Input:** Email (can be pre-filled from registration) and 6-digit OTP code.
- **Submit:** POST to `POST /api/auth/verify-email` with body: `{ email, otp }`.
- **On success:** Show "Email verified successfully" and redirect to login or dashboard.
- **On error:** Show message (e.g. "Invalid or expired OTP").

---

## 3. Forgot password page

- **Input:** Email only.
- **Submit:** POST to `POST /api/auth/forgot-password` with body: `{ email }`.
- **After submit:** Show message: **"If an account exists for this email, you will receive a password reset code."** (Do not reveal whether the email exists.)
- **On error:** Show backend error if any (e.g. network error).

---

## 4. Reset password page

- **Input:** Email, 6-digit OTP code, new password (and confirm).
- **Submit:** POST to `POST /api/auth/reset-password` with body: `{ email, otp, newPassword }`.
- **On success:** Show "Password reset successfully" and redirect to login.
- **On error:** Show message (e.g. "Invalid or expired OTP", "New password must be at least 6 characters").

---

## API base URL

Use the same backend base URL as checkout (e.g. `VITE_API_URL` or `http://localhost:5000`). All auth routes are under `/api/auth/`.

---

## Troubleshooting (404 / 401)

- **404 on `/api/auth/me`**  
  The request is hitting a server that does not have the API routes (e.g. a static host). Fix: ensure the frontend’s API base URL is the **Node backend** that runs `server/server.js`. If the frontend is on a different host (e.g. Vercel), set `VITE_API_URL` to the backend URL (e.g. `https://palmaa.onrender.com` if that is where the Node app runs). The same host must serve both the SPA and the API, or `VITE_API_URL` must point to the API host.

- **401 on `/api/auth/login`**  
  The backend returns 401 when credentials are wrong or the account is restricted. The response body includes an `error` message, e.g.:
  - `Invalid credentials` – wrong email or password, or the user row has no `password` / password not stored as bcrypt.
  - `Account suspended. Contact support.` – status is SUSPENDED.
  - `Account deleted. Contact support within 30 days to restore.` – soft-deleted.

  Ensure the `users` table has a `password` column and that registration stores bcrypt hashes (the default backend does this). If you use a different DB schema, the login logic must read the same column used at registration.

**How to debug 401 on Render:**  
In Render → your backend service → **Logs**. After a failed login you should see one of:
- `[authService] login: no user found for email` → البريد غير مسجّل أو خاطئ.
- `[authService] login: user found but password empty in DB` → عمود كلمة المرور فارغ (تأكد أن التسجيل يخزن في عمود `password` وأن Supabase يستخدم **Service Role Key** في متغير `SUPABASE_SERVICE_KEY`).
- `[authService] login: bcrypt compare failed` → كلمة المرور خاطئة.
- `[authService] login: password in DB is not bcrypt format` → كلمة المرور في قاعدة البيانات ليست بصيغة bcrypt (يجب أن تبدأ بـ `$2a$` أو `$2b$`).
