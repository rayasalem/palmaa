/**
 * Merchant routes: public profile, followers count, optional auth for is-following.
 */

import express from 'express';
import * as followController from '../controllers/followController.js';
import * as merchantController from '../controllers/merchantController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/:id/followers-count', followController.getFollowersCount);
router.get('/:id/following', optionalAuth, followController.getIsFollowing);
router.get('/:id', merchantController.getPublicProfile);

export default router;
