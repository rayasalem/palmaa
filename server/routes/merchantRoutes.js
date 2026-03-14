/**
 * Merchant routes: public profile, followers count, optional auth for is-following.
 * GET /dashboard: merchant-only dashboard (subscription + stats).
 */

import express from 'express';
import * as followController from '../controllers/followController.js';
import * as merchantController from '../controllers/merchantController.js';
import * as merchantOffersController from '../controllers/merchantOffersController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { merchant as merchantSchemas } from '../validation/schemas.js';

const router = express.Router();

router.get('/dashboard', authenticate, requireRole('MERCHANT'), merchantController.getDashboard);
router.get('/offers', authenticate, requireRole('MERCHANT'), merchantOffersController.list);
router.post('/offers', authenticate, requireRole('MERCHANT'), merchantOffersController.create);
router.put('/offers/:id', authenticate, requireRole('MERCHANT'), merchantOffersController.update);
router.delete('/offers/:id', authenticate, requireRole('MERCHANT'), merchantOffersController.remove);
router.get(
  '/:id/followers-count',
  validate(merchantSchemas.idParam, 'params', 'merchant.followersCount'),
  followController.getFollowersCount
);
router.get(
  '/:id/following',
  validate(merchantSchemas.idParam, 'params', 'merchant.following'),
  optionalAuth,
  followController.getIsFollowing
);
router.get(
  '/:id',
  validate(merchantSchemas.idParam, 'params', 'merchant.publicProfile'),
  merchantController.getPublicProfile
);

export default router;
