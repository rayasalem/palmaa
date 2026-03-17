/**
 * Palma Marketplace Backend – production-ready.
 * Security: Helmet, rate limit, CORS, compression, JWT auth, env validation.
 * Run: npm run dev | npm start
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cluster from 'cluster';
import os from 'os';

const _dir = path.dirname(fileURLToPath(import.meta.url));
// تحميل .env: مسار مخصّص إن وُجد، ثم جذر المشروع و server/ (لا نستبدل قيم process.env)
if (process.env.PALMA_ENV_FILE) dotenv.config({ path: process.env.PALMA_ENV_FILE, override: false });
dotenv.config({ path: path.join(_dir, '..', '.env'), override: false });
dotenv.config({ path: path.join(_dir, '.env'), override: false });
dotenv.config({ override: false });

// على Render قد لا تصل VITE_* وقت التشغيل؛ ننسخ فقط عنوان Supabase (لا نستخدم ANON_KEY كـ SERVICE_KEY أبداً)
if (process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// SUPABASE_SERVICE_KEY must be set explicitly in server env; never fallback to VITE_SUPABASE_ANON_KEY for security.

// Log uncaught errors so Render/PM2 show the real cause of exit 1
process.on('uncaughtException', (err) => {
  const msg = err && err.message ? err.message : err;
  console.error('[FATAL] uncaughtException:', msg);
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason, _promise) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import fs from 'fs';

import { validateEnv, getEnv, isProduction } from './config/env.js';
import { corsMiddleware } from './middlewares/corsMiddleware.js';
import {
  helmetMiddleware,
  generalLimiter,
  paymentLimiter,
  cartLimiter,
  productListMinuteLimiter,
  cartMinuteLimiter,
  ordersMinuteLimiter,
} from './middlewares/security.js';
import cacheMiddleware from './middlewares/cacheMiddleware.js';
import httpsEnforce from './middlewares/httpsEnforce.js';
import requestIdMiddleware from './middlewares/requestId.js';
import requestLogger from './middlewares/requestLogger.js';
import csrfHeaderMiddleware from './middlewares/csrfHeaderMiddleware.js';
import metricsMiddleware from './middlewares/metricsMiddleware.js';
import requestTimeoutMiddleware from './middlewares/requestTimeout.js';
import errorHandler from './middlewares/errorHandler.js';
import sanitizeErrorResponse from './middlewares/sanitizeErrorResponse.js';

import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
// Use JS auth routes (dist/auth has wrong relative paths to middlewares when run from server/)
const { default: authRoutes } = await import('./routes/authRoutes.js');
import addressRoutes from './routes/addressRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import offersRoutes from './routes/offersRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import brokerRoutes from './routes/brokerRoutes.js';
import sharedProductsRoutes from './routes/sharedProductsRoutes.js';
import followRoutes from './routes/followRoutes.js';
import merchantRoutes from './routes/merchantRoutes.js';
import merchantOffersRoutes from './routes/merchantOffersRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import cybersourceHostedRoutes from './modules/payments/cybersource/cybersource.routes.js';
import { processRestPaymentHandler } from './modules/payments/cybersource/cybersource.rest.controller.js';

import logger from './utils/logger.js';

validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(getEnv('PORT')) || 5000;

// CORS: only explicitly allowed origins (corsMiddleware). Do not use origin: true to avoid allowing arbitrary origins with credentials.
app.use(corsMiddleware(getEnv('FRONTEND_URL')));

app.disable('x-powered-by');
// Trust first proxy (e.g. load balancer) so req.ip and rate limiting use client IP
if (isProduction()) app.set('trust proxy', 1);
app.use(helmetMiddleware());
if (isProduction()) app.use(httpsEnforce);
app.use(compression());
app.use(cookieParser(getEnv('COOKIE_SECRET')));
// Default JSON body limit for most routes: 2MB to protect memory.
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/products')) {
    return next();
  }
  return express.json({ limit: '2mb' })(req, res, next);
});
app.use(csrfHeaderMiddleware);

// requestId before limiters so 429 logs include requestId
app.use(requestIdMiddleware);
// Health and metrics before general limiter so load balancer and Prometheus always reach them
app.use('/', healthRoutes);
app.use('/api', healthRoutes);
// مسار صريح لضمان عمل /api/status بعد النشر (للتحقق من اتصال قاعدة البيانات)
app.get('/api/status', async (req, res) => {
  let database = false;
  try {
    const { supabase } = await import('./config/supabaseClient.js');
    const { error } = await supabase.from('users').select('id').limit(1);
    database = !error;
  } catch {
    database = false;
  }
  res.json({ ok: true, database });
});
app.use(generalLimiter());
app.use(requestLogger);
app.use(metricsMiddleware);
const requestTimeoutMs = Number(getEnv('REQUEST_TIMEOUT_MS')) || 15000;
app.use(requestTimeoutMiddleware(requestTimeoutMs));
logger.info('Request timeout middleware active', { timeoutMs: requestTimeoutMs });
app.use(sanitizeErrorResponse);

// API routes BEFORE static so /api/* never returns 404 when this server is hit
// Cybersource REST process – أول مسار لضمان عدم 404 (برودكشن). Timeout 15s so slow external API does not hang the request.
const cybersourceTimeoutMs = Number(getEnv('CYBERSOURCE_REQUEST_TIMEOUT_MS')) || 15000;
app.post('/api/payments/cybersource/rest/process', paymentLimiter(), (req, res, next) => {
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    if (!res.headersSent) {
      logger.warn('cybersource_rest_timeout', { requestId: req.id, timeoutMs: cybersourceTimeoutMs });
      res.status(503).json({ success: false, error: 'Payment request timeout. Please try again.' });
    }
  }, cybersourceTimeoutMs);
  res.once('finish', () => { settled = true; clearTimeout(timer); });
  processRestPaymentHandler(req, res).catch(next);
});
logger.info('Cybersource route registered: POST /api/payments/cybersource/rest/process');
app.use('/api/orders', ordersMinuteLimiter(), orderRoutes);
// Product routes: larger JSON for upload/edit. On Render use smaller limit to reduce memory spikes (set BODY_LIMIT_PRODUCTS_MB to override).
const productBodyLimitMb = Number(process.env.BODY_LIMIT_PRODUCTS_MB) || (process.env.RENDER === 'true' ? 5 : 15);
app.use(
  '/api/products',
  express.json({ limit: `${productBodyLimitMb}mb` }),
  productListMinuteLimiter(),
  cacheMiddleware(60),
  productRoutes
);

const paymentRouter = express.Router();
paymentRouter.use(paymentLimiter());
paymentRouter.use(paymentRoutes);
try {
  const { default: arabicBankPaymentRoutes } = await import('./payment/dist/index.js');
  paymentRouter.use(arabicBankPaymentRoutes);
  logger.info('Arabic Bank payment routes mounted');
} catch (e) {
  // هذه الوحدة اختيارية؛ في الإنتاج لا نريد أن تظهر كتحذير متكرر في اللوجز
  logger.info('Arabic Bank payment module not loaded (optional). To enable, run: npm run build:payment');
}
app.use('/api/payment', paymentRouter);

// Cybersource: باقي المسارات (hosted-session, notify, rest/test)
const paymentsApiRouter = express.Router();
paymentsApiRouter.use(paymentLimiter());
paymentsApiRouter.use('/cybersource', cybersourceHostedRoutes);
app.use('/api/payments', paymentsApiRouter);

app.use('/api/shipment', shipmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartLimiter(), cartMinuteLimiter(), cartRoutes);
app.use('/api/offers', cacheMiddleware(60), offersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/broker', brokerRoutes);
app.use('/api/shared-products', sharedProductsRoutes);
app.use('/api/follow', followRoutes);
// Mount offers before /api/merchant so GET /api/merchant/offers is not matched as /api/merchant/:id (id="offers")
app.use('/api/merchant/offers', merchantOffersRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

app.get('/sandbox-pay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sandbox-pay.html'));
});

// Serve frontend build.
// أولوية لـ server/public (build:for-render) ثم fallback إلى ../dist مباشرة (Vite default) لو public فاضي على السيرفر.
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, '..', 'dist');
const hasPublicIndex = fs.existsSync(path.join(publicDir, 'index.html'));
const hasDistIndex = fs.existsSync(path.join(distDir, 'index.html'));
const clientBuildDir = hasPublicIndex ? publicDir : hasDistIndex ? distDir : publicDir;

app.use(express.static(clientBuildDir));

// SPA fallback: أي مسار ليس /api/* ولم يتمّت مطابقته يرجع index.html
app.get('*', (req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(clientBuildDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  }
  return res.status(404).send('Frontend index.html not found');
});

// 404 JSON فقط لمسارات /api/* التي لم تُعرَّف
app.use((req, res) => {
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).send('Not found');
});
app.use(errorHandler);

function startHttpServer() {
  const server = app.listen(PORT, () => {
    logger.info('Server listening', {
      port: PORT,
      nodeEnv: getEnv('NODE_ENV') || 'development',
      pid: process.pid,
    });
  });

  function gracefulShutdown(signal) {
    logger.info('Received', { signal, pid: process.pid });
    server.close(() => {
      logger.info('Server closed', { pid: process.pid });
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown', { pid: process.pid });
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// On Render/small instances, multiple workers can exceed memory. Run single process by default on Render.
const isRender = process.env.RENDER === 'true';
const disableCluster =
  process.env.DISABLE_CLUSTER === '1' ||
  process.env.DISABLE_CLUSTER === 'true' ||
  isRender;
const maxWorkers = disableCluster ? 0 : Math.min(
  parseInt(process.env.NODE_CLUSTER_WORKERS || '', 10) || (isProduction() ? 1 : os.cpus().length || 1),
  os.cpus().length || 1
);
if (isRender && disableCluster) logger.info('Render: running single process to reduce memory usage.');

if (process.env.NODE_ENV !== 'test') {
  if (maxWorkers <= 0 || !cluster.isPrimary) {
    startHttpServer();
  } else {
    logger.info('Starting primary cluster process', { pid: process.pid, workerCount: maxWorkers });
    for (let i = 0; i < maxWorkers; i += 1) {
      cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
      logger.error('Worker exited', { pid: worker.process.pid, code, signal });
      if (!worker.exitedAfterDisconnect) {
        logger.info('Restarting worker', {});
        cluster.fork();
      }
    });
  }
}

export default app;
