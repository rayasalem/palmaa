/**
 * Admin: platform earnings (commission + tax penalty aggregates).
 */

import { supabase } from '../../config/supabaseClient.js';
import logger from '../../utils/logger.js';

const TRANSACTIONS_TABLE = 'transactions';

async function getPlatformEarnings() {
  const { data: rows, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select('commission_amount, tax_penalty_amount, order_id, created_at')
    .eq('type', 'order_settlement');
  if (error) {
    logger.error('adminPlatformService getPlatformEarnings error', { message: error.message });
    return { data: null, error };
  }
  const list = rows || [];
  const total_commission = list.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
  const total_tax_penalty = list.reduce((s, r) => s + Number(r.tax_penalty_amount || 0), 0);
  const platform_earnings = total_commission + total_tax_penalty;
  return {
    data: {
      total_commission: Math.round(total_commission * 100) / 100,
      total_tax_penalty: Math.round(total_tax_penalty * 100) / 100,
      platform_earnings: Math.round(platform_earnings * 100) / 100,
      transactions_count: list.length,
    },
    error: null,
  };
}

export { getPlatformEarnings };
