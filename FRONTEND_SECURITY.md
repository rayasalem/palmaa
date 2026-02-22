# Frontend Security Notes

- **Backend auth**: Use `POST /api/auth/login` with `credentials: 'include'` so the server can set an httpOnly cookie. The app already sends `credentials: 'include'` for checkout API and reset-password; use the same for login when using backend JWT.
- **Token storage**: Prefer httpOnly cookie (set by backend on login) over storing JWT in localStorage to reduce XSS token theft.
- **Secrets**: Never put API secrets in frontend code or in `VITE_*` env vars that are bundled. Only `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public anon key), etc. are safe.
- **Mock login**: In production build (`import.meta.env.PROD`), the mock fallback login (password `password`) is disabled; only Supabase or backend login is used.
- **Form validation**: Validate and sanitize on submit; backend always re-validates.
