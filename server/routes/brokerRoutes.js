/**
 * Broker routes: shared products (persist to Supabase).
 */

import express from 'express';
import * as brokerController from '../controllers/brokerController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(authenticate);
router.use(requireRole('BROKER'));

router.get('/shared-products', brokerController.listSharedProducts);
router.put('/shared-products/:productId', brokerController.upsertSharedProduct);
router.delete('/shared-products/:productId', brokerController.removeSharedProduct);
router.patch('/shared-products/featured/:shareId', brokerController.toggleFeatured);

export default router;
