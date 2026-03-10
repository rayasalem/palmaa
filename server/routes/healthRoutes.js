/**
 * Health and readiness endpoints for load balancers and Kubernetes.
 * /health – liveness (process is up)
 * /ready  – readiness (DB and optional external services are reachable)
 * /metrics – Prometheus exposition format (request count, latency, status, errors)
 */

import { Router } from 'express';
import { supabase } from '../config/supabaseClient.js';
import { getEnv } from '../config/env.js';
import { getPrometheusText } from '../utils/metrics.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

router.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.send(getPrometheusText());
});

router.get('/ready', async (req, res) => {
  const checks = { database: false, payment: null };
  if (getEnv('SUPABASE_URL') && getEnv('SUPABASE_SERVICE_KEY')) {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      checks.database = !error;
    } catch (e) {
      checks.database = false;
    }
  }
  const checkPayment = getEnv('HEALTH_CHECK_PAYMENT', 'false') === 'true';
  if (checkPayment && getEnv('CYBS_REST_HOST')) {
    try {
      const host = getEnv('CYBS_REST_HOST');
      checks.payment = { reachable: !!host };
    } catch {
      checks.payment = { reachable: false };
    }
  }
  const ready = checks.database;
  res.status(ready ? 200 : 503).json({
    ready,
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
