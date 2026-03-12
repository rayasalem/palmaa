/**
 * MFA (TOTP) service. Optional; progressive rollout.
 * Uses users.mfa_enabled and users.mfa_secret (set by migration 011).
 */

import speakeasy from 'speakeasy';
import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

const USERS_TABLE = 'users';

export async function getMfaStatus(userId) {
  const { data, error } = await supabase.from(USERS_TABLE).select('mfa_enabled').eq('id', userId).single();
  if (error) {
    if (error.code === '42703') return { enabled: false, error: null };
    return { enabled: false, error };
  }
  if (!data) return { enabled: false, error: null };
  return { enabled: !!data.mfa_enabled, error: null };
}

export async function getMfaSecret(userId) {
  const { data, error } = await supabase.from(USERS_TABLE).select('mfa_secret').eq('id', userId).single();
  if (error) {
    if (error.code === '42703') return { secret: null, error: null };
    return { secret: null, error };
  }
  if (!data) return { secret: null, error: null };
  return { secret: data.mfa_secret || null, error: null };
}

/**
 * Generate new TOTP secret and save to user (mfa_enabled stays false until verify-setup).
 */
export async function setupMfa(userId, issuer = 'Palma Marketplace') {
  const secret = speakeasy.generateSecret({ length: 32, name: issuer });
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({
      mfa_secret: secret.base32,
      mfa_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    if (error.code === '42703') {
      return { secret: null, otpauthUrl: null, error: new Error('MFA columns missing; run migration 011') };
    }
    logger.error('mfaService setupMfa', { message: error.message, userId });
    return { secret: null, otpauthUrl: null, error };
  }
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.ascii,
    label: userId,
    encoding: 'ascii',
    issuer,
  });
  return { secret: secret.base32, otpauthUrl, error: null };
}

/**
 * Verify TOTP code and enable MFA for user.
 */
export async function verifyAndEnableMfa(userId, code) {
  const { secret, error: fetchErr } = await getMfaSecret(userId);
  if (fetchErr || !secret) {
    return { ok: false, error: fetchErr || new Error('MFA not set up') };
  }
  const valid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(code).replace(/\s/g, ''),
    window: 1,
  });
  if (!valid) {
    return { ok: false, error: new Error('Invalid code') };
  }
  const { error: updateErr } = await supabase
    .from(USERS_TABLE)
    .update({ mfa_enabled: true, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateErr) {
    logger.error('mfaService verifyAndEnableMfa', { message: updateErr.message, userId });
    return { ok: false, error: updateErr };
  }
  logger.info('mfaService MFA enabled', { userId });
  return { ok: true, error: null };
}

/**
 * Verify TOTP code for user (e.g. after login when mfa_enabled).
 */
export async function verifyMfaCode(userId, code) {
  const { secret, error: fetchErr } = await getMfaSecret(userId);
  if (fetchErr || !secret) {
    return { ok: false, error: fetchErr || new Error('MFA not configured') };
  }
  const valid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(code).replace(/\s/g, ''),
    window: 1,
  });
  return { ok: valid, error: valid ? null : new Error('Invalid code') };
}

/**
 * Disable MFA and clear secret (optional endpoint).
 */
export async function disableMfa(userId) {
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({
      mfa_enabled: false,
      mfa_secret: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    if (error.code === '42703') return { error: null };
    logger.error('mfaService disableMfa', { message: error.message, userId });
    return { error };
  }
  return { error: null };
}
