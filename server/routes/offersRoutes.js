/** Public: GET /api/offers — list active offers for shop/catalog */

import express from 'express';
import { getOffers } from '../controllers/offersController.js';

const router = express.Router();
router.get('/', getOffers);
export default router;
