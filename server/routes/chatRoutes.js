/**
 * Chat API: POST / — AI support bot reply.
 * No auth required (public support widget). Rate limiting is applied by generalLimiter in server.js.
 */

import express from 'express';
import * as chatController from '../controllers/chatController.js';

const router = express.Router();

router.post('/', chatController.chat);

export default router;
