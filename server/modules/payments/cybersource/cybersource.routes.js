import express from 'express';
import { createHostedSessionHandler, notificationHandler } from './cybersource.controller.js';
import { processRestPaymentHandler, testRestPaymentHandler } from './cybersource.rest.controller.js';

const router = express.Router();

// REST API (Simple Order) – main checkout; Sandbox only, no outlet_id/terminal_id.
router.post('/rest/process', express.json(), processRestPaymentHandler);
router.post('/rest/test', express.json(), testRestPaymentHandler);
router.all('/rest/process', (req, res) =>
  res.status(405).set('Allow', 'POST').json({ error: 'Method not allowed. Use POST.' })
);
router.all('/rest/test', (req, res) =>
  res.status(405).set('Allow', 'POST').json({ error: 'Method not allowed. Use POST.' })
);

// Hosted Checkout (Secure Acceptance) – NOT USED for checkout; kept only for legacy/notify.
router.post('/hosted-session', createHostedSessionHandler);
router.post('/notify', express.urlencoded({ extended: false }), notificationHandler);

export default router;
