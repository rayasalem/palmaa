/**
 * Admin: users list, update status, soft delete, restore.
 */

import { supabase } from '../../config/supabaseClient.js';
import logger from '../../utils/logger.js';
import { parsePagination } from '../../utils/pagination.js';

const USERS_TABLE = 'users';

function applyPagination(query, opts) {
  const { limit, offset } = parsePagination(opts, 50, 100);
  if (limit > 0) return query.range(offset, offset + limit - 1);
  return query;
}

async function listUsers(opts = {}) {
  let query = supabase
    .from(USERS_TABLE)
    .select(
      'id, email, name, role, status, phone, created_at, updated_at, terms_accepted, terms_accepted_at, email_verified'
    )
    .order('created_at', { ascending: false });
  query = applyPagination(query, opts);
  const { data, error } = await query;
  if (error) {
    logger.error('adminUsersService listUsers error', { message: error.message });
    return { data: [], error };
  }
  const list = (data || []).map((u) => ({
    ...u,
    is_email_verified: u.email_verified ?? false,
    deleted_at: u.deleted_at ?? null,
    deleted_reason: u.deleted_reason ?? null,
  }));
  return { data: list, error: null };
}

async function updateUserStatus(userId, status) {
  const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
  const s = String(status).toUpperCase();
  if (!allowed.includes(s)) {
    return { data: null, error: { message: 'Invalid status' } };
  }
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      status: s,
      is_approved: s === 'APPROVED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    logger.error('adminUsersService updateUserStatus error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function softDeleteUser(userId, reason) {
  const now = new Date().toISOString();
  const payload = { status: 'DELETED', updated_at: now };
  if (reason && typeof reason === 'string') payload.deleted_reason = reason.trim();
  const { data, error } = await supabase.from(USERS_TABLE).update(payload).eq('id', userId).select().single();
  if (error) {
    logger.error('adminUsersService softDeleteUser error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function restoreUser(userId) {
  const { data: userRow, error: findError } = await supabase
    .from(USERS_TABLE)
    .select('id, status, updated_at')
    .eq('id', userId)
    .single();
  if (findError || !userRow) {
    logger.error('adminUsersService restoreUser find error', { message: findError && findError.message });
    return { data: null, error: findError || { message: 'User not found' } };
  }
  if (userRow.status !== 'DELETED') {
    return { data: null, error: { message: 'User is not deleted' } };
  }
  const now = new Date();
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({ status: 'PENDING', updated_at: now.toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    logger.error('adminUsersService restoreUser update error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

export { listUsers, updateUserStatus, softDeleteUser, restoreUser };
