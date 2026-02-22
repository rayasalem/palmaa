/**
 * Admin routes: list users, update user status, list orders.
 * All require authenticate + ADMIN role.
 */

import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/orders', adminController.getOrders);
router.get('/products', adminController.getProducts);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

export default router;
