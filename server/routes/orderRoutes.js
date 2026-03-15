import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { orders as orderSchemas } from '../validation/schemas.js';

const router = express.Router();
router.get('/', authenticate, validate(orderSchemas.listQuery, 'query', 'orders.list'), asyncHandler(orderController.listMyOrders));
router.get(
  '/merchant',
  authenticate,
  requireRole('MERCHANT'),
  validate(orderSchemas.listQuery, 'query', 'orders.listMerchant'),
  asyncHandler(orderController.listMerchantOrders)
);
router.post('/', optionalAuth, validate(orderSchemas.create, 'body', 'orders.create'), asyncHandler(orderController.createOrder));
router.patch('/:id/cancel', authenticate, asyncHandler(orderController.cancelOrder));
router.patch('/:id/invoice', authenticate, asyncHandler(orderController.updateOrderInvoice));
router.patch('/:id/complete', authenticate, requireRole('ADMIN'), asyncHandler(orderController.completeOrder));
router.get('/:id', optionalAuth, asyncHandler(orderController.getOrder));
router.patch('/:id/claim', authenticate, asyncHandler(orderController.claimOrder));

export default router;
