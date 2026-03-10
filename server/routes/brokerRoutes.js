/**
 * Broker routes: shared products (persist to Supabase).
 */

import express from 'express';
import * as brokerController from '../controllers/brokerController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { broker as brokerSchemas } from '../validation/schemas.js';

const router = express.Router();
router.use(authenticate);
router.use(requireRole('BROKER'));

router.get('/shared-products', brokerController.listSharedProducts);
router.put(
  '/shared-products/:productId',
  validate(brokerSchemas.upsertSharedProduct, 'body', 'broker.upsertSharedProduct'),
  brokerController.upsertSharedProduct
);
router.delete('/shared-products/:productId', brokerController.removeSharedProduct);
router.patch('/shared-products/featured/:shareId', brokerController.toggleFeatured);

export default router;
