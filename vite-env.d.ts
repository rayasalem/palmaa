/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** When set, http:// asset URLs are rewritten to this HTTPS proxy with ?url=encoded */
  readonly VITE_HTTP_LEGACY_PROXY?: string;
  /** Default true: allow http://localhost and 127.0.0.1 for API during local dev */
  readonly VITE_ALLOW_HTTP_LOCALHOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
