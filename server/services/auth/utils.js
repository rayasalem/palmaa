/**
 * Auth utils: hash password, token version (for JWT invalidation).
 */

import bcrypt from 'bcrypt';
import { supabase } from '../../config/supabaseClient.js';
import logger from '../../utils/logger.js';

const USERS_TABLE = 'users';
const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function getTokenVersion(userId) {
  const { data, error } = await supabase.from(USERS_TABLE).select('token_version').eq('id', userId).single();
  if (error || data == null) return 0;
  return Number(data.token_version) || 0;
}

export async function incrementTokenVersion(userId) {
  const { data: row, error: fetchErr } = await supabase
    .from(USERS_TABLE)
    .select('token_version')
    .eq('id', userId)
    .single();
  if (fetchErr || row == null) {
    return { error: fetchErr || new Error('User not found') };
  }
  const nextVer = (Number(row.token_version) || 0) + 1;
  const { error: updateErr } = await supabase
    .from(USERS_TABLE)
    .update({ token_version: nextVer, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateErr) {
    logger.error('authService incrementTokenVersion error', { message: updateErr.message });
    return { error: updateErr };
  }
  logger.info('authService token_version incremented', { userId, token_version: nextVer });
  return { error: null };
}
