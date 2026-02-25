/**
 * Supabase client for server-side operations.
 * Uses service role key; never expose SUPABASE_SERVICE_KEY to the client.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// دعم الاسمين (Supabase يسميه أحياناً service_role)
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) missing. Set in .env / Render Environment.');
}

// تحذير: الباكند يجب أن يستخدم مفتاح service_role وليس anon (وإلا تسجيل الدخول يفشل)
try {
  const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64').toString());
  if (payload.role === 'anon' || payload.aud === 'anon') {
    console.error('[supabaseClient] ERROR: You are using the ANON key. Backend MUST use the SERVICE ROLE key (Supabase Dashboard → Settings → API → service_role). Login will fail until you fix this.');
  }
} catch (_) {}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

export { supabase };
