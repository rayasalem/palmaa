import express from 'express';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { adminOverview, merchantOverview } from '../controllers/analyticsController.js';

const router = express.Router();

// Admin overview: requires ADMIN role
router.get('/admin/overview', authenticate, requireRole('ADMIN'), adminOverview);

// Merchant overview: requires MERCHANT role (uses auth.sub as merchant_id)
router.get('/merchant/overview', authenticate, requireRole('MERCHANT'), merchantOverview);

export default router;

