/* eslint-disable no-console */
/**
 * Generate one connected mock JSON for the database demo.
 *
 * Source of truth: supabase/MOCK-DEMO-DATA.sql
 *
 * Strict rules enforced:
 * - No null/undefined values in returned objects (only keys defined here)
 * - Relations are connected (ids referenced exist in JSON)
 * - No duplicate ids per table
 * - Every image_url is validated (HTTP 200 + content-type includes "image")
 *   If invalid, replace immediately with a validated placehold.co URL.
 */

import fs from 'node:fs';

const SQL_PATH =
  'C:/Users/SSS-73~1/Downloads/PA5ECF~1/supabase/MOCK-DEMO-DATA.sql';

// Deterministic IDs matching the SQL demo.
const IDS = {
  merchantUser: '00000000-0000-4000-8000-000000000001',
  brokerUser: '00000000-0000-4000-8000-000000000002',
  customerUser: '00000000-0000-4000-8000-000000000003',
  adminUser: '00000000-0000-4000-8000-000000000004',

  cart: '00000000-0000-5000-8000-000000000001',
  order: '00000000-0000-6000-8000-000000000001',

  shopOffer1: '00000000-0000-4000-9000-000000000001',
  shopOffer2: '00000000-0000-4000-9000-000000000002',

  merchantOffer1: '00000000-0000-4000-9000-000000000003',

  notification1: 'e0000001-0000-4000-8000-000000000001',

  orderItem1: 'd6000011-0000-4000-8000-000000000001',
  orderItem2: 'd6000012-0000-4000-8000-000000000002',

  comment1: 'd7e00001-0000-4000-8000-000000000001',
  comment2: 'd7e00002-0000-4000-8000-000000000002',
  comment3: 'd7e00003-0000-4000-8000-000000000003',
  comment4: 'd7e00004-0000-4000-8000-000000000004',

  sharedProductBase: '00000000-0000-8000-8000-00000000000', // + index

  cartItemBase: '00000000-0000-7000-8000-00000000000', // + index
};

function makeProductId(title) {
  return `demo-prod-${title}`;
}

function makePlaceholder(text, size = '600x600') {
  // placehold.co wants URL-encoded text.
  const encoded = encodeURIComponent(text);
  return `https://placehold.co/${size}/png?text=${encoded}`;
}

async function fetchHeadless(url, timeoutMs = 15000) {
  // Node 18+ has global fetch.
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; palma-mock-seed/1.0)'
      }
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function contentTypeHasImage(contentType) {
  const ct = String(contentType || '').toLowerCase();
  return ct.includes('image');
}

async function checkImageUrl(url) {
  const res = await fetchHeadless(url);
  const ct = res.headers.get('content-type');
  return res.status === 200 && contentTypeHasImage(ct);
}

async function validateAndMaybeReplaceImage(url, placeholderText, cache) {
  if (cache.has(url)) return cache.get(url);

  let ok = false;
  try {
    ok = await checkImageUrl(url);
  } catch (_e) {
    ok = false;
  }

  if (ok) {
    cache.set(url, url);
    return url;
  }

  // Try a category/title specific placeholder first.
  const ph = makePlaceholder(placeholderText);
  let phOk = false;
  try {
    phOk = await checkImageUrl(ph);
  } catch (_e) {
    phOk = false;
  }

  if (!phOk) {
    // Last-resort fallback (still validated).
    const fallback = 'https://placehold.co/600x600/png?text=Palma';
    try {
      const fallbackOk = await checkImageUrl(fallback);
      if (!fallbackOk) throw new Error('fallback placeholder invalid');
      cache.set(url, fallback);
      cache.set(fallback, fallback);
      return fallback;
    } catch (_e) {
      // If this ever happens, abort rather than returning broken content.
      throw new Error(`Unable to validate any image URL for: ${url}`);
    }
  }

  cache.set(url, ph);
  cache.set(ph, ph);
  return ph;
}

