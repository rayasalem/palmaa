import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as shipmentController from '../controllers/shipmentController.js';

const router = express.Router();
router.post('/create', authenticate, shipmentController.createShipment);
router.get('/status', authenticate, shipmentController.getStatus);
router.post('/print-pdf', authenticate, shipmentController.printPdf);
router.put('/:shipmentId/cancel', authenticate, shipmentController.cancel);

export default router;
