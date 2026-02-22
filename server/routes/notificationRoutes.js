/**
 * Notification routes: list, mark read. Auth required.
 */

import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markRead);

export default router;