function assertNoDuplicateIds(records, idField, tableName) {
  const seen = new Set();
  for (const r of records) {
    const id = r[idField];
    if (seen.has(id)) {
      throw new Error(`Duplicate ${idField} in ${tableName}: ${id}`);
    }
    seen.add(id);
  }
}

function parseProductsFromSql(sql) {
  // Matches jsonb_build_object('title','...','category','...','price',12,'is_bestseller',true/false,'image_url','https://...').
  const re =
    /jsonb_build_object\('title','([^']*)','category','([^']*)','price',([0-9]+),'is_bestseller',(true|false),'image_url','([^']*)'\)/g;

  const products = [];
  let m;
  while ((m = re.exec(sql))) {
    products.push({
      title: m[1],
      category: m[2],
      price: Number(m[3]),
      isBestseller: m[4] === 'true',
      imageUrl: m[5]
    });
  }

  if (products.length === 0) {
    throw new Error('Failed to parse products from MOCK-DEMO-DATA.sql');
  }
  return products;
}

async function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const parsedProducts = parseProductsFromSql(sql);

  // Validate product ids uniqueness.
  const productIds = new Set();
  for (const p of parsedProducts) {
    const id = makeProductId(p.title);
    if (productIds.has(id)) {
      throw new Error(`Duplicate product id generated: ${id}`);
    }
    productIds.add(id);
  }

  const imageCache = new Map();
  const validatedProducts = [];

  for (const p of parsedProducts) {
    const validatedImage = await validateAndMaybeReplaceImage(
      p.imageUrl,
      p.title,
      imageCache
    );
    validatedProducts.push({
      id: makeProductId(p.title),
      merchant_id: IDS.merchantUser,
      title: p.title,
      name: p.title,
      description: `Demo product: ${p.title}`,
      price: p.price,
      price_ils: p.price,
      stock: 50,
      category: p.category,
      status: 'active',
      is_active: true,
      condition: 'new',
      images: [validatedImage],
      image_url: validatedImage,
      is_bestseller: p.isBestseller,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Validate merchant logo and offer banner images.
  // From MOCK-DEMO-DATA.sql.
  const merchantLogoUrl = 'https://picsum.photos/seed/palma-merchant-logo/80/80';
  const bannerUrl = 'https://picsum.photos/seed/electronics-sale-banner/800/300';

  const validatedMerchantLogo = await validateAndMaybeReplaceImage(
    merchantLogoUrl,
    'Demo Merchant Logo',
    imageCache
  );
  const validatedBanner = await validateAndMaybeReplaceImage(
    bannerUrl,
    'electronics-sale-banner',
    imageCache
  );

  const productsById = new Map(validatedProducts.map((p) => [p.id, p]));

  const productIphone14Id = makeProductId('iPhone 14');
  const productOrangeJuiceId = makeProductId('عصير برتقال طازج');
  const productArabicCoffeeId = makeProductId('قهوة عربية');

  for (const requiredId of [productIphone14Id, productOrangeJuiceId, productArabicCoffeeId]) {
    if (!productsById.has(requiredId)) {
      throw new Error(`Missing required product id in parsed data: ${requiredId}`);
    }
  }

  const sharedProducts = [];
  // Deterministic: first 5 products in the parsed order.
  const sharedCandidates = validatedProducts.slice(0, 5);
  for (let i = 0; i < sharedCandidates.length; i++) {
    const spId = `${IDS.sharedProductBase}${i + 1}`;
    sharedProducts.push({
      id: spId,
      broker_id: IDS.brokerUser,
      product_id: sharedCandidates[i].id,
      marketing_title: `عرض الوسيط على ${sharedCandidates[i].product_id || sharedCandidates[i].id}`,
      marketing_description: 'منتجات مختارة من التاجر لعرضها عبر الوسيط',
      custom_discount_text: 'خصم إضافي عبر رابط الوسيط',
      is_featured: true,
      clicks: 0,
      sales: 0,
      shared_at: new Date().toISOString()
    });
  }

  // Carts and order items candidates (deterministic by parsed order).
  const cartCandidates = validatedProducts.slice(0, 3);
  const orderCandidates = validatedProducts.slice(0, 2);

  const cartItems = cartCandidates.map((p, idx) => ({
    id: `${IDS.cartItemBase}${idx + 1}`,
    cart_id: IDS.cart,
    product_id: p.id,
    quantity: 1 + idx,
    price: p.price
  }));

  const orderItems = [
    {
      id: IDS.orderItem1,
      order_id: IDS.order,
      product_id: orderCandidates[0].id,
      quantity: 1,
      price: orderCandidates[0].price
    },
    {
      id: IDS.orderItem2,
      order_id: IDS.order,
      product_id: orderCandidates[1].id,
      quantity: 2,
      price: orderCandidates[1].price
    }
  ];

  const totalAmount = orderItems.reduce((sum, it) => sum + it.quantity * it.price, 0);

  const now = Date.now();
  const iso = (msDelta) => new Date(now + msDelta).toISOString();

  const users = [
    {
      id: IDS.merchantUser,
      email: 'merchant@palma.demo',
      name: 'Demo Merchant',
      role: 'MERCHANT',
      status: 'APPROVED',
      subscription_type: 'free',
      subscription_status: 'active'
    },
    {
      id: IDS.brokerUser,
      email: 'broker@palma.demo',
      name: 'Demo Broker',
      role: 'BROKER',
      status: 'APPROVED',
      subscription_type: 'free',
      subscription_status: 'active'
    },
    {
      id: IDS.customerUser,
      email: 'customer@palma.demo',
      name: 'Demo Customer',
      role: 'CUSTOMER',
      status: 'APPROVED',
      subscription_type: 'free',
      subscription_status: 'active'
    },
    {
      id: IDS.adminUser,
      email: 'admin@palma.demo',
      name: 'Demo Admin',
      role: 'ADMIN',
      status: 'APPROVED',
      subscription_type: 'free',
      subscription_status: 'active'
    }
  ];

  const merchantProfiles = [
    {
      user_id: IDS.merchantUser,
      business_name: 'Demo Merchant',
      logo_url: validatedMerchantLogo
    }
  ];

  const shopOffers = [
    {
      id: IDS.shopOffer1,
      type: 'product',
      title: 'خصم 20% على iPhone 14',
      subtitle: 'لفترة محدودة',
      discount_label: 20,
      image_url: productsById.get(productIphone14Id).image_url,
      product_id: productsById.get(productIphone14Id).id,
      sort_order: 1,
      is_active: true,
      scope: 'product',
      category: '',
      starts_at: iso(-1 * 24 * 60 * 60 * 1000),
      ends_at: iso(7 * 24 * 60 * 60 * 1000)
    },
    {
      id: IDS.shopOffer2,
      type: 'custom',
      title: 'خصومات على الإلكترونيات',
      subtitle: 'خصم حتى 15% على الإلكترونيات',
      discount_label: 15,
      image_url: validatedBanner,
      product_id: '',
      sort_order: 2,
      is_active: true,
      scope: 'category',
      category: 'إلكترونيات',
      starts_at: iso(-1 * 24 * 60 * 60 * 1000),
      ends_at: iso(10 * 24 * 60 * 60 * 1000)
    }
  ];

  const merchantOffers = [
    {
      id: IDS.merchantOffer1,
      merchant_id: IDS.merchantUser,
      scope: 'all',
      product_id: '',
      category: '',
      discount_label: 10,
      title: '10% على كل منتجات التاجر',
      starts_at: iso(-1 * 24 * 60 * 60 * 1000),
      ends_at: iso(30 * 24 * 60 * 60 * 1000),
      is_active: true,
      sort_order: 1
    }
  ];

  const notifications = [
    {
      id: IDS.notification1,
      user_id: IDS.customerUser,
      type: 'welcome',
      title: '',
      message: 'مرحباً بك في متجر Palma التجريبي 👋',
      reference_id: '',
      is_read: false,
      date: iso(-12 * 60 * 60 * 1000)
    }
  ];

  const carts = [
    {
      id: IDS.cart,
      user_id: IDS.customerUser,
      created_at: iso(-3 * 24 * 60 * 60 * 1000),
      updated_at: iso(-1 * 24 * 60 * 60 * 1000)
    }
  ];

  const orders = [
    {
      id: IDS.order,
      customer_id: IDS.customerUser,
      merchant_id: IDS.merchantUser,
      status: 'COMPLETED',
      total_amount: totalAmount,
      created_at: iso(-2 * 24 * 60 * 60 * 1000),
      updated_at: iso(-1 * 24 * 60 * 60 * 1000)
    }
  ];

  const productComments = [
    {
      id: IDS.comment1,
      product_id: productOrangeJuiceId,
      user_id: IDS.customerUser,
      content: 'منتج ممتاز، الجودة رائعة والتغليف مرتب.',
      rating: 5,
      created_at: iso(-3 * 24 * 60 * 60 * 1000)
    },
    {
      id: IDS.comment2,
      product_id: productArabicCoffeeId,
      user_id: IDS.customerUser,
      content: 'الطعم جيد لكن السعر مرتفع قليلاً.',
      rating: 4,
      created_at: iso(-2 * 24 * 60 * 60 * 1000)
    },
    {
      id: IDS.comment3,
      product_id: productIphone14Id,
      user_id: IDS.brokerUser,
      content: 'هاتف مناسب جداً للزبائن الذين يبحثون عن أداء قوي مع كاميرا ممتازة.',
      rating: 5,
      created_at: iso(-1 * 24 * 60 * 60 * 1000)
    },
    {
      id: IDS.comment4,
      product_id: productIphone14Id,
      user_id: IDS.brokerUser,
      content: 'بعت أكثر من جهاز من هذا الموديل، رضا الزبائن عالي والتقييمات ممتازة.',
      rating: 5,
      created_at: iso(-6 * 60 * 60 * 1000)
    }
  ];

  // Validate relations exist.
  for (const ci of cartItems) {
    if (!productsById.has(ci.product_id)) {
      throw new Error(`cart_items references missing product_id: ${ci.product_id}`);
    }
  }
  for (const oi of orderItems) {
    if (!productsById.has(oi.product_id)) {
      throw new Error(`order_items references missing product_id: ${oi.product_id}`);
    }
  }
  for (const sp of sharedProducts) {
    if (!productsById.has(sp.product_id)) {
      throw new Error(`shared_products references missing product_id: ${sp.product_id}`);
    }
  }

  // Duplicate checks.
  assertNoDuplicateIds(users, 'id', 'users');
  assertNoDuplicateIds(merchantProfiles, 'user_id', 'merchant_profiles');
  assertNoDuplicateIds(validatedProducts, 'id', 'products');
  assertNoDuplicateIds(shopOffers, 'id', 'shop_offers');
  assertNoDuplicateIds(merchantOffers, 'id', 'merchant_offers');
  assertNoDuplicateIds(sharedProducts, 'id', 'shared_products');
  assertNoDuplicateIds(notifications, 'id', 'notifications');
  assertNoDuplicateIds(carts, 'id', 'carts');
  assertNoDuplicateIds(cartItems, 'id', 'cart_items');
  assertNoDuplicateIds(orders, 'id', 'orders');
  assertNoDuplicateIds(orderItems, 'id', 'order_items');
  assertNoDuplicateIds(productComments, 'id', 'product_comments');

  // Final output object (top-level single JSON file).
  const out = {
    users,
    merchant_profiles: merchantProfiles,
    products: validatedProducts,
    shop_offers: shopOffers,
    merchant_offers: merchantOffers,
    shared_products: sharedProducts,
    notifications,
    carts,
    cart_items: cartItems,
    orders,
    order_items: orderItems,
    product_comments: productComments
  };

  // Ensure no null/undefined values appear anywhere in the output.
  const jsonStr = JSON.stringify(out);
  if (jsonStr.includes('null') || jsonStr.includes('undefined')) {
    throw new Error('Output contains null/undefined values');
  }

  // Print compact JSON only (no extra prefixes / no whitespace) for strict paste.
  process.stdout.write(JSON.stringify(out));
}

main().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e));
  process.exit(1);
});

