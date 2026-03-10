/**
 * Cart routes: per-user cart CRUD. All require authentication.
 * Multi-user: each request uses req.auth.sub as user_id.
 */

import express from 'express';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { cart as cartSchemas } from '../validation/schemas.js';
import * as cartController from '../controllers/cartController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('CUSTOMER', 'MERCHANT', 'BROKER', 'ADMIN'));

router.get('/', cartController.getCart);
router.post('/items', validate(cartSchemas.addItem, 'body', 'cart.addItem'), cartController.addItem);
router.patch(
  '/items/:productId',
  validate(cartSchemas.updateQuantity, 'body', 'cart.updateQuantity'),
  cartController.updateItem
);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;
