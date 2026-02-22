# Auth implementation report: Email confirmation and password reset (OTP)

## 1. Files added

| File | Contents |
|------|----------|
| **server/services/emailService.js** | Nodemailer SMTP transporter from env (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS). `sendEmail(to, subject, text, html)`. Sample templates: `getEmailConfirmationTemplate(otpCode)`, `getPasswordResetTemplate(otpCode)`. Comments indicate where to replace SMTP credentials. |
| **server/services/authService.js** | `generateOtp()` (secure 6-digit via crypto.randomInt). `saveOtp(email, code, type)` to Supabase `otp_codes` with 15-min expiration. `findValidOtp`, `verifyOtp(email, otp, type)`, `invalidateOtp`. `hashPassword` (bcrypt), `updatePassword(email, newPassword)`. `registerUser({ email, password, name, role })`: insert user with is_email_verified=false, save OTP, send confirmation email. `forgotPassword(email)`: check user exists, save OTP, send reset email. `setEmailVerified(email)`. |
| **server/controllers/authController.js** | `registerUser`: validate email/password (min 6 chars), call authService.registerUser, return 201 with "Check your email for OTP" or 409 if email exists. `verifyEmail`: validate email and 6-digit otp, verifyOtp then setEmailVerified, return success/failure. `forgotPassword`: validate email, call authService.forgotPassword. `resetPassword`: validate email, otp, newPassword (min 6), verifyOtp then updatePassword, return success/failure. try/catch and logging throughout. |
| **server/routes/authRoutes.js** | POST `/register`, POST `/verify-email`, POST `/forgot-password`, POST `/reset-password` mapped to authController. |
| **server/FRONTEND_AUTH_INSTRUCTIONS.md** | Instructions for frontend: registration → "Check your email for OTP"; OTP verification page → POST /verify-email; forgot password → POST /forgot-password; reset password page → POST /reset-password; success/error messaging. |

**Updated files**

| File | Change |
|------|--------|
| **server/package.json** | Added dependencies: `nodemailer`, `bcrypt`. |
| **server/server.js** | Mounted `authRoutes` at `/api/auth`. |
| **server/.env.example** | Added EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS. |
| **server/README.md** | Documented auth env vars, Supabase `users` and `otp_codes` schema, auth API list. |

---

## 2. Endpoints added

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/auth/register | Validate email/password/name/role; insert user with is_email_verified=false; generate 6-digit OTP; save OTP with 15-min expiry in Supabase; send "Email Confirmation Code" email. Response: success and "Check your email for OTP". |
| POST | /api/auth/verify-email | Body: email, otp. Check OTP in Supabase and expiration; if valid, set is_email_verified=true; invalidate OTP. Response: success/failure. |
| POST | /api/auth/forgot-password | Body: email. Verify email exists; generate 6-digit OTP; save with expiration; send "Password Reset Code" email. Response: success (generic message). |
| POST | /api/auth/reset-password | Body: email, otp, newPassword. Verify OTP and expiration; hash newPassword with bcrypt; update user in Supabase; invalidate OTP. Response: success/failure. |

---

## 3. Email confirmation flow (OTP)

1. User submits registration (email, password, name, role) → **POST /api/auth/register**.
2. Backend validates data, inserts into `users` with `is_email_verified=false`, generates secure 6-digit OTP, saves into `otp_codes` (type `email_verification`, expires 15 min), sends email with subject "Email Confirmation Code" and body containing OTP and instructions.
3. User receives email and enters OTP on verification page → **POST /api/auth/verify-email** with `{ email, otp }`.
4. Backend finds matching OTP in `otp_codes`, checks expiration; if valid, sets `is_email_verified=true` on `users` and invalidates the OTP. Responds success or failure.

---

## 4. Password reset flow (OTP)

1. User enters email on forgot-password page → **POST /api/auth/forgot-password** with `{ email }`.
2. Backend checks email exists in `users`; generates 6-digit OTP; saves into `otp_codes` (type `password_reset`, 15 min expiry); sends email "Password Reset Code" with OTP and instructions.
3. User enters email, OTP, and new password on reset-password page → **POST /api/auth/reset-password** with `{ email, otp, newPassword }`.
4. Backend verifies OTP and expiration; hashes newPassword with bcrypt; updates `users.password`; invalidates OTP. Responds success or failure.

---

## 5. Validation and security

- **Validation:** Email and required fields validated in controller; password min 6 characters; OTP exactly 6 digits.
- **Passwords:** Hashed with bcrypt (salt rounds 10) before storing.
- **OTP:** Single-use (invalidated after successful verify-email or reset-password); 15-minute expiration; stored in Supabase `otp_codes`.
- **Errors:** try/catch in controllers; logging for debugging; no disclosure of whether email exists on forgot-password (generic success message).

---

## 6. Confirmation

The system is ready for testing:

- **Backend:** Run from `server/` with `.env` set (including SMTP: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS). Create Supabase tables `users` and `otp_codes` (see server README).
- **Frontend:** Follow `server/FRONTEND_AUTH_INSTRUCTIONS.md`: registration → show "Check your email for OTP"; verification page calls POST /api/auth/verify-email; forgot password calls POST /api/auth/forgot-password; reset password page calls POST /api/auth/reset-password with email, otp, newPassword. Show success and error messages clearly.
- **SMTP:** Replace EMAIL_* in `.env` with real credentials (e.g. Gmail app password) to send live emails; otherwise registration/forgot-password will fail to send and log "Email not configured" or send errors.
