/**
 * Follow, like, comment, notifications – backend API client.
 * All requests use credentials: 'include' for JWT cookie.
 */

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:5000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers as object) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as any)?.error || (data as any)?.message || `HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data as T;
}

// --- Follow ---
export async function followMerchant(merchantId: string): Promise<{ success: boolean; follow?: any }> {
  return request(`/api/follow/${merchantId}`, { method: 'POST' });
}

export async function unfollowMerchant(merchantId: string): Promise<{ success: boolean }> {
  return request(`/api/follow/${merchantId}`, { method: 'DELETE' });
}

export async function getFollowersCount(merchantId: string): Promise<{ success: boolean; count: number }> {
  return request(`/api/merchant/${merchantId}/followers-count`);
}

export async function getIsFollowing(merchantId: string): Promise<{ success: boolean; following: boolean }> {
  return request(`/api/merchant/${merchantId}/following`);
}

/** Fetch public profile (user + merchant) for profile page. */
export async function getPublicProfile(profileId: string): Promise<{
  success: boolean;
  user?: { id: string; name: string; role: string; city?: string; bio?: string; profile_image?: string; logoUrl?: string; companyName?: string; isApproved?: boolean };
  merchantProfile?: { business_name?: string; business_description?: string; logo_url?: string; city?: string; phone?: string };
}> {
  return request(`/api/merchant/${profileId}`);
}

// --- Product like ---
export async function likeProduct(productId: string): Promise<{ success: boolean; liked: boolean; count?: number }> {
  return request(`/api/products/${productId}/like`, { method: 'POST' });
}

export async function unlikeProduct(productId: string): Promise<{ success: boolean; liked: boolean; count?: number }> {
  return request(`/api/products/${productId}/like`, { method: 'DELETE' });
}

export async function getProductLikesCount(productId: string): Promise<{ success: boolean; count: number }> {
  return request(`/api/products/${productId}/likes-count`);
}

export async function getProductIsLiked(productId: string): Promise<{ success: boolean; liked: boolean }> {
  return request(`/api/products/${productId}/liked`);
}

// --- Product comment ---
export async function addProductComment(
  productId: string,
  content: string
): Promise<{ success: boolean; comment: { id: string; content: string; created_at: string; user_id: string } }> {
  return request(`/api/products/${productId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function getProductComments(
  productId: string
): Promise<{ success: boolean; comments: { id: string; content: string; created_at: string; user_id: string }[] }> {
  return request(`/api/products/${productId}/comments`);
}

// --- Notifications ---
export interface ApiNotification {
  id: string;
  user_id: string;
  type: 'new_product' | 'like' | 'comment' | 'follow';
  reference_id: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(unreadOnly?: boolean): Promise<{
  success: boolean;
  notifications: ApiNotification[];
}> {
  const qs = unreadOnly ? '?unread=true' : '';
  return request(`/api/notifications${qs}`);
}

export async function markNotificationRead(id: string): Promise<{ success: boolean; notification: ApiNotification }> {
  return request(`/api/notifications/${id}/read`, { method: 'PATCH' });
}
