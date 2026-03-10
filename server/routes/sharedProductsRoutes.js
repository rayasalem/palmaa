/**
 * Public shared products routes: list by broker (for broker profile view).
 */

import express from 'express';
import * as sharedProductsController from '../controllers/sharedProductsController.js';
import { validate } from '../middlewares/validate.js';
import { sharedProducts as sharedProductsSchemas } from '../validation/schemas.js';

const router = express.Router();
router.get(
  '/',
  validate(sharedProductsSchemas.listQuery, 'query', 'sharedProducts.list'),
  sharedProductsController.listByBrokerId
);

export default router;
