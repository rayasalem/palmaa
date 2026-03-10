/**
 * User Service – backend API only (no Supabase, no mock db).
 * Register/verify via auth API; admin: GET/PATCH users via /api/admin.
 * Uses shared api() from api/client for consistent auth and 401 handling.
 */

import { User, Role, MerchantProfile, ActionResponse, UserStatus } from '../types';

import { api, setAuthToken, isSameOrigin } from '../api/client';

/** Optional in-memory cache for merchant profile (e.g. from future GET /merchants/:id). */
let merchantProfileCache: Record<string, MerchantProfile> = {};

export const userService = {
  /**
   * Register via backend API (POST /api/auth/register).
   * حالياً لا نستخدم تحقق إيميل (OTP)، التسجيل يُعد ناجحاً مباشرة.
   */
  async register(
    user: User,
    password?: string,
    extraData?: any
  ): Promise<ActionResponse<{ user: User; token: string }>> {
    try {
      const role = (user.role || Role.CUSTOMER).toUpperCase();
      const body: any = {
        email: user.email.trim(),
        password: password && password.length >= 6 ? password : 'ChangeMe123!',
        name: (user.name || user.email).trim(),
        role,
      };
      if (role === 'MERCHANT' && (extraData?.termsAccepted === true || extraData?.termsAccepted === 'true')) {
        body.termsAccepted = true;
        if (extraData?.termsVersion) body.termsVersion = extraData.termsVersion;
      }
      const data = await api<{
        success: boolean;
        message?: string;
        user?: any;
        emailSent?: boolean;
        verificationCode?: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!data.success) return { success: false, error: (data as any).error || 'Registration failed' };
      const regToken = (data as any).token;
      if (regToken && !isSameOrigin()) setAuthToken(regToken);
      const newUser: User = {
        ...user,
        id: data.user?.id || '',
        emailVerified: data.user?.is_email_verified ?? true,
        status: data.user?.status || 'PENDING',
        createdAt: Date.now(),
        registration_date: new Date().toISOString(),
        companyName: extraData?.company_name || user.companyName,
        city: extraData?.city || user.city,
      };
      if (data.user?.id) newUser.id = data.user.id;
      return {
        success: true,
        requiresVerification: false,
        data: { user: newUser, token: regToken || '' },
        emailSent: data.emailSent !== false,
        verificationCode: data.verificationCode,
      };
    } catch (e: any) {
      console.error('Registration Error:', e);
      return { success: false, error: e.message || 'Registration failed' };
    }
  },

  async confirmEmailManually(_userId: string): Promise<ActionResponse<void>> {
    return { success: true };
  },

  updateProfile(_userId: string, _data: Partial<User>) {
    // No backend PATCH /users/me yet; no-op
  },

  updateMerchantProfile(userId: string, data: Partial<MerchantProfile>) {
    const existing = merchantProfileCache[userId];
    if (existing) merchantProfileCache[userId] = { ...existing, ...data };
  },

  getMerchantProfile(userId: string): MerchantProfile | undefined {
    return merchantProfileCache[userId];
  },

  getMerchantName(userId: string): string {
    const p = merchantProfileCache[userId];
    if (p) return p.business_name;
    return 'Unknown';
  },

  /** Set merchant profile in local cache (e.g. when loaded from API later). */
  setMerchantProfileCache(userId: string, profile: MerchantProfile) {
    merchantProfileCache[userId] = profile;
  },

  /**
   * Get all users (admin only). Uses GET /api/admin/users.
   */
  async getAll(): Promise<User[]> {
    try {
      const data = await api<{ success: boolean; users: any[] }>('/api/admin/users');
      if (!data.success || !Array.isArray((data as any).users)) return [];
      return ((data as any).users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email,
        role: u.role || 'CUSTOMER',
        status: u.status || 'PENDING',
        emailVerified: u.is_email_verified,
        createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
        phone: u.phone,
      })) as User[];
    } catch {
      return [];
    }
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<ActionResponse<void>> {
    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update status' };
    }
  },

  /**
   * Soft delete user (admin only).
   * يضع الحالة كـ DELETED مع تخزين سبب الحذف وتاريخ الحذف.
   */
  async softDeleteUser(userId: string, reason: string): Promise<ActionResponse<void>> {
    try {
      await api(`/api/admin/users/${userId}/delete`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to delete user' };
    }
  },

  /**
   * Restore a soft-deleted user within 30 days.
   */
  async restoreUser(userId: string): Promise<ActionResponse<void>> {
    try {
      await api(`/api/admin/users/${userId}/restore`, {
        method: 'POST',
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to restore user' };
    }
  },

  async verifyEmail(email: string, otp: string): Promise<ActionResponse<{ user: User }>> {
    try {
      const data = await api<{ success: boolean; user?: any; token?: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: String(otp).trim() }),
      });
      const token = (data as any).token;
      if (token && !isSameOrigin()) setAuthToken(token);
      const user = (data as any).user;
      if (!user) return { success: false, error: 'No user returned' };
      const mappedUser: User = {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        role: (user.role as Role) || Role.CUSTOMER,
        emailVerified: user.is_email_verified ?? true,
        status: user.status || 'PENDING',
        createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
        phone: user.phone,
      } as User;
      return { success: true, data: { user: mappedUser } };
    } catch (e: any) {
      return { success: false, error: e.message || 'Verification failed' };
    }
  },

  async resendVerificationCode(email: string): Promise<ActionResponse<void>> {
    try {
      await api('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to resend code' };
    }
  },
};
