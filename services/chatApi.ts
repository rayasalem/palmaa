/**
 * Chat API – calls backend POST /api/chat for AI support replies.
 * On 503 or any error, returns null so the UI can use local FAQ fallback.
 */

import { getApiBase, getAuthHeaders } from '../api/client';

export interface ChatMessage {
  text: string;
  isBot: boolean;
}

export interface ChatReplyResponse {
  reply: string;
}

/**
 * Request a reply from the AI support backend.
 * @param messages - Full conversation (including the new user message)
 * @param lang - 'ar' | 'en' | 'he'
 * @param role - User role or null for guest
 * @returns AI reply text, or null if AI unavailable (use local getBotReply)
 */
export async function getReplyFromAI(
  messages: ChatMessage[],
  lang: string,
  role: string | null
): Promise<string | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({ text: m.text, isBot: m.isBot })),
        lang: lang || 'ar',
        role: role || null,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && typeof (data as ChatReplyResponse).reply === 'string') {
      return (data as ChatReplyResponse).reply.trim();
    }

    return null;
  } catch {
    return null;
  }
}
