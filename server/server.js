/**
 * Palma Marketplace Backend – production-ready.
 * Security: Helmet, rate limit, CORS, compression, JWT auth, env validation.
 * Run: npm run dev | npm start
 */

import 'dotenv/config';

// Log uncaught errors so Render/PM2 show the real cause of exit 1
process.on('uncaughtException', (err) => {
  const msg = (err && err.message) ? err.message : err;
  console.error('[FATAL] uncaughtException:', msg);
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { validateEnv, getEnv, isProduction } from './config/env.js';
import { corsMiddleware } from './middlewares/corsMiddleware.js';
import {
  helmetMiddleware,
  generalLimiter,
  paymentLimiter,
} from './middlewares/security.js';
import cacheMiddleware from './middlewares/cacheMiddleware.js';
import httpsEnforce from './middlewares/httpsEnforce.js';
import requestLogger from './middlewares/requestLogger.js';
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
import brokerRoutes from './routes/brokerRoutes.js';
import sharedProductsRoutes from './routes/sharedProductsRoutes.js';
import followRoutes from './routes/followRoutes.js';
import merchantRoutes from './routes/merchantRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import cybersourceHostedRoutes from './modules/payments/cybersource/cybersource.routes.js';
import { processRestPaymentHandler } from './modules/payments/cybersource/cybersource.rest.controller.js';

import logger from './utils/logger.js';

validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(getEnv('PORT')) || 5000;

// CORS first: manual headers + OPTIONS 204 so preflight always gets Access-Control-* (fixes Render/Vercel)
app.use(corsMiddleware(getEnv('FRONTEND_URL')));
app.use(cors({ origin: true, credentials: true }));

app.disable('x-powered-by');
app.use(helmetMiddleware());
if (isProduction()) app.use(httpsEnforce);
app.use(compression());
app.use(cookieParser(getEnv('COOKIE_SECRET')));
// Allow larger payloads for product create/update (e.g. images as URLs or base64)
app.use(express.json({ limit: '15mb' }));

app.use(generalLimiter());
app.use(requestLogger);
app.use(sanitizeErrorResponse);

// API routes BEFORE static so /api/* never returns 404 when this server is hit
// Cybersource REST process – أول مسار لضمان عدم 404 (برودكشن)
app.post(
  '/api/payments/cybersource/rest/process',
  paymentLimiter(),
  (req, res, next) => processRestPaymentHandler(req, res).catch(next)
);
logger.info('Cybersource route registered: POST /api/payments/cybersource/rest/process');
app.use('/api/orders', orderRoutes);
app.use('/api/products', cacheMiddleware(600), productRoutes);

const paymentRouter = express.Router();
paymentRouter.use(paymentLimiter());
paymentRouter.use(paymentRoutes);
try {
  const { default: arabicBankPaymentRoutes } = await import(
    './payment/dist/index.js'
  );
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
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/broker', brokerRoutes);
app.use('/api/shared-products', sharedProductsRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/sandbox-pay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sandbox-pay.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info('Server listening', {
    port: PORT,
    nodeEnv: getEnv('NODE_ENV') || 'development',
  });
});

function gracefulShutdown(signal) {
  logger.info('Received', { signal });
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
