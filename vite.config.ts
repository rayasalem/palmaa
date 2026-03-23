import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Production: copy `public/htaccess` → `dist/.htaccess` for cPanel Apache. */
function copyCpanelHtaccess(mode: string): { name: string; closeBundle: () => void } {
  return {
    name: 'copy-cpanel-htaccess',
    closeBundle() {
      if (mode !== 'production') return;
      const src = path.join(__dirname, 'deploy', 'cpanel-htaccess');
      const dest = path.join(__dirname, 'dist', '.htaccess');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('[vite] Copied deploy/cpanel-htaccess → dist/.htaccess (cPanel HTTPS + CSP)');
      }
    },
  };
}

/** Production only: tell the browser to upgrade passive mixed content (defense in depth). */
function cspUpgradeInsecureRequests(mode: string): {
  name: string;
  transformIndexHtml(html: string): string;
} {
  return {
    name: 'csp-upgrade-insecure-requests',
    transformIndexHtml(html: string) {
      if (mode !== 'production') return html;
      if (html.includes('Content-Security-Policy')) return html;
      return html.replace(
        '<head>',
        `<head>
    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), cspUpgradeInsecureRequests(mode), copyCpanelHtaccess(mode)],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor';
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('@supabase')) return 'supabase';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
  },
}));
