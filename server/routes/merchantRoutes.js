/**
 * Merchant routes: public profile, followers count, optional auth for is-following.
 * GET /dashboard: merchant-only dashboard (subscription + stats).
 * Offers are mounted at /api/merchant/offers via merchantOffersRoutes (see server.js).
 * Use UUID constraint on :id so only real UUIDs match.
 */

import express from 'express';
import * as followController from '../controllers/followController.js';
import * as merchantController from '../controllers/merchantController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { merchant as merchantSchemas } from '../validation/schemas.js';

const router = express.Router();

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';

router.get('/dashboard', authenticate, requireRole('MERCHANT'), asyncHandler(merchantController.getDashboard));
router.get(
  `/:id(${UUID})/followers-count`,
  validate(merchantSchemas.idParam, 'params', 'merchant.followersCount'),
  asyncHandler(followController.getFollowersCount)
);
router.get(
  `/:id(${UUID})/following`,
  validate(merchantSchemas.idParam, 'params', 'merchant.following'),
  optionalAuth,
  asyncHandler(followController.getIsFollowing)
);
router.get(
  `/:id(${UUID})`,
  validate(merchantSchemas.idParam, 'params', 'merchant.publicProfile'),
  asyncHandler(merchantController.getPublicProfile)
);

export default router;
