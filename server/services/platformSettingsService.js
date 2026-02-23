/**
 * Platform settings (عمولة المنصة، غرامة الفاتورة الضريبية).
 * Used by transactionService and admin.
 */

import { supabase } from '../config/supabaseClient.js';

const TABLE = 'platform_settings';

const DEFAULTS = {
  commission_rate: 0.15,
  tax_penalty_rate: 0.16,
};

async function getSetting(key) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error('[platformSettingsService] getSetting error:', error.message);
    return { value: DEFAULTS[key] ?? null, error };
  }
  const raw = data?.value;
  const num = raw != null ? Number(raw) : NaN;
  const value = !Number.isNaN(num) ? num : (DEFAULTS[key] ?? raw);
  return { value, error: null };
}

async function getRates() {
  const [comm, tax] = await Promise.all([
    getSetting('commission_rate'),
    getSetting('tax_penalty_rate'),
  ]);
  return {
    commission_rate: comm.error ? DEFAULTS.commission_rate : comm.value,
    tax_penalty_rate: tax.error ? DEFAULTS.tax_penalty_rate : tax.value,
    error: comm.error || tax.error,
  };
}

async function setSetting(key, value) {
  const val = String(value);
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ key, value: val, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();
  if (error) {
    console.error('[platformSettingsService] setSetting error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

async function updateSettings(payload) {
  const updates = {};
  if (payload.commission_rate != null) {
    const v = Number(payload.commission_rate);
    if (!Number.isNaN(v) && v >= 0 && v <= 1) updates.commission_rate = v;
  }
  if (payload.tax_penalty_rate != null) {
    const v = Number(payload.tax_penalty_rate);
    if (!Number.isNaN(v) && v >= 0 && v <= 1) updates.tax_penalty_rate = v;
  }
  for (const [k, v] of Object.entries(updates)) {
    const { error } = await setSetting(k, v);
    if (error) return { data: null, error };
  }
  return getRates();
}

export { getSetting, getRates, setSetting, updateSettings, DEFAULTS };
