/**
 * Follow routes: follow/unfollow merchant. Auth required for write.
 */

import express from 'express';
import * as followController from '../controllers/followController.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/:merchantId', authenticate, followController.followMerchant);
router.delete('/:merchantId', authenticate, followController.unfollowMerchant);

export default router;
