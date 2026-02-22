import express from 'express';
import * as shipmentController from '../controllers/shipmentController.js';

const router = express.Router();
router.post('/create', shipmentController.createShipment);
router.get('/status', shipmentController.getStatus);
router.post('/print-pdf', shipmentController.printPdf);
router.put('/:shipmentId/cancel', shipmentController.cancel);

export default router;
