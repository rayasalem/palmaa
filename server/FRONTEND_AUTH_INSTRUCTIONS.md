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
