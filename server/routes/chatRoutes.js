/**
 * Chat API: POST / — AI support bot reply.
 * No auth required (public support widget). Rate limiting is applied by generalLimiter in server.js.
 */

import express from 'express';
import { validate } from '../middlewares/validate.js';
import { chat as chatSchemas } from '../validation/schemas.js';
import * as chatController from '../controllers/chatController.js';

const router = express.Router();

router.post('/', validate(chatSchemas.post, 'body', 'chat.post'), chatController.chat);

export default router;
