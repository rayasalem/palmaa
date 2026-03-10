/**
 * Product routes: public read; create/update/delete require MERCHANT auth.
 * Like/comment routes: auth required for write; public read for count/comments.
 */

import express from 'express';
import * as productController from '../controllers/productController.js';
import * as productLikeController from '../controllers/productLikeController.js';
import * as productCommentController from '../controllers/productCommentController.js';
import { authenticate, requireRole, optionalAuth } from '../middlewares/authMiddleware.js';
import { commentLimiter, productListLimiter, productByIdLimiter } from '../middlewares/security.js';
import { validate } from '../middlewares/validate.js';
import { products as productSchemas, productComment as productCommentSchemas } from '../validation/schemas.js';

const router = express.Router();

router.get(
  '/',
  productListLimiter(),
  validate(productSchemas.listQuery, 'query', 'products.list'),
  productController.list
);
router.get(
  '/merchant/:merchantId',
  productListLimiter(),
  validate(productSchemas.merchantParam, 'params', 'products.merchant'),
  productController.listByMerchant
);
router.get('/:id/likes-count', productByIdLimiter(), productLikeController.getLikesCount);
router.get('/:id/liked', productByIdLimiter(), optionalAuth, productLikeController.getIsLiked);
router.get('/:id/comments', productByIdLimiter(), productCommentController.getComments);
router.get('/:id', productByIdLimiter(), productController.getById);

router.post('/:id/like', authenticate, productLikeController.like);
router.delete('/:id/like', authenticate, productLikeController.unlike);
router.post(
  '/:id/comment',
  authenticate,
  commentLimiter(),
  validate(productCommentSchemas.add, 'body', 'productComment.add'),
  productCommentController.addComment
);

router.post(
  '/',
  authenticate,
  requireRole('MERCHANT'),
  validate(productSchemas.create, 'body', 'products.create'),
  productController.create
);
router.put(
  '/:id',
  authenticate,
  requireRole('MERCHANT'),
  validate(productSchemas.update, 'body', 'products.update'),
  productController.update
);
router.delete('/:id', authenticate, requireRole('MERCHANT'), productController.remove);

export default router;
