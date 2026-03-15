/**
 * Merchant offers API: mounted at /api/merchant/offers so "offers" is never
 * interpreted as :id by the main merchant router (avoids "id must be a valid GUID").
 */

import express from 'express';
import * as merchantOffersController from '../controllers/merchantOffersController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { merchant as merchantSchemas } from '../validation/schemas.js';

const router = express.Router();

router.get('/', authenticate, requireRole('MERCHANT'), asyncHandler(merchantOffersController.list));
router.post('/', authenticate, requireRole('MERCHANT'), asyncHandler(merchantOffersController.create));
router.put('/:id', validate(merchantSchemas.idParam, 'params', 'merchantOffers.update'), authenticate, requireRole('MERCHANT'), asyncHandler(merchantOffersController.update));
router.delete('/:id', validate(merchantSchemas.idParam, 'params', 'merchantOffers.remove'), authenticate, requireRole('MERCHANT'), asyncHandler(merchantOffersController.remove));

export default router;
