import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { payment as paymentSchemas } from '../validation/schemas.js';

const router = express.Router();
router.post('/create', validate(paymentSchemas.create, 'body', 'payment.create'), asyncHandler(paymentController.createPayment));
router.post(
  '/callback',
  validate(paymentSchemas.callback, 'body', 'payment.callback'),
  asyncHandler(paymentController.paymentCallback)
);
router.post(
  '/cybersource/charge',
  validate(paymentSchemas.cybersourceCharge, 'body', 'payment.cybersourceCharge'),
  asyncHandler(paymentController.createCybersourceCharge)
);

export default router;
