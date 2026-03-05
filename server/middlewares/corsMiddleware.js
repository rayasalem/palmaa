/**
 * CORS middleware – sets headers on every response and handles OPTIONS preflight.
 * Ensures Vercel (and other allowed origins) get Access-Control-* headers even if cors pkg fails.
 */

const ALLOWED_ORIGINS = [
  // الإنتاج الرئيسي على الدومين الرسمي
  'https://www.palma.ps',
  'https://palma.ps',
  // Render (واجهة + API قد تكون نفس المنشأ)
  'https://palmaa.onrender.com',
  'http://palmaa.onrender.com',
  // نسخة Vercel الاحتياطية / القديمة
  'https://palmaa.vercel.app',
  // التطوير المحلي
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Vite قد يختار منافذ أخرى (مثل 3001) إذا كان 3000 مستخدماً
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function getAllowedOrigins(envFrontendUrl) {
  const list = [...ALLOWED_ORIGINS];
  if (envFrontendUrl && typeof envFrontendUrl === 'string') {
    envFrontendUrl.split(',').forEach((u) => {
      const o = u.trim();
      if (o && !list.includes(o)) list.push(o);
    });
  }
  return list;
}

/**
 * @param {string} [frontendUrl] – FRONTEND_URL env (comma-separated origins)
 */
export function corsMiddleware(frontendUrl = '') {
  const allowed = getAllowedOrigins(frontendUrl);

  return (req, res, next) => {
    const origin = req.get('Origin');
    const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];

    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  };
}

export default corsMiddleware;
