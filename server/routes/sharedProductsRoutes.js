/**
 * Public shared products routes: list by broker (for broker profile view).
 */

import express from 'express';
import * as sharedProductsController from '../controllers/sharedProductsController.js';

const router = express.Router();
router.get('/', sharedProductsController.listByBrokerId);

export default router;
