# Deployment artifacts

| Path | Purpose |
|------|---------|
| [PRODUCTION-API-HTTPS.md](./PRODUCTION-API-HTTPS.md) | **Nginx + Let’s Encrypt + systemd** for `https://api.palma.ps` |
| [nginx/api.palma.ps.conf](./nginx/api.palma.ps.conf) | Site config: HTTP→HTTPS redirect, reverse proxy to Node |
| [systemd/palma-api.service](./systemd/palma-api.service) | Run Node bound to `127.0.0.1:5000` |
| [scripts/smoke-test-api.sh](./scripts/smoke-test-api.sh) | Linux/macOS smoke tests |
| [scripts/smoke-test-api.ps1](./scripts/smoke-test-api.ps1) | Windows PowerShell smoke tests |
| [cpanel-htaccess](./cpanel-htaccess) | Copied to **`dist/.htaccess`** on production Vite build (HTTPS redirect + CSP) |

See **[docs/DEPLOYMENT-CPANEL-RENDER.md](../docs/DEPLOYMENT-CPANEL-RENDER.md)** for cPanel + Render + zero mixed content.

After deployment, set the frontend `VITE_API_URL` to your **HTTPS** Render URL (or `https://api.palma.ps`) and rebuild.
