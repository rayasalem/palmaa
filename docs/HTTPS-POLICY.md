# HTTPS-only policy (frontend)

## Behavior

1. **`bootstrap/installHttpsPolicy.ts`** runs **first** in `index.tsx` and patches:
   - `globalThis.fetch`
   - `XMLHttpRequest.prototype.open`

2. **`utils/httpsPolicy.ts`**
   - **`enforceFetchUrlPolicy()`** — Blocks `http://` requests when they would cause mixed content or insecure calls:
     - On an **HTTPS** page, `http://` to non-localhost hosts is **rejected** (`HttpsPolicyError`).
     - On an **HTTP** dev server (e.g. Vite `http://localhost:3000`), **same-origin** `http://` API calls are **allowed**.
     - **`http://localhost` / `127.0.0.1`** remain allowed for local API (disable with `VITE_ALLOW_HTTP_LOCALHOST=false`).
   - **`VITE_HTTP_LEGACY_PROXY`** — If set, `http://` URLs are rewritten to  
     `YOUR_PROXY?url=<encodeURIComponent(original)>` so your **HTTPS** proxy can fetch legacy HTTP servers.

3. **`utils/secureUrl.ts`** — Still upgrades display/API string URLs to HTTPS; in **development**, logs **once per URL** when raw `http://` (non-localhost) is seen.

4. **Production `index.html`** — Vite injects  
   `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`  
   so the browser upgrades subresources where possible.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_HTTP_LEGACY_PROXY` | HTTPS URL of your proxy for legacy `http://` backends |
| `VITE_ALLOW_HTTP_LOCALHOST` | Default allow `http://localhost` for API; set `false` to forbid |

## Axios

The app uses **native `fetch`** only. If you add `axios`:

```ts
import axios from 'axios';
import { enforceFetchUrlPolicy } from './utils/httpsPolicy';

axios.interceptors.request.use((config) => {
  if (config.url) {
    config.url = enforceFetchUrlPolicy(
      config.baseURL ? new URL(config.url, config.baseURL).href : config.url
    );
  }
  return config;
});
```

## External dependencies

`index.html` uses **https://** for fonts and esm.sh (dev tooling). Keep all third-party script/link URLs on HTTPS.

## Self-hosted API (Nginx + TLS)

See **[deploy/PRODUCTION-API-HTTPS.md](../deploy/PRODUCTION-API-HTTPS.md)** for `api.palma.ps`, Let’s Encrypt, and `VITE_API_URL=https://api.palma.ps`.
