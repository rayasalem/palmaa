/**
 * Auth Service – backend-only (JWT in httpOnly cookie).
 * Login/register/verify via API; no mock data, no Supabase Auth.
 */

import { User } from '../types';
import type { ActionResponse } from '../types';
import { getApiBase } from '../api/client';

function mapApiUserToUser(apiUser: any): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name || apiUser.email,
    role: apiUser.role || 'CUSTOMER',
    status: apiUser.status || 'PENDING',
    emailVerified: apiUser.is_email_verified ?? apiUser.email_verified ?? false,
    createdAt: apiUser.created_at ? new Date(apiUser.created_at).getTime() : Date.now(),
  } as User;
}

/** In-memory current user (set after login / getMe). Used by getUserById when id matches. */
let currentUser: User | null = null;

export const authService = {
  /**
   * Login via backend API. Sets httpOnly cookie; returns user from response.
   */
  async login(email: string, password: string): Promise<ActionResponse<{ user: User; token: string }>> {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: (data as any).error || 'Invalid login credentials' };
      }
      const apiUser = (data as any).user;
      if (!apiUser) return { success: false, error: 'Invalid response from server' };
      if (apiUser.status === 'REJECTED') {
        return { success: false, error: 'Account has been rejected.' };
      }
      const user = mapApiUserToUser(apiUser);
      currentUser = user;
      return { success: true, data: { user, token: 'cookie' } };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  },

  /**
   * Get current user from API (restore session from cookie). Returns null if not logged in.
   */
  async getMe(): Promise<ActionResponse<{ user: User }>> {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/me`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      const dataObj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      if (!res.ok) {
        currentUser = null;
        const msg = (res.status === 404)
          ? 'Auth API not found. Set VITE_API_URL to your backend URL if frontend and backend are on different hosts.'
          : (dataObj.error as string) || 'Not authenticated';
        return { success: false, error: msg };
      }
      const apiUser = dataObj.user;
      if (!apiUser || typeof apiUser !== 'object') return { success: false, error: 'Invalid response' };
      const user = mapApiUserToUser(apiUser as any);
      currentUser = user;
      return { success: true, data: { user } };
    } catch (e: any) {
      currentUser = null;
      return { success: false, error: e?.message || 'Request failed' };
    }
  },

  /** Logout: clear cookie on server and clear local current user. */
  async logout(): Promise<void> {
    try {
      await fetch(`${getApiBase()}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      currentUser = null;
    }
  },

  /** Get user by id. Returns current user if id matches; otherwise undefined (no mock). */
  getUserById(id: string): User | undefined {
    if (currentUser && currentUser.id === id) return currentUser;
    return undefined;
  },

  /** Set current user (e.g. after register + verify). */
  setCurrentUser(user: User | null): void {
    currentUser = user;
  },

  /** Request password reset OTP via email. May return verificationCode when email is not configured. */
  async forgotPassword(email: string): Promise<ActionResponse<{ verificationCode?: string }>> {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: (data as any).error || 'Request failed' };
      const code = (data as any).verificationCode;
      if (code) {
        return { success: true, data: { verificationCode: String(code) } };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Request failed' };
    }
  },

  /** Reset password with OTP via backend API. */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<ActionResponse<void>> {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: String(otp).trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: (data as any).error || 'Password reset failed' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Password reset failed' };
    }
  },
};
