import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Check if Supabase is configured with valid URL and Key
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(env.SUPABASE.URL && env.SUPABASE.ANON_KEY && isValidUrl(env.SUPABASE.URL));

/**
 * Auth is handled by our backend (/api/auth/*), not Supabase Auth on the client.
 * We only use this client for Storage. To avoid NavigatorLockAcquireTimeoutError
 * (e.g. multiple tabs or React Strict Mode), we disable session persistence and
 * use a no-op lock so the auth client doesn't block on the Web Locks API.
 */
const supabaseAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
  lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
};

export const supabase = isSupabaseConfigured
  ? createClient(env.SUPABASE.URL, env.SUPABASE.ANON_KEY, { auth: supabaseAuthOptions })
  : null;
