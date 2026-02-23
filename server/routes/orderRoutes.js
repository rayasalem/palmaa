import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.get('/', authenticate, orderController.listMyOrders);
router.post('/', optionalAuth, orderController.createOrder);
router.patch('/:id/cancel', authenticate, orderController.cancelOrder);
router.patch('/:id/invoice', authenticate, orderController.updateOrderInvoice);
router.patch('/:id/complete', authenticate, requireRole('ADMIN'), orderController.completeOrder);
router.get('/:id', orderController.getOrder);

export default router;
