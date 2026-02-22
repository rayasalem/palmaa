/**
 * Supabase client for server-side operations.
 * Uses service role key; never expose SUPABASE_SERVICE_KEY to the client.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_SERVICE_KEY missing. Set in .env.');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

export { supabase };
