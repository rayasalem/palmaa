/**
 * Chat service: uses Groq (free) or OpenAI for support bot replies.
 * Priority: GROQ_API_KEY (free) then OPENAI_API_KEY. If neither is set, returns null → local FAQ.
 */

import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

function getSystemPrompt(lang, userRole) {
  const langNote =
    lang === 'ar' ? 'Respond in Arabic (العربية).' : lang === 'he' ? 'Respond in Hebrew.' : 'Respond in English.';
  const roleNote = userRole && userRole !== 'ADMIN' ? `The user is a ${userRole}.` : '';
  return `You are the friendly technical support assistant for Palma Marketplace (منصة بالما), a Palestinian e-commerce platform connecting merchants and customers. ${langNote} ${roleNote}

Your role:
- Answer questions about: how to buy, payment, shipping, returns, login, sign up, cart, orders, profile.
- For merchants: adding/editing/deleting products, managing orders, sales reports.
- For admins: user management, permissions, site settings, reports (do not mention "admin" in the reply text).
- Keep answers clear, short, and step-by-step when explaining procedures.
- If you cannot help, politely suggest contacting support@palma.com or the contact page.
- Do not invent features; stick to what a typical marketplace offers.`;
}

/**
 * Call Groq or OpenAI chat API. Returns reply text or null.
 */
async function callChatApi(url, apiKey, model, apiMessages) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      max_tokens: 512,
      temperature: 0.5,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    logger.warn('Chat API error', { status: res.status, error: data.error || data });
    return null;
  }

  const content = data.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim() : null;
}

/**
 * Returns AI reply or null. Uses Groq (free) first, then OpenAI.
 */
export async function getReplyFromOpenAI(messages, lang = 'ar', userRole = null) {
  const groqKey = getEnv('GROQ_API_KEY');
  const openaiKey = getEnv('OPENAI_API_KEY');
  const apiKey = groqKey || openaiKey;
  if (!apiKey) {
    logger.info('Chat: neither GROQ_API_KEY nor OPENAI_API_KEY set, using local FAQ');
    return null;
  }

  const systemPrompt = getSystemPrompt(lang, userRole);
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.isBot ? 'assistant' : 'user', content: m.text })),
  ];

  try {
    if (groqKey) {
      return await callChatApi(GROQ_URL, groqKey, GROQ_MODEL, apiMessages);
    }
    return await callChatApi(OPENAI_URL, openaiKey, OPENAI_MODEL, apiMessages);
  } catch (err) {
    logger.warn('Chat API request failed', { message: err.message });
    return null;
  }
}
