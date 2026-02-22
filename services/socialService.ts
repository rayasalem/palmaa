/**
 * Social Service – backend API only (follow, like, comment).
 * All data from backend; no mock or local db.
 */

import type { Comment } from '../types';
import {
  followMerchant,
  unfollowMerchant,
  getFollowersCount as apiGetFollowersCount,
  getIsFollowing as apiGetIsFollowing,
  likeProduct,
  unlikeProduct,
  getProductLikesCount,
  getProductIsLiked,
  addProductComment,
  getProductComments,
} from './interactionApi';

export const socialService = {
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      const res = await followMerchant(followingId);
      return res.success;
    } catch {
      return false;
    }
  },

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      const res = await unfollowMerchant(followingId);
      return res.success;
    } catch {
      return false;
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const res = await apiGetIsFollowing(followingId);
      return res.following ?? false;
    } catch {
      return false;
    }
  },

  async getFollowersCount(userId: string): Promise<number> {
    try {
      const res = await apiGetFollowersCount(userId);
      return res.count ?? 0;
    } catch {
      return 0;
    }
  },

  async toggleLike(userId: string, productId: string): Promise<boolean> {
    try {
      const isLikedRes = await getProductIsLiked(productId);
      if (isLikedRes.liked) {
        const res = await unlikeProduct(productId);
        return false;
      }
      const res = await likeProduct(productId);
      return res.liked ?? true;
    } catch {
      return false;
    }
  },

  async isLiked(userId: string, productId: string): Promise<boolean> {
    try {
      const res = await getProductIsLiked(productId);
      return res.liked ?? false;
    } catch {
      return false;
    }
  },

  async getLikesCount(productId: string): Promise<number> {
    try {
      const res = await getProductLikesCount(productId);
      return res.count ?? 0;
    } catch {
      return 0;
    }
  },

  async addComment(userId: string, productId: string, text: string): Promise<Comment | null> {
    try {
      const res = await addProductComment(productId, text.trim());
      if (!res.success || !res.comment) return null;
      const c = res.comment;
      return {
        id: c.id,
        userId: c.user_id,
        productId,
        text: c.content,
        createdAt: new Date(c.created_at).getTime(),
      };
    } catch {
      return null;
    }
  },

  async getComments(productId: string): Promise<Comment[]> {
    try {
      const res = await getProductComments(productId);
      const list = res.comments || [];
      return list.map((c) => ({
        id: c.id,
        userId: c.user_id,
        productId,
        text: c.content,
        createdAt: new Date(c.created_at).getTime(),
      }));
    } catch {
      return [];
    }
  },
};
