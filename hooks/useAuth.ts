/**
 * useAuth: hook that exposes login, logout, getMe, and current user state.
 * Uses authService for API calls; state is kept in authService (currentUser).
 * Use this in components that need typed auth actions without touching store directly.
 */

import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types';
import type { ActionResponse } from '../types';

export interface UseAuthReturn {
  /** Current user from last login/getMe, or null if not logged in */
  user: User | null;
  /** Whether an auth request is in progress */
  loading: boolean;
  /** Last error message from login/getMe */
  error: string | null;
  /** Call login API; on success invokes onSuccess with user */
  login: (email: string, password: string) => Promise<ActionResponse<{ user: User; token: string }>>;
  /** Call getMe API to restore session from cookie */
  getMe: () => Promise<ActionResponse<{ user: User }>>;
  /** Call logout API and clear local user */
  logout: () => Promise<void>;
  /** Clear the last error */
  clearError: () => void;
}

/**
 * Returns auth state and handlers. User is read from authService after login/getMe.
 * For a full reactive user, combine with a store or context that updates on login/logout.
 */
export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.login(email, password);
      if (result.success && result.data) {
        setUser(result.data.user);
      } else {
        setError(result.error ?? null);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.getMe();
      if (result.success && result.data) {
        setUser(result.data.user);
      } else {
        setUser(null);
        setError(result.error ?? null);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    loading,
    error,
    login,
    getMe,
    logout,
    clearError,
  };
}
