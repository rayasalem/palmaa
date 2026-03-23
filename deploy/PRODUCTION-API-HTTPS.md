# Production API deployment: `https://api.palma.ps`

This guide assumes an **Ubuntu 22.04/24.04 LTS** (or similar) VPS with root/sudo, DNS control for `palma.ps`, and the app cloned to e.g. `/var/www/palma-marketplace`.

## 1. DNS

Create an **A record**:

| Name | Type | Value        | TTL |
|------|------|--------------|-----|
| `api`  | A    | Your VPS IP  | 300 |

Wait for propagation (`dig +short api.palma.ps`).

## 2. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # opens 80 and 443
sudo ufw enable
```

## 3. Install Node.js (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
```

## 4. Application & environment

```bash
sudo mkdir -p /var/www
sudo git clone <your-repo> /var/www/palma-marketplace
cd /var/www/palma-marketplace/server
sudo npm ci --omit=dev
```

Create **`/var/www/palma-marketplace/server/.env`** (copy from `server/.env.example`):

- `NODE_ENV=production`
- `HOST=127.0.0.1`
- `PORT=5000`
- `JWT_SECRET=<64+ char random>`
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- **`FRONTEND_URL=https://palma.ps,https://www.palma.ps`** (comma-separated; required for CORS/cookies from the web app)

Optional: `PALMA_SHOW_ENV_WARNINGS=true` once to log missing optional vars.

Build payment module if you use Arabic Bank routes:

```bash
cd /var/www/palma-marketplace && npm run build:payment
```

## 5. Systemd unit

```bash
sudo cp /var/www/palma-marketplace/deploy/systemd/palma-api.service /etc/systemd/system/
sudo nano /etc/systemd/system/palma-api.service   # fix User, paths if needed
sudo systemctl daemon-reload
sudo systemctl enable --now palma-api
sudo systemctl status palma-api
curl -sS http://127.0.0.1:5000/health
```

## 6. Nginx

```bash
sudo apt-get install -y nginx
```

### 6a. Certificates not created yet?

The full `api.palma.ps.conf` references `/etc/letsencrypt/live/...` which **does not exist** until Certbot runs. Pick one path:

**A — Recommended:** use Certbot’s Nginx plugin (it obtains certs and can merge server blocks):

```bash
sudo apt-get install -y certbot python3-certbot-nginx
# Minimal HTTP server on :80 so Certbot can bind (example: proxy to Node on 127.0.0.1:5000)
sudo certbot --nginx -d api.palma.ps
```

Then replace or merge with the repo’s `deploy/nginx/api.palma.ps.conf` so you keep **HSTS**, **body size**, and **proxy headers**, and run:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**B:** Obtain cert first, then enable the full config:

```bash
sudo certbot certonly --webroot -w /var/www/html -d api.palma.ps
# or: sudo certbot certonly --nginx -d api.palma.ps
sudo cp /var/www/palma-marketplace/deploy/nginx/api.palma.ps.conf /etc/nginx/sites-available/api.palma.ps
sudo ln -sf /etc/nginx/sites-available/api.palma.ps /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 7. Proxy headers (Express)

Nginx is configured with:

- `X-Forwarded-Proto: https`
- `X-Forwarded-For`
- `Host`

The app uses `trust proxy` in production and `httpsEnforce` middleware so HTTPS is enforced correctly behind Nginx.

## 8. Redirect HTTP → HTTPS

The provided `deploy/nginx/api.palma.ps.conf` **redirects all HTTP to HTTPS** (except ACME `/.well-known/` if you use webroot).

## 9. Smoke tests

From any machine:

```bash
export API_BASE=https://api.palma.ps
bash deploy/scripts/smoke-test-api.sh
```

Or PowerShell:

```powershell
$env:API_BASE = "https://api.palma.ps"
.\deploy\scripts\smoke-test-api.ps1
```

Manual checks:

```bash
curl -sS https://api.palma.ps/health
curl -sS https://api.palma.ps/api/status
curl -sS -o /dev/null -w "%{http_code}\n" http://api.palma.ps/health   # expect 301/308 to https
```

## 10. Frontend (no mixed content)

Set the browser app to call the API over **HTTPS** only:

```env
VITE_API_URL=https://api.palma.ps
```

Rebuild and deploy the Vite `dist/` to your static host (`palma.ps`).  
Do **not** use `http://api.palma.ps` in production.

## 11. Certificate renewal

Certbot installs a systemd timer. Test:

```bash
sudo certbot renew --dry-run
```

## 12. Optional: legacy HTTP assets

If an old integration still returns `http://` URLs, use the app’s `VITE_HTTP_LEGACY_PROXY` (see `docs/HTTPS-POLICY.md`) or fix data at the source.

## Troubleshooting

| Issue | Check |
|-------|--------|
| 502 Bad Gateway | `systemctl status palma-api`, `curl http://127.0.0.1:5000/health` |
| CORS errors | `FRONTEND_URL` includes exact origin (`https://palma.ps`) |
| Redirect loop | Nginx must send `X-Forwarded-Proto https`; Express `trust proxy` enabled |
| 413 Payload Too Large | Raise `client_max_body_size` in Nginx and `BODY_LIMIT_PRODUCTS_MB` in Express |
