/**
 * Environment validation at startup.
 * All secrets must be in env; never hardcode.
 */

const required = [];

const optionalButRecommended = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'FRONTEND_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
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
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}. Check .env and .env.example.`);
  }

  const isProd = getEnv('NODE_ENV') === 'production';
  if (isProd) {
    const recommended = optionalButRecommended.filter((key) => !getEnv(key));
    if (recommended.length > 0) {
      console.warn('[config] Production: consider setting:', recommended.join(', '));
    }
  }
}

function isProduction() {
  return getEnv('NODE_ENV') === 'production';
}

export { validateEnv, getEnv, isProduction };
