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
    // تحذيرات أمان غير كاسرة عند بدء التشغيل
    const jwtSecret = getEnv('JWT_SECRET') || getEnv('JWT_SECRET_KEY');
    if (!jwtSecret) {
      // eslint-disable-next-line no-console
      console.warn('WARNING: JWT_SECRET not set – tokens are signed with a fallback secret. Configure JWT_SECRET in the server environment.');
    }
    const supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY');
    if (supabaseServiceKey) {
      // لا نستطيع معرفة إن كان المفتاح من داخل الريبو أم من البيئة، فنطبع تحذيراً عاماً.
      // الهدف تذكير الفريق بمراجعة أمن تخزين SUPABASE_SERVICE_KEY.
      // eslint-disable-next-line no-console
      console.warn('WARNING: Check SUPABASE_SERVICE_KEY security – ensure it is stored only in server environment variables, not in source control.');
    }
  }
}

function isProduction() {
  return getEnv('NODE_ENV') === 'production';
}

export { validateEnv, getEnv, isProduction };
