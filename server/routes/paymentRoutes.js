import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { validate } from '../middlewares/validate.js';
import { payment as paymentSchemas } from '../validation/schemas.js';

const router = express.Router();
router.post('/create', validate(paymentSchemas.create, 'body', 'payment.create'), paymentController.createPayment);
router.post(
  '/callback',
  validate(paymentSchemas.callback, 'body', 'payment.callback'),
  paymentController.paymentCallback
);
router.post(
  '/cybersource/charge',
  validate(paymentSchemas.cybersourceCharge, 'body', 'payment.cybersourceCharge'),
  paymentController.createCybersourceCharge
);

export default router;
