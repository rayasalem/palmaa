/**
 * Product comment controller: add comment, list comments. Notify merchant on new comment.
 */

import * as productCommentService from '../services/productCommentService.js';
import * as productService from '../services/productService.js';
import * as notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';

async function addComment(req, res) {
  try {
    const userId = (req.auth && req.auth.sub);
    const { id: productId } = req.params;
    const { content } = req.body || {};
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if ((req.auth && req.auth.role && String(req.auth.role).toUpperCase()) !== 'CUSTOMER') {
      return res.status(403).json({ success: false, error: 'Only customers can comment' });
    }
    if (!productId) return res.status(400).json({ success: false, error: 'Product id is required' });
    const text = typeof content === 'string' ? content.trim() : '';
    if (!text || text.length < 1) return res.status(400).json({ success: false, error: 'Comment content is required' });
    if (text.length > 2000) return res.status(400).json({ success: false, error: 'Comment too long' });

    const { data: comment, error } = await productCommentService.addComment(productId, userId, text);
    if (error) return res.status(500).json({ success: false, error: error.message || 'Failed to add comment' });

    const { data: product } = await productService.getProductById(productId);
    if ((product && product.merchant_id)) {
      await notificationService.notifyMerchantComment(product.merchant_id, productId);
    }
    await notificationService.notifyAdminComment(productId);
    await notificationService.notifyBrokersSharedProductComment(productId);
    return res.status(201).json({
      success: true,
      comment: {
        id: comment.id,
        product_id: comment.product_id,
        user_id: comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
      },
    });
  } catch (err) {
    logger.error('addComment unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getComments(req, res) {
  try {
    const { id: productId } = req.params;
    if (!productId) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { data, error } = await productCommentService.getComments(productId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, comments: data });
  } catch (err) {
    logger.error('getComments unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { addComment, getComments };
