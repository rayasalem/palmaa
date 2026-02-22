/**
 * Product like controller: like/unlike product.
 */

import * as productLikeService from '../services/productLikeService.js';
import logger from '../utils/logger.js';

async function like(req, res) {
  try {
    const userId = req.auth?.sub;
    const { id: productId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!productId) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { data, error } = await productLikeService.like(productId, userId);
    if (error) {
      if (error.code === 'DUPLICATE') {
        return res.status(200).json({ success: true, liked: true, message: 'Already liked' });
      }
      return res.status(500).json({ success: false, error: error.message || 'Failed to like' });
    }
    const { count } = await productLikeService.getLikesCount(productId);
    return res.status(201).json({ success: true, liked: true, like: data, count });
  } catch (err) {
    logger.error('like unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function unlike(req, res) {
  try {
    const userId = req.auth?.sub;
    const { id: productId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!productId) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { error } = await productLikeService.unlike(productId, userId);
    if (error) return res.status(500).json({ success: false, error: error.message || 'Failed to unlike' });
    const { count } = await productLikeService.getLikesCount(productId);
    return res.status(200).json({ success: true, liked: false, count });
  } catch (err) {
    logger.error('unlike unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getLikesCount(req, res) {
  try {
    const { id: productId } = req.params;
    if (!productId) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { count, error } = await productLikeService.getLikesCount(productId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, count });
  } catch (err) {
    logger.error('getLikesCount unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getIsLiked(req, res) {
  try {
    const userId = req.auth?.sub;
    const { id: productId } = req.params;
    if (!userId) return res.status(200).json({ success: true, liked: false });
    if (!productId) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { liked, error } = await productLikeService.isLiked(productId, userId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, liked });
  } catch (err) {
    logger.error('getIsLiked unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { like, unlike, getLikesCount, getIsLiked };
