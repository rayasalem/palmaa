/**
 * Chat controller: POST /api/chat — body: { messages, lang, role }.
 * Returns { reply } from AI or 503 when AI is unavailable (frontend should use local fallback).
 */

import * as chatService from '../services/chatService.js';
import logger from '../utils/logger.js';

/**
 * POST /api/chat
 * Body: { messages: [{ text, isBot }], lang?: string, role?: string }
 * Response: { reply: string } or 503 with { error, fallback: true }
 */
export async function chat(req, res) {
  try {
    const { messages = [], lang = 'ar', role = null } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const lastUser = messages.filter((m) => !m.isBot).pop();
    if (!lastUser || !lastUser.text || !String(lastUser.text).trim()) {
      return res.status(400).json({ error: 'Last user message required' });
    }

    const reply = await chatService.getReplyFromOpenAI(
      messages,
      ['ar', 'en', 'he'].includes(lang) ? lang : 'ar',
      role || null
    );

    if (reply) {
      return res.status(200).json({ reply });
    }

    res.status(503).json({
      error: 'AI temporarily unavailable',
      fallback: true,
    });
  } catch (err) {
    logger.error('chat controller', { message: err.message });
    res.status(500).json({
      error: err.message || 'Internal server error',
      fallback: true,
    });
  }
}
