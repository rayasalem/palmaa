/**
 * Environment validation at startup.
 * All secrets must be in env; never hardcode.
 */

const required = [{ key: 'JWT_SECRET', allowEmpty: false }];

function hasSupabaseEnv() {
  const a = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const b = process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY;
  return (a && String(process.env.SUPABASE_URL).trim()) || (b && String(process.env.VITE_SUPABASE_URL).trim());
}

const optionalButRecommended = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'FRONTEND_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'REDIS_URL', // for shared product cache across instances; omit to use in-memory cache
];

function getEnv(key, defaultValue = '') {
  const v = process.env[key];
  return v != null && String(v).trim() !== '' ? v.trim() : defaultValue;
}

function validateEnv() {
  const missing = [];
  for (const { key, allowEmpty } of required) {
    const v = process.env[key];
    if (v == null || (allowEmpty === false && String(v).trim() === '')) {
      missing.push(key);
    }
  }
  if (!hasSupabaseEnv()) {
    console.warn('[config] Supabase env missing (VITE_SUPABASE_URL+VITE_SUPABASE_ANON_KEY or SUPABASE_*). Server will start but DB routes will fail. Set them in Render Environment.');
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}. Check .env and Render Environment.`);
  }

  const isProd = getEnv('NODE_ENV') === 'production';
  const shouldLogEnvWarnings = getEnv('PALMA_SHOW_ENV_WARNINGS', 'false') === 'true';
  if (isProd && shouldLogEnvWarnings) {
    const recommended = optionalButRecommended.filter((key) => !getEnv(key));
    if (recommended.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('[config] Production: consider setting:', recommended.join(', '));
    }
    const jwtSecret = getEnv('JWT_SECRET') || getEnv('JWT_SECRET_KEY');
    if (!jwtSecret) {
      // eslint-disable-next-line no-console
      console.warn(
        'WARNING: JWT_SECRET not set – tokens are signed with a fallback secret. Configure JWT_SECRET in the server environment.'
      );
    }
    const supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY');
    if (supabaseServiceKey) {
      // eslint-disable-next-line no-console
      console.warn(
        'WARNING: Check SUPABASE_SERVICE_KEY security – ensure it is stored only in server environment variables, not in source control.'
      );
    }
  }
}

function isProduction() {
  return getEnv('NODE_ENV') === 'production';
}

export { validateEnv, getEnv, isProduction };
