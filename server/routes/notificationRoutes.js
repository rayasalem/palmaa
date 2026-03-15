/**
 * Notification routes: list, mark read. Auth required.
 */

import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notification as notificationSchemas } from '../validation/schemas.js';

const router = express.Router();

router.use(authenticate);

router.get('/', validate(notificationSchemas.listQuery, 'query', 'notification.list'), asyncHandler(notificationController.list));
router.patch('/:id/read', asyncHandler(notificationController.markRead));

export default router;
