import express from 'express';
import * as addressController from '../controllers/addressController.js';

const router = express.Router();
router.get('/cities', addressController.getCities);
router.get('/villages', addressController.getVillages);

export default router;
