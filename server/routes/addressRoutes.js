import express from 'express';
import { validate } from '../middlewares/validate.js';
import { address as addressSchemas } from '../validation/schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as addressController from '../controllers/addressController.js';

const router = express.Router();
router.get('/cities', asyncHandler(addressController.getCities));
router.get('/districts-villages', asyncHandler(addressController.getDistrictsAndVillages));
router.get(
  '/villages',
  validate(addressSchemas.getVillagesQuery, 'query', 'address.getVillages'),
  asyncHandler(addressController.getVillages)
);

export default router;
