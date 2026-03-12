/**
 * Joi schemas for critical endpoints. Use with validate(schema, 'body'|'query').
 * Shared patterns: common.uuid, common.email, common.password, common.quantity, common.productId.
 */

import Joi from 'joi';

/** Shared reusable patterns for consistent validation across routes. */
export const common = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  email: Joi.string().email().max(255),
  password: Joi.string().min(6).max(128),
  quantity: Joi.number().integer().min(0).max(100),
  quantityStrict: Joi.number().integer().min(1).max(100),
  productId: Joi.string().uuid({ version: 'uuidv4' }),
};

const uuid = common.uuid;
const email = common.email;
const password = common.password;

export const auth = {
  login: Joi.object({
    email: Joi.string().trim().email().max(255).required(),
    password: Joi.string().min(1).required(),
  }),
  register: Joi.object({
    email: email.required(),
    password: password.required(),
    name: Joi.string().max(200).allow('', null),
    role: Joi.string().valid('CUSTOMER', 'MERCHANT', 'BROKER').default('CUSTOMER'),
    termsAccepted: Joi.boolean(),
    termsVersion: Joi.string().max(50).allow('', null),
  }),
  verifyEmail: Joi.object({
    email: email.required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  }),
  forgotPassword: Joi.object({
    email: email.required(),
  }),
  resetPassword: Joi.object({
    email: email.required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
    newPassword: password.required(),
  }),
  resendVerification: Joi.object({
    email: email.required(),
  }),
};

export const cart = {
  addItem: Joi.object({
    product_id: uuid,
    productId: uuid,
    quantity: Joi.number().integer().min(1).max(100).default(1),
  })
    .or('product_id', 'productId')
    .custom((v) => {
      const id = v.product_id || v.productId;
      return { product_id: id, quantity: v.quantity ?? 1 };
    }),
  updateQuantity: Joi.object({
    quantity: Joi.number().integer().min(0).max(100).required(),
  }),
};

/** Query for GET /api/orders and GET /api/orders/merchant (limit/offset). */
const orderListQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

export const orders = {
  listQuery: orderListQuery,
  create: Joi.object({
    recipient_name: Joi.string().max(200).required(),
    address: Joi.string().max(500).required(),
    city: Joi.string().max(100).required(),
    cityId: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
    villageId: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
    phone: Joi.string().max(50).required(),
    amount: Joi.number().min(0).required(),
    weight: Joi.number().min(0).required(),
    payment_method: Joi.string().max(50).default('COD'),
    broker_id: uuid.allow(null),
    brokerId: uuid.allow(null),
    items: Joi.array()
      .items(
        Joi.object({
          product_id: Joi.alternatives().try(uuid, Joi.string().min(1).max(64)),
          productId: Joi.alternatives().try(uuid, Joi.string().min(1).max(64)),
          quantity: Joi.number().integer().min(1).max(100),
          price: Joi.number().min(0),
        })
          .or('product_id', 'productId')
      )
      .allow(null),
  }),
};

/** Product comment: content 1–2000 chars. */
export const productComment = {
  add: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
  }),
};

/** Catalog list query: pagination + optional search and category filter. */
export const catalogListQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(24),
  offset: Joi.number().integer().min(0).default(0),
  q: Joi.string().max(150).allow('', null).trim(),
  category: Joi.string().max(100).allow('', null).trim(),
});

export const products = {
  listQuery: catalogListQuery,
  merchantParam: Joi.object({
    merchantId: uuid.required(),
  }),
  create: Joi.object({
    name: Joi.string().max(300),
    title: Joi.string().max(300).allow('', null),
    description: Joi.string().allow('', null),
    price: Joi.number().min(0),
    price_ils: Joi.number().min(0),
    stock: Joi.number().integer().min(0),
    category: Joi.string().max(100),
    condition: Joi.string().max(50),
    image_url: Joi.string().uri().allow('', null),
    images: Joi.array().items(Joi.string().uri()).allow(null),
    isActive: Joi.boolean(),
    is_bestseller: Joi.boolean(),
    sku: Joi.string().max(100).allow('', null),
    weight: Joi.number().min(0).allow(null),
    dimensions: Joi.any(),
    tags: Joi.any(),
  })
    .or('name', 'title')
    .min(1),
  update: Joi.object({
    name: Joi.string().max(300),
    title: Joi.string().max(300).allow('', null),
    description: Joi.string().allow('', null),
    price: Joi.number().min(0),
    price_ils: Joi.number().min(0),
    stock: Joi.number().integer().min(0),
    category: Joi.string().max(100),
    condition: Joi.string().max(50),
    image_url: Joi.string().uri().allow('', null),
    images: Joi.array().items(Joi.string().uri()).allow(null),
    isActive: Joi.boolean(),
    is_bestseller: Joi.boolean(),
    sku: Joi.string().max(100).allow('', null),
    weight: Joi.number().min(0).allow(null),
    dimensions: Joi.any(),
    tags: Joi.any(),
  }).min(1),
};

const mfaCode = Joi.string().length(6).pattern(/^\d+$/);

export const mfa = {
  verifySetup: Joi.object({
    code: mfaCode.required(),
    token: mfaCode,
  }).or('code', 'token'),
  verify: Joi.object({
    mfaChallengeToken: Joi.string().min(10).required(),
    code: mfaCode,
    token: mfaCode,
  })
    .or('code', 'token')
    .custom((v) => ({ mfaChallengeToken: v.mfaChallengeToken, code: v.code || v.token })),
};

