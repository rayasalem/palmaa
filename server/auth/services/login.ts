/**
 * Login service: find user by email, verify password with bcrypt, return user without password.
 * Used by POST /api/auth/login.
 */

import bcrypt from 'bcrypt';
import { supabase } from '../../config/supabaseClient.js';
import { USERS_TABLE } from '../constants.js';
import type { AuthUserResponse } from '../../types/index.js';

export interface LoginResult {
  user: AuthUserResponse | null;
  error: { message: string } | null;
}

/** Row from DB including password (not sent to client) */
interface UserRowWithPassword extends AuthUserResponse {
  password?: string;
}

/**
 * Find user by email, compare password with bcrypt, return user (no password).
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const emailNorm = email.toLowerCase().trim();
  const { data: userRow, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, password, name, role, is_email_verified, status, created_at')
    .eq('email', emailNorm)
    .single();
  if (error || !userRow) {
    return { user: null, error: { message: 'Invalid credentials' } };
  }
  const row = userRow as UserRowWithPassword;
  const match = await bcrypt.compare(password, row.password || '');
  if (!match) {
    return { user: null, error: { message: 'Invalid credentials' } };
  }
  const { password: _, ...user } = row;
  return { user, error: null };
}
