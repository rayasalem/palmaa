/**
 * Product routes: public read; create/update/delete require MERCHANT auth.
 * Like/comment routes: auth required for write; public read for count/comments.
 */

import express from 'express';
import * as productController from '../controllers/productController.js';
import * as productLikeController from '../controllers/productLikeController.js';
import * as productCommentController from '../controllers/productCommentController.js';
import { authenticate, requireRole, optionalAuth } from '../middlewares/authMiddleware.js';
import { commentLimiter, productListLimiter, productByIdLimiter, merchantProductCreateLimiter } from '../middlewares/security.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { products as productSchemas, productComment as productCommentSchemas } from '../validation/schemas.js';

const router = express.Router();

router.get(
  '/',
  productListLimiter(),
  validate(productSchemas.listQuery, 'query', 'products.list'),
  asyncHandler(productController.list)
);
router.get(
  '/merchant/:merchantId',
  productListLimiter(),
  validate(productSchemas.merchantParam, 'params', 'products.merchant'),
  asyncHandler(productController.listByMerchant)
);
router.get('/:id/likes-count', productByIdLimiter(), asyncHandler(productLikeController.getLikesCount));
router.get('/:id/liked', productByIdLimiter(), optionalAuth, asyncHandler(productLikeController.getIsLiked));
router.get('/:id/comments', productByIdLimiter(), asyncHandler(productCommentController.getComments));
router.get('/:id', productByIdLimiter(), asyncHandler(productController.getById));

router.post('/:id/like', authenticate, asyncHandler(productLikeController.like));
router.delete('/:id/like', authenticate, asyncHandler(productLikeController.unlike));
router.post(
  '/:id/comment',
  authenticate,
  commentLimiter(),
  validate(productCommentSchemas.add, 'body', 'productComment.add'),
  asyncHandler(productCommentController.addComment)
);

router.post(
  '/bulk',
  authenticate,
  requireRole('MERCHANT'),
  merchantProductCreateLimiter(),
  validate(productSchemas.bulk, 'body', 'products.bulk'),
  asyncHandler(productController.bulkCreate)
);
router.post(
  '/',
  authenticate,
  requireRole('MERCHANT'),
  merchantProductCreateLimiter(),
  validate(productSchemas.create, 'body', 'products.create'),
  asyncHandler(productController.create)
);
router.put(
  '/:id',
  authenticate,
  requireRole('MERCHANT'),
  validate(productSchemas.update, 'body', 'products.update'),
  asyncHandler(productController.update)
);
router.delete('/:id', authenticate, requireRole('MERCHANT'), asyncHandler(productController.remove));

export default router;
