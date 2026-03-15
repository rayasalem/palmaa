/**
 * Admin routes: list users, update user status, list orders, products, platform.
 * All require authenticate + ADMIN role. Central Joi validation on body/query.
 */

import express from 'express';
import * as adminController from '../controllers/adminController.js';
import * as offersController from '../controllers/offersController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { admin as adminSchemas } from '../validation/schemas.js';

const router = express.Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/users', validate(adminSchemas.listUsers, 'query', 'admin.listUsers'), asyncHandler(adminController.getUsers));
router.patch(
  '/users/:id/status',
  validate(adminSchemas.updateUserStatus, 'body', 'admin.updateUserStatus'),
  asyncHandler(adminController.updateUserStatus)
);
router.post(
  '/users/:id/delete',
  validate(adminSchemas.softDeleteUser, 'body', 'admin.softDeleteUser'),
  asyncHandler(adminController.softDeleteUser)
);
router.post('/users/:id/restore', asyncHandler(adminController.restoreUser));
router.get('/orders', validate(adminSchemas.listOrders, 'query', 'admin.listOrders'), asyncHandler(adminController.getOrders));
router.get(
  '/products',
  validate(adminSchemas.listProducts, 'query', 'admin.listProducts'),
  asyncHandler(adminController.getProducts)
);
router.put(
  '/products/:id',
  validate(adminSchemas.updateProduct, 'body', 'admin.updateProduct'),
  asyncHandler(adminController.updateProduct)
);
router.delete('/products/:id', asyncHandler(adminController.deleteProduct));
router.get('/settings', asyncHandler(adminController.getSettings));
router.patch(
  '/settings',
  validate(adminSchemas.updateSettings, 'body', 'admin.updateSettings'),
  asyncHandler(adminController.updateSettings)
);
router.get('/platform-earnings', asyncHandler(adminController.getPlatformEarnings));
// العروض — إدارة قسم العروض في المتجر
router.get('/offers', asyncHandler(offersController.getOffersAdmin));
router.post('/offers', asyncHandler(offersController.createOffer));
router.put('/offers/:id', asyncHandler(offersController.updateOffer));
router.delete('/offers/:id', asyncHandler(offersController.deleteOffer));

export default router;
