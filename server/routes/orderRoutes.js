import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { orders as orderSchemas } from '../validation/schemas.js';

const router = express.Router();
router.get('/', authenticate, validate(orderSchemas.listQuery, 'query', 'orders.list'), orderController.listMyOrders);
router.get(
  '/merchant',
  authenticate,
  requireRole('MERCHANT'),
  validate(orderSchemas.listQuery, 'query', 'orders.listMerchant'),
  orderController.listMerchantOrders
);
router.post('/', optionalAuth, validate(orderSchemas.create, 'body', 'orders.create'), orderController.createOrder);
router.patch('/:id/cancel', authenticate, orderController.cancelOrder);
router.patch('/:id/invoice', authenticate, orderController.updateOrderInvoice);
router.patch('/:id/complete', authenticate, requireRole('ADMIN'), orderController.completeOrder);
router.get('/:id', optionalAuth, orderController.getOrder);
router.patch('/:id/claim', authenticate, orderController.claimOrder);

export default router;
