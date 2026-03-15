import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { shipment as shipmentSchemas } from '../validation/schemas.js';
import * as shipmentController from '../controllers/shipmentController.js';

const router = express.Router();
router.post(
  '/create',
  authenticate,
  validate(shipmentSchemas.create, 'body', 'shipment.create'),
  asyncHandler(shipmentController.createShipment)
);
router.get(
  '/status',
  authenticate,
  validate(shipmentSchemas.getStatusQuery, 'query', 'shipment.getStatus'),
  asyncHandler(shipmentController.getStatus)
);
router.post(
  '/print-pdf',
  authenticate,
  validate(shipmentSchemas.printPdf, 'body', 'shipment.printPdf'),
  asyncHandler(shipmentController.printPdf)
);
router.put('/:shipmentId/cancel', authenticate, asyncHandler(shipmentController.cancel));

export default router;
