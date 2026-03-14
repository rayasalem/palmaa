/**
 * Admin routes: list users, update user status, list orders, products, platform.
 * All require authenticate + ADMIN role. Central Joi validation on body/query.
 */

import express from 'express';
import * as adminController from '../controllers/adminController.js';
import * as offersController from '../controllers/offersController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { admin as adminSchemas } from '../validation/schemas.js';

const router = express.Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/users', validate(adminSchemas.listUsers, 'query', 'admin.listUsers'), adminController.getUsers);
router.patch(
  '/users/:id/status',
  validate(adminSchemas.updateUserStatus, 'body', 'admin.updateUserStatus'),
  adminController.updateUserStatus
);
router.post(
  '/users/:id/delete',
  validate(adminSchemas.softDeleteUser, 'body', 'admin.softDeleteUser'),
  adminController.softDeleteUser
);
router.post('/users/:id/restore', adminController.restoreUser);
router.get('/orders', validate(adminSchemas.listOrders, 'query', 'admin.listOrders'), adminController.getOrders);
router.get(
  '/products',
  validate(adminSchemas.listProducts, 'query', 'admin.listProducts'),
  adminController.getProducts
);
router.put(
  '/products/:id',
  validate(adminSchemas.updateProduct, 'body', 'admin.updateProduct'),
  adminController.updateProduct
);
router.delete('/products/:id', adminController.deleteProduct);
router.get('/settings', adminController.getSettings);
router.patch(
  '/settings',
  validate(adminSchemas.updateSettings, 'body', 'admin.updateSettings'),
  adminController.updateSettings
);
router.get('/platform-earnings', adminController.getPlatformEarnings);
// العروض — إدارة قسم العروض في المتجر
router.get('/offers', offersController.getOffersAdmin);
router.post('/offers', offersController.createOffer);
router.put('/offers/:id', offersController.updateOffer);
router.delete('/offers/:id', offersController.deleteOffer);

export default router;
