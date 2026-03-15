/**
 * Cart routes: per-user cart CRUD. All require authentication.
 * Multi-user: each request uses req.auth.sub as user_id.
 */

import express from 'express';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cart as cartSchemas } from '../validation/schemas.js';
import * as cartController from '../controllers/cartController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('CUSTOMER', 'MERCHANT', 'BROKER', 'ADMIN'));

router.get('/', asyncHandler(cartController.getCart));
router.post('/items', validate(cartSchemas.addItem, 'body', 'cart.addItem'), asyncHandler(cartController.addItem));
router.patch(
  '/items/:productId',
  validate(cartSchemas.updateQuantity, 'body', 'cart.updateQuantity'),
  asyncHandler(cartController.updateItem)
);
router.delete('/items/:productId', asyncHandler(cartController.removeItem));
router.delete('/', asyncHandler(cartController.clearCart));

export default router;
