/**
 * Follow controller: follow/unfollow merchant, get followers count.
 */

import * as followService from '../services/followService.js';
import * as notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import { safeErrorForUser } from '../utils/userFacingError.js';

async function followMerchant(req, res) {
  try {
    const customerId = req.auth?.sub;
    const { merchantId } = req.params;
    if (!customerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (req.auth?.role?.toUpperCase() !== 'CUSTOMER') {
      return res.status(403).json({ success: false, error: 'Only customers can follow merchants' });
    }
    if (!merchantId) return res.status(400).json({ success: false, error: 'merchantId is required' });
    if (customerId === merchantId) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }
    const { data, error } = await followService.follow(customerId, merchantId);
    if (error) {
      if (error.code === 'DUPLICATE') {
        return res.status(409).json({ success: false, error: error.message || 'Already following' });
      }
      return res.status(500).json({ success: false, error: safeErrorForUser(error, 'فشل في المتابعة') });
    }
    await notificationService.notifyMerchantFollow(merchantId, customerId);
    return res.status(201).json({ success: true, follow: data });
  } catch (err) {
    logger.error('followMerchant unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: safeErrorForUser(err, 'حدث خطأ، يرجى المحاولة لاحقاً') });
  }
}

async function unfollowMerchant(req, res) {
  try {
    const customerId = req.auth?.sub;
    const { merchantId } = req.params;
    if (!customerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!merchantId) return res.status(400).json({ success: false, error: 'merchantId is required' });
    const { error } = await followService.unfollow(customerId, merchantId);
    if (error) return res.status(500).json({ success: false, error: safeErrorForUser(error, 'فشل في إلغاء المتابعة') });
    return res.status(200).json({ success: true, message: 'Unfollowed' });
  } catch (err) {
    logger.error('unfollowMerchant unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: safeErrorForUser(err, 'حدث خطأ، يرجى المحاولة لاحقاً') });
  }
}

async function getFollowersCount(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Merchant id is required' });
    const { count, error } = await followService.getFollowersCount(id);
    if (error) return res.status(500).json({ success: false, error: safeErrorForUser(error, 'حدث خطأ في جلب العدد') });
    return res.status(200).json({ success: true, count });
  } catch (err) {
    logger.error('getFollowersCount unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: safeErrorForUser(err, 'حدث خطأ، يرجى المحاولة لاحقاً') });
  }
}

async function getIsFollowing(req, res) {
  try {
    const userId = req.auth?.sub;
    const { id } = req.params;
    if (!userId) return res.status(200).json({ success: true, following: false });
    if (!id) return res.status(400).json({ success: false, error: 'Merchant id is required' });
    const { following, error } = await followService.isFollowing(userId, id);
    if (error) return res.status(500).json({ success: false, error: safeErrorForUser(error, 'حدث خطأ') });
    return res.status(200).json({ success: true, following });
  } catch (err) {
    logger.error('getIsFollowing unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: safeErrorForUser(err, 'حدث خطأ، يرجى المحاولة لاحقاً') });
  }
}

export { followMerchant, unfollowMerchant, getFollowersCount, getIsFollowing };
