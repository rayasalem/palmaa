/**
 * Cart routes: per-user cart CRUD. All require authentication.
 * Multi-user: each request uses req.auth.sub as user_id.
 */

import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as cartController from '../controllers/cartController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.patch('/items/:productId', cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;
