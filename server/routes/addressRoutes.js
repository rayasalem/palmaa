import express from 'express';
import { validate } from '../middlewares/validate.js';
import { address as addressSchemas } from '../validation/schemas.js';
import * as addressController from '../controllers/addressController.js';

const router = express.Router();
router.get('/cities', addressController.getCities);
router.get(
  '/villages',
  validate(addressSchemas.getVillagesQuery, 'query', 'address.getVillages'),
  addressController.getVillages
);

export default router;
