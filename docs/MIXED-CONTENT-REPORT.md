# HTTPS enforcement & mixed content — architecture

## Goals

- No browser mixed-content warnings on HTTPS deployments.
- **Defense in depth:** sanitize JSON at the API boundary **and** normalize URLs at render time.

## Production: cPanel + Render

| Piece | Doc / artifact |
|-------|----------------|
| Frontend `https://palma.ps` (Apache redirect + CSP) | **[DEPLOYMENT-CPANEL-RENDER.md](./DEPLOYMENT-CPANEL-RENDER.md)** — `npm run build` writes **`dist/.htaccess`** from **`deploy/cpanel-htaccess`**. |
| API on Render (HTTPS) | Set **`VITE_API_URL`** to your Render HTTPS URL (e.g. `https://palmaa.onrender.com`) or **`https://api.palma.ps`** after custom domain. |
| Server image URLs | **`server/utils/ensureHttpsUrl.js`** upgrades `image_url` / `images` / offer banners in API responses; Winston logs once per URL. |

In **production**, `secureUrl()` also **`console.warn`** (once per distinct URL, capped) when `http://` strings are normalized — fix upstream DB/CDN when you see these logs.

## 1. Core utility — `utils/secureUrl.ts`

| Export | Role |
|--------|------|
| `secureUrl()` | Upgrades `http://` → `https://`, `//` → `https://`; keeps `data:` / `blob:`; blocks `javascript:` / `file:`; warns on `ftp://` (not convertible to HTTPS for typical `<img>` / fetch). |
| `secureImageSrc()` | Safe `src` with https default fallback. |
| `setImageToPlaceholder()` | `onError` handler → `/placeholder.png`. |
| `sanitizeApiResponseDeep()` | Recursively walks successful API JSON; sanitizes known URL keys (`*_url`, `image_url`, `images[]`, etc.) and any string that is a **whole** `http(s)://` or `//` URL. |
| `isWholeUrlString()` | Detects single-URL strings (not prose). |
| `normalizeProductImageUrls` / `normalizeOfferImage` | Explicit normalizers (idempotent with deep sanitize). |

**Logging:** `console.warn` for schemes that cannot be treated as HTTPS (`javascript:`, `file:`, `ftp://`). In **production**, `logProdHttpNormalized` warns once per distinct `http://` URL upgraded to HTTPS. `import.meta.env.DEV` gates optional `console.debug` for successful `http→https` upgrades.

## 2. API client — `api/client.ts`

- **`sanitizeJsonResponse()`** — wraps `sanitizeApiResponseDeep`; used for all **`api()`** success responses.
- **`buildUrl()`** — if a caller passes an absolute `http(s)://` path, it is passed through `secureUrl()`.
- **`getApiBase()`** — on HTTPS pages, upgrades `VITE_API_URL` from `http://` to `https://` except for `localhost` / `127.0.0.1`.

## 3. Raw `fetch` services (same sanitization)

These bypass `api()` but now call **`sanitizeJsonResponse`** on success JSON:

- `services/productService.ts`
- `services/brokerApi.ts`
- `services/interactionApi.ts`
- `services/checkoutApi.ts`
- `services/authService.ts` (login + `getMe`)

## 4. UI — images

- Existing views use **`secureImageSrc` + `setImageToPlaceholder`** on `<img>` where data is user/API-driven.
- **`components/SecureImage.tsx`** — reusable wrapper (same behavior); use for new screens.

## 5. Vite environment

- `import.meta.env.DEV` / `import.meta.env.PROD` respected for debug verbosity.
- `.env.example`: document **`VITE_API_URL=https://...`** for production.

## Intentionally unchanged

- SVG `xmlns="http://www.w3.org/2000/svg"` in `Logo.tsx` (namespace, not a network request).
- Server-side / Cypress test URLs in non-frontend config files.
