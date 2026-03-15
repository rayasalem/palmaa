/** Public: GET /api/offers — list active offers for shop/catalog */

import express from 'express';
import { getOffers } from '../controllers/offersController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
router.get('/', asyncHandler(getOffers));
export default router;