/** Admin list query: capped at 100 per request to avoid large payloads. */
const adminListQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

export const admin = {
  listOrders: adminListQuery,
  listUsers: adminListQuery,
  listProducts: adminListQuery,
  updateUserStatus: Joi.object({
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED').required(),
  }),
  softDeleteUser: Joi.object({
    reason: Joi.string().min(1).max(500).required(),
  }),
  updateProduct: Joi.object({
    name: Joi.string().max(300),
    title: Joi.string().max(300).allow('', null),
    description: Joi.string().allow('', null),
    price: Joi.number().min(0),
    price_ils: Joi.number().min(0),
    stock: Joi.number().integer().min(0),
    category: Joi.string().max(100),
    isActive: Joi.boolean(),
    images: Joi.array().items(Joi.string().uri()).allow(null),
  }).min(1),
  updateSettings: Joi.object({
    commission_rate: Joi.number().min(0).max(1),
    tax_penalty_rate: Joi.number().min(0).max(1),
  }).min(1),
};

/** Payment: create (sandbox), callback, cybersource charge. */
export const payment = {
  create: Joi.object({
    orderId: uuid.required(),
    amount: Joi.number().min(0.01).required(),
    return_url: Joi.string().uri().allow('', null),
  }),
  callback: Joi.object({
    orderId: uuid.required(),
    status: Joi.string()
      .pattern(/^(success|failed)$/i)
      .required(),
  }),
  cybersourceCharge: Joi.object({
    orderId: uuid.required(),
    amount: Joi.number().min(0.01).required(),
    currency: Joi.string().length(3).default('ILS'),
    cardNumber: Joi.string().min(12).max(19).required(),
    expMonth: Joi.string().min(1).max(2).required(),
    expYear: Joi.string().min(2).max(4).required(),
    cvv: Joi.string().min(3).max(4).required(),
    cardholderName: Joi.string().max(200).allow('', null),
  }),
};

/** Shipment: create, status query, print-pdf body, cancel uses path. */
export const shipment = {
  create: Joi.object({
    orderId: uuid.required(),
    addressLine1: Joi.string().max(500).required(),
    addressLine2: Joi.string().max(500).allow('', null),
    cityId: Joi.string().max(50).required(),
    regionId: Joi.string().max(50).allow('', null),
    villageId: Joi.string().max(50).required(),
    recipient_name: Joi.string().max(200).required(),
    phone: Joi.string().max(50).required(),
    email: email.allow('', null),
    senderName: Joi.string().max(200).allow('', null),
    senderPhone: Joi.string().max(50).allow('', null),
    receiverName: Joi.string().max(200).allow('', null),
    receiverPhone: Joi.string().max(50).allow('', null),
    weight: Joi.number().min(0.01).required(),
    cod: Joi.number().min(0).allow(null),
    notes: Joi.string().max(1000).allow('', null),
    invoiceNumber: Joi.string().max(100).allow('', null),
    quantity: Joi.number().integer().min(1).allow(null),
    description: Joi.string().max(500).allow('', null),
    serviceType: Joi.string().max(50).allow('', null),
    shipmentType: Joi.string().max(50).allow('', null),
    toCollectFromReceiver: Joi.boolean().allow(null),
  }).min(1),
  getStatusQuery: Joi.object({
    id: Joi.string().max(100).allow('', null),
    barcode: Joi.string().max(100).allow('', null),
  }),
  printPdf: Joi.object({
    ids: Joi.array().items(Joi.string().max(100)).min(1).max(20).required(),
  }),
};

/** Address: villages query (cities has no query). */
export const address = {
  getVillagesQuery: Joi.object({
    search: Joi.string().max(100).allow('', null),
    cityId: Joi.string().max(50).allow('', null),
  }),
};

/** Chat: POST body for support widget. */
export const chat = {
  post: Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          text: Joi.string().required(),
          isBot: Joi.boolean(),
        })
      )
      .min(1)
      .required(),
    lang: Joi.string().valid('ar', 'en', 'he').default('ar'),
    role: Joi.string().max(50).allow('', null),
  }),
};

/** Broker: shared product upsert body. */
export const broker = {
  upsertSharedProduct: Joi.object({
    marketing_title: Joi.string().max(300).allow('', null),
    marketing_description: Joi.string().max(2000).allow('', null),
    custom_discount_text: Joi.string().max(200).allow('', null),
    is_featured: Joi.boolean().allow(null),
  }),
};

/** Notification: list query. */
export const notification = {
  listQuery: Joi.object({
    unread: Joi.string().valid('true', 'false').allow('', null),
    limit: Joi.number().integer().min(1).max(100),
    offset: Joi.number().integer().min(0),
  }),
};

/** Follow: merchantId path param. */
export const follow = {
  merchantParam: Joi.object({
    merchantId: uuid.required(),
  }),
};

/** Merchant: id path param. */
export const merchant = {
  idParam: Joi.object({
    id: uuid.required(),
  }),
};

/** Shared products: list query by brokerId. */
export const sharedProducts = {
  listQuery: Joi.object({
    brokerId: uuid.required(),
  }),
};

export default {
  auth,
  cart,
  orders,
  products,
  productComment,
  mfa,
  admin,
  payment,
  shipment,
  address,
  chat,
  broker,
  notification,
  follow,
  merchant,
  sharedProducts,
};
