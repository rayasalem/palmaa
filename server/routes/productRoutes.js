/**
 * Product routes: public read; create/update/delete require MERCHANT auth.
 * Like/comment routes: auth required for write; public read for count/comments.
 */

import express from 'express';
import * as productController from '../controllers/productController.js';
import * as productLikeController from '../controllers/productLikeController.js';
import * as productCommentController from '../controllers/productCommentController.js';
import { authenticate, requireRole, optionalAuth } from '../middlewares/authMiddleware.js';
import { commentLimiter } from '../middlewares/security.js';

const router = express.Router();

router.get('/', productController.list);
router.get('/merchant/:merchantId', productController.listByMerchant);
router.get('/:id/likes-count', productLikeController.getLikesCount);
router.get('/:id/liked', optionalAuth, productLikeController.getIsLiked);
router.get('/:id/comments', productCommentController.getComments);
router.get('/:id', productController.getById);

router.post('/:id/like', authenticate, productLikeController.like);
router.delete('/:id/like', authenticate, productLikeController.unlike);
router.post('/:id/comment', authenticate, commentLimiter(), productCommentController.addComment);

router.post('/', authenticate, requireRole('MERCHANT'), productController.create);
router.put('/:id', authenticate, requireRole('MERCHANT'), productController.update);
router.delete('/:id', authenticate, requireRole('MERCHANT'), productController.remove);

export default router;
