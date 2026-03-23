# Deployment: cPanel (frontend) + Render (API) — HTTPS & zero mixed content

## ملخص سريع (عربي)

1. **الواجهة (cPanel):** فعّل شهادة SSL لـ `palma.ps`، ارفع مجلد **`dist/`** بعد `npm run build` — يتضمن **`dist/.htaccess`** (إعادة توجيه HTTP→HTTPS + `Content-Security-Policy: upgrade-insecure-requests`).
2. **الـ API (Render):** الرابط دائماً **`https://`**. اضبط **`VITE_API_URL`** في بيئة البناء ثم أعد البناء.
3. **Render — متغيرات:** `FRONTEND_URL=https://palma.ps,https://www.palma.ps` حتى يعمل CORS والكوكيز.
4. **اختياري:** ربط **`api.palma.ps`** بـ Render عبر CNAME، ثم `VITE_API_URL=https://api.palma.ps`.
5. **التحقق:** DevTools → لا تحذيرات Mixed Content؛ طلبات الشبكة كلها **`https://`**.

---

## Target URLs

| Role | URL |
|------|-----|
| **Frontend** | `https://palma.ps` (and `https://www.palma.ps` if used) |
| **API** | `https://<your-service>.onrender.com` **or** custom `https://api.palma.ps` → Render |

---

## 1. Frontend — cPanel (`https://palma.ps`)

### SSL

1. In cPanel → **SSL/TLS Status** (or Let’s Encrypt): issue/install a certificate for `palma.ps` (and `www` if needed).
2. Force **HTTPS** for visitors.

### `.htaccess` (Apache)

On **`npm run build`**, Vite writes **`dist/.htaccess`** from `deploy/cpanel-htaccess`:

- **301** redirect HTTP → HTTPS  
- **`Content-Security-Policy: upgrade-insecure-requests`** (browser upgrades passive mixed content)  
- **`X-Content-Type-Options: nosniff`**, **`Referrer-Policy`**

Upload the **entire** `dist/` folder to `public_html` (or subdomain docroot). Ensure **`dist/.htaccess`** is present (leading dot — enable “show hidden files” in FTP/cPanel File Manager).

If you merge into an existing `.htaccess`, copy the rules from `deploy/cpanel-htaccess`.

**Requirements:** `mod_rewrite`, `mod_headers` (most cPanel hosts enable these).

### SPA routing

If routes like `/shop` 404 on refresh, add an Apache fallback to `index.html` (see cPanel docs or your host’s “SPA” snippet).

---

## 2. Backend — Render (HTTPS)

- Render terminates **TLS** for `*.onrender.com` automatically.
- Your service URL is **`https://<name>.onrender.com`** (never `http://` in production config).

### Render environment variables (minimum)

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://palma.ps,https://www.palma.ps` |
| `JWT_SECRET` | long random secret |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | from Supabase dashboard |

`FRONTEND_URL` must list the **exact** browser origins (scheme + host, no trailing slash) so CORS and cookies work from `https://palma.ps`.

### Optional: custom API domain `api.palma.ps`

1. Render dashboard → your Web Service → **Custom Domains** → add `api.palma.ps`.
2. DNS (cPanel / registrar): **CNAME** `api` → `<service>.onrender.com` (value Render shows).
3. Set frontend: **`VITE_API_URL=https://api.palma.ps`** and rebuild.

---

## 3. Frontend environment (build-time)

In **`.env`** (or CI secrets) before `npm run build`:

```env
VITE_API_URL=https://your-service.onrender.com
# or
# VITE_API_URL=https://api.palma.ps
```

Never set `VITE_API_URL=http://...` for production. The client upgrades mistaken `http://` bases on HTTPS pages, but the correct fix is **HTTPS in env**.

---

## 4. Runtime protection (already in repo)

| Layer | Behavior |
|-------|----------|
| **`api/client.ts`** | `sanitizeJsonResponse` on successful `api()` calls; `getApiBase()` upgrades `http://` → `https://` for non-localhost on HTTPS pages. |
| **`utils/secureUrl.ts`** | Upgrades image/API string URLs; **production** `console.warn` once per URL when `http://` is normalized. |
| **`bootstrap/installHttpsPolicy.ts`** | Blocks insecure `fetch`/`XHR` from HTTPS pages (except localhost / same-origin HTTP dev). |
| **Vite production `index.html`** | Injected meta **`upgrade-insecure-requests`**. |

---

## 5. API responses — HTTPS image URLs (Render)

Server-side **`server/utils/ensureHttpsUrl.js`** rewrites **`image_url`** / **`images`** on products and **`image_url`** on shop offers, and cart product snapshots. Upgrades are logged once per distinct URL (Winston).

If an external host **does not** serve HTTPS, upgrading the scheme may break the image; fix storage/CDN to HTTPS or use a proxy.

---

## 6. CORS

`server/middlewares/corsMiddleware.js` allows `https://palma.ps`, `https://www.palma.ps`, `https://api.palma.ps`, `https://palmaa.onrender.com`, and localhost dev origins. **`http://palmaa.onrender.com`** was removed — use **HTTPS** only for the public API URL.

---

## 7. Verification checklist

1. Open **`https://palma.ps`** — padlock valid, no certificate warnings.  
2. **DevTools → Network:** API calls go to **`https://`** Render (or `api.palma.ps`).  
3. **DevTools → Console:** no mixed content / blocked content errors.  
4. `curl -I https://palma.ps` — redirect from HTTP should be **301** to HTTPS if you hit `http://`.  
5. `curl -sS https://<api>/health` → JSON `{ "ok": true, ... }`.

---

## 8. Remaining “insecure” references (expected)

| Source | Notes |
|--------|--------|
| **`components/Logo.tsx`** `xmlns="http://www.w3.org/2000/svg"` | XML namespace only — **not** a network request. |
| **Docs / tests / `server/.env.example`** | `http://localhost` examples for **local dev** only. |
| **Coverage HTML** | Generated artifacts; ignore. |

---

## Final production checklist

- [ ] cPanel SSL active for `palma.ps`  
- [ ] `dist/.htaccess` deployed with HTTPS redirect + CSP  
- [ ] `VITE_API_URL` = `https://…onrender.com` or `https://api.palma.ps`  
- [ ] Render `FRONTEND_URL` includes `https://palma.ps`  
- [ ] Rebuild frontend after any env change  
- [ ] Smoke-test health + login/cart on production  
