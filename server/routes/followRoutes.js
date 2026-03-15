/**
 * Follow routes: follow/unfollow merchant. Auth required for write.
 */

import express from 'express';
import * as followController from '../controllers/followController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { follow as followSchemas } from '../validation/schemas.js';

const router = express.Router();

router.post(
  '/:merchantId',
  authenticate,
  validate(followSchemas.merchantParam, 'params', 'follow.merchant'),
  asyncHandler(followController.followMerchant)
);
router.delete(
  '/:merchantId',
  authenticate,
  validate(followSchemas.merchantParam, 'params', 'follow.merchant'),
  asyncHandler(followController.unfollowMerchant)
);

export default router;
