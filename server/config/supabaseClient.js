/**
 * Supabase client for server-side operations.
 * Uses service role key; never expose SUPABASE_SERVICE_KEY to the client.
 * يقرأ VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (كما في Render) أو SUPABASE_URL و SUPABASE_SERVICE_KEY.
 * إذا المتغيرات ناقصة لا يقع السيرفر — يُصدَّر stub حتى يعمل /health ويُصلَح الإعداد لاحقاً.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const _dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(_dir, '..', '..', '.env'), override: false });
dotenv.config({ path: path.join(_dir, '..', '.env'), override: false });

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ''
).trim();
const supabaseServiceKey = (
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

const NOT_CONFIGURED = { message: 'Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_SERVICE_KEY) in Render Environment.' };

function createStub() {
  const stubResult = Promise.resolve({ data: null, error: NOT_CONFIGURED });
  const chain = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'then' || prop === 'catch') return (a, b) => stubResult[prop](a, b);
        return () => chain;
      },
    }
  );
  return {
    from() {
      return chain;
    },
  };
}

let supabase;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn(
    'supabaseClient: Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_SERVICE_KEY) in Render Environment. Server will start but DB routes will fail.'
  );
  supabase = createStub();
} else {
  if (supabaseServiceKey.includes('.')) {
    try {
      const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64').toString());
      if (payload.role === 'anon' || payload.aud === 'anon') {
        logger.warn(
          'supabaseClient: Using ANON key. Backend should use SERVICE ROLE key (Supabase Dashboard → Settings → API → service_role) for login to work.'
        );
      }
    } catch (_) {
      /* ignore */
    }
  }
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export { supabase };
