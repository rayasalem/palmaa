import express from 'express';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { adminOverview, merchantOverview } from '../controllers/analyticsController.js';

const router = express.Router();

// Admin overview: requires ADMIN role
router.get('/admin/overview', authenticate, requireRole('ADMIN'), asyncHandler(adminOverview));

// Merchant overview: requires MERCHANT role (uses auth.sub as merchant_id)
router.get('/merchant/overview', authenticate, requireRole('MERCHANT'), asyncHandler(merchantOverview));

export default router;

