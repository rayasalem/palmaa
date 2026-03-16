/**
 * Shipment service: LogesTechs API integration.
 * Base URL: https://apisv2.logestechs.com/api
 * Company ID: 634 (or LOGESTECHS_COMPANY_ID in env)
 * Docs: https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis
 */

import axios from 'axios';
import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';
import { withCircuitBreaker } from '../utils/circuitBreaker.js';

const ORDERS_TABLE = 'orders';
const SHIPMENT_API_BASE = process.env.SHIPMENT_API_BASE || 'https://apisv2.logestechs.com/api';
const COMPANY_ID = process.env.LOGESTECHS_COMPANY_ID || '634';
const LOG_SHIPMENT_REQUESTS = process.env.LOG_SHIPMENT_REQUESTS === 'true' || process.env.LOG_SHIPMENT_REQUESTS === '1';

/** Read credentials at runtime so env vars are picked up after dotenv; support alternate names. */
function getAuth() {
  const email = (
    (process.env.LOGESTECHS_EMAIL || process.env.LOGESTECH_EMAIL || process.env.LOGESTECHS_USER || '') + ''
  ).trim();
  const password = (
    (process.env.LOGESTECHS_PASSWORD || process.env.LOGESTECH_PASSWORD || '') + ''
  ).trim();
  return { email, password };
}

/** Log once at startup so Render logs show if LogesTechs is configured (redeploy after changing env vars). */
let _loggedConfig = false;
function logConfigStatus() {
  if (_loggedConfig) return;
  _loggedConfig = true;
  const auth = getAuth();
  const hasEmail = !!auth.email;
  const hasPassword = !!auth.password;
  const configured = hasEmail && hasPassword;
  if (configured) {
    console.log('[shipmentService] LogesTechs: configured (credentials set). Real API will be used.');
  } else {
    const missing = [];
    if (!hasEmail) missing.push('LOGESTECHS_EMAIL');
    if (!hasPassword) missing.push('LOGESTECHS_PASSWORD');
    console.log(
      '[shipmentService] LogesTechs: not configured. Missing or empty:',
      missing.join(', '),
      '— Add them in .env (local) or Render Environment, then restart/redeploy.'
    );
  }
}

function safeLog(label, obj) {
  if (!LOG_SHIPMENT_REQUESTS) return;
  const sanitized =
    obj && typeof obj === 'object'
      ? JSON.parse(JSON.stringify(obj, (k, v) => (k === 'password' ? '[REDACTED]' : v)))
      : obj;
  console.log(`[shipmentService] ${label}:`, JSON.stringify(sanitized, null, 2));
}

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

async function getOrderById(orderId) {
  const id = orderId && String(orderId).trim();
  if (!id) return { data: null, error: { message: 'Order id is required' } };
  let result;
  if (isUuid(id)) {
    result = await supabase.from(ORDERS_TABLE).select('*').eq('id', id).single();
  } else if (/^ORD-[0-9a-f]{8}$/i.test(id)) {
    result = await supabase.from(ORDERS_TABLE).select('*').eq('order_reference', id).single();
  } else {
    return { data: null, error: { message: 'Invalid order id format' } };
  }
  if (result.error) {
    logger.error('shipmentService Get order error', { message: result.error.message });
    return { data: null, error: result.error };
  }
  return { data: result.data, error: null };
}

/**
 * Call LogesTechs create-shipment API.
 * Default: POST {SHIPMENT_API_BASE}/ship/request/by-email
 * If your Postman collection uses another path (e.g. /guests/634/packages), set env:
 *   LOGESTECHS_CREATE_SHIPMENT_PATH=/guests/634/packages
 * Ref: https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis
 */
async function callCreateShipmentApi(body) {
  const path = process.env.LOGESTECHS_CREATE_SHIPMENT_PATH || '/ship/request/by-email';
  const base = SHIPMENT_API_BASE.replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  safeLog('CREATE SHIPMENT REQUEST', { url, headers: { 'company-id': COMPANY_ID }, body });
  const { data, error } = await withCircuitBreaker(
    'shipment',
    () =>
      axios.post(url, body, {
        headers: { 'company-id': COMPANY_ID, 'Content-Type': 'application/json' },
        timeout: 8000,
      }),
    { timeoutMs: 8000 }
  );
  if (error) {
    safeLog('CREATE SHIPMENT ERROR', { message: error.message });
    logger.error('shipmentService Create shipment API error', { message: error.message });
    return { data: null, error: { message: error.message } };
  }
  console.log('[shipmentService] LogesTechs API create-shipment success', { status: data?.status });
  safeLog('CREATE SHIPMENT RESPONSE', { status: data?.status, data: data?.data });
  return { data, error: null };
}

async function updateOrderShipment(orderId, shipmentId, shipmentStatus) {
  const { data: order, error: resolveErr } = await getOrderById(orderId);
  if (resolveErr || !order) {
    logger.error('shipmentService updateOrderShipment getOrderById', { orderId, message: (resolveErr && resolveErr.message) || 'Order not found' });
    return { data: null, error: resolveErr || { message: 'Order not found' } };
  }
  const id = order.id;
  console.log('[shipmentService] Updating order shipment:', { orderId, id, shipmentId, shipmentStatus });
  const now = new Date().toISOString();
  const normalized = String(shipmentStatus || '').toLowerCase();
  const isDelivered = normalized === 'delivered';
  const isCancelled =
    normalized === 'cancelled' ||
    normalized === 'canceled' ||
    normalized === 'cancel';
  const updatePayload = {
    delivery_id: shipmentId,
    delivery_status: shipmentStatus,
    updated_at: now,
  };
  if (isDelivered) {
    updatePayload.completed_at = now;
    updatePayload.delivery_confirmed_at = now;
    updatePayload.status = 'completed';
  } else if (isCancelled) {
    updatePayload.status = 'CANCELLED';
    updatePayload.cancelled_at = now;
  }
  const { data, error } = await supabase.from(ORDERS_TABLE).update(updatePayload).eq('id', id).select().single();
  if (error) {
    logger.error('shipmentService Update error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Build LogesTechs request body: email, password, pkgUnitType, pkg, destinationAddress, originAddress.
 * See: https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis
 */
function buildShipmentPayload(order, shipmentInput) {
  const merged = { ...(order || {}), ...(shipmentInput || {}) };

  const cod = Number(merged.cod ?? merged.amount ?? merged.total_amount ?? 0);
  const quantity = Math.max(1, Number(merged.quantity ?? 1));
  const serviceType = merged.serviceType || 'STANDARD';
  const shipmentType = merged.shipmentType || 'COD';

  const senderName = String(merged.senderName || process.env.SENDER_NAME || 'Palma Marketplace').trim();
  const senderPhone = String(merged.senderPhone || process.env.SENDER_PHONE || merged.phone || '').trim();
  const receiverName = String(merged.receiverName || merged.recipient_name || merged.shipping_name || '').trim();
  const receiverPhone = String(merged.receiverPhone || merged.phone || merged.shipping_phone || '').trim();
  const receiverPhone2 = String(merged.receiverPhone2 || '').trim() || undefined;

  const destCityId = Number(merged.cityId ?? merged.shipping_city_id) || null;
  const destVillageId = Number(merged.villageId ?? merged.shipping_village_id) || null;
  const destRegionId = Number(merged.regionId ?? merged.shipping_region_id) || null;

  let destAddressLine1 = String(
    merged.addressLine1 ||
      merged.address ||
      merged.shipping_address ||
      `${merged.cityName || ''} ${merged.villageName || ''}` ||
      ''
  ).trim();
  if (!destAddressLine1) {
    destAddressLine1 = 'عنوان غير مذكور';
  }

  const destinationAddress = {
    addressLine1: destAddressLine1,
    cityId: destCityId,
    villageId: destVillageId,
    regionId: destRegionId,
  };

  const originCityId = Number(merged.originCityId || process.env.SENDER_CITY_ID) || destCityId;
  const originVillageId = Number(merged.originVillageId || process.env.SENDER_VILLAGE_ID) || destVillageId;
  const originRegionId = Number(merged.originRegionId || process.env.SENDER_REGION_ID) || destRegionId;

  let originAddressLine1 = String(
    merged.originAddressLine1 ||
      process.env.SENDER_ADDRESS_LINE1 ||
      merged.addressLine1 ||
      destAddressLine1 ||
      ''
  ).trim();
  if (!originAddressLine1) {
    originAddressLine1 = 'Palma Marketplace';
  }

  const originAddress = {
    addressLine1: originAddressLine1,
    addressLine2: String(merged.originAddressLine2 || process.env.SENDER_ADDRESS_LINE2 || '').trim() || undefined,
    cityId: originCityId,
    regionId: originRegionId,
    villageId: originVillageId,
  };

  let toCollectFromReceiver;
  if (shipmentType === 'SWAP' || shipmentType === 'BRING') {
    toCollectFromReceiver = Number(merged.toCollectFromReceiver ?? merged.cod ?? cod ?? 0);
  }

  const pkg = {
    cod: String(cod),
    notes: String(merged.notes || '').trim() || undefined,
    invoiceNumber: `${String(merged.invoiceNumber || merged.id || (order && order.id) || 'ORD').trim()}-${Date.now()}`,
    senderName,
    businessSenderName: String(
      merged.businessSenderName || process.env.SENDER_BUSINESS_NAME || 'Palma Marketplace'
    ).trim(),
    senderPhone,
    receiverName,
    receiverPhone,
    receiverPhone2: receiverPhone2 || undefined,
    serviceType,
    shipmentType,
    quantity,
    description: String(merged.description || 'Order shipment').trim() || undefined,
  };
  if (toCollectFromReceiver != null && (shipmentType === 'SWAP' || shipmentType === 'BRING')) {
    pkg.toCollectFromReceiver = toCollectFromReceiver;
  }

  const auth = getAuth();
  return {
    email: auth.email,
    password: auth.password,
    pkgUnitType: 'METRIC',
    pkg,
    destinationAddress,
    originAddress,
  };
}

/** Once per process: log that real LogesTechs API is disabled. */
let _loggedSimulation = false;

/**
 * Create shipment for an order via LogesTechs POST /ship/request/by-email.
 * Requires env: LOGESTECHS_EMAIL, LOGESTECHS_PASSWORD; LOGESTECHS_COMPANY_ID (default 634).
 * When credentials are not set, simulates success (fake shipment id) so checkout can complete;
 * في هذه الحالة الطلبات لا تظهر على تطبيق LogesTechs — يجب تعيين المتغيرات لتفعيل الـ API الحقيقي.
 */
async function createShipment(orderId, shipmentInput) {
  logConfigStatus();
  const auth = getAuth();
  if (!auth.email || !auth.password) {
    if (!_loggedSimulation) {
      _loggedSimulation = true;
      const missing = [];
      if (!auth.email) missing.push('LOGESTECHS_EMAIL');
      if (!auth.password) missing.push('LOGESTECHS_PASSWORD');
      logger.warn('shipmentService LogesTechs not configured: missing or empty env:', missing.join(', '), '— Add in .env (local) or Render Environment, then restart server / Redeploy.');
    }
    const orderResult = await getOrderById(orderId);
    if (orderResult.error) {
      return { order: null, shipment: null, error: orderResult.error };
    }
    const order = orderResult.data;
    if (order && order.delivery_id) {
      return {
        order,
        shipment: { id: order.delivery_id, status: order.delivery_status || 'created' },
        error: null,
      };
    }
    const simId = `sim-${String(order.id || orderId).slice(-8)}-${Date.now()}`;
    console.log('[shipmentService] LogesTechs not configured; simulating shipment creation for order:', order.id || orderId);
    const updateResult = await updateOrderShipment(order.id, simId, 'created');
    if (updateResult.error) {
      return { order, shipment: null, error: updateResult.error };
    }
    return {
      order: updateResult.data,
      shipment: { id: simId, status: 'created', shipment_id: simId },
      error: null,
    };
  }

  const orderResult = await getOrderById(orderId);
  if (orderResult.error) {
    return { order: null, shipment: null, error: orderResult.error };
  }

  const order = orderResult.data;
  if (order && order.delivery_id) {
    return {
      order,
      shipment: { id: order.delivery_id, status: order.delivery_status },
      error: null,
    };
  }

  console.log('[shipmentService] Calling LogesTechs API to create shipment for order:', orderId);
  const body = buildShipmentPayload(order, shipmentInput);
  const apiResult = await callCreateShipmentApi(body);
  if (apiResult.error) {
    return { order, shipment: null, error: apiResult.error };
  }

  const res = apiResult.data || {};
  const raw = res.data || res;
  const shipmentId =
    raw.id ?? raw.shipment_id ?? raw.shipmentId ?? raw.packageId ?? raw.barcode ?? res.id ?? res.shipment_id ?? res.shipmentId ?? null;
  const shipmentStatus = (raw.status ?? res.status ?? raw.barcode) ? 'created' : 'created';

  if (!shipmentId) {
    logger.warn('shipmentService LogesTechs API returned success but no shipment id in response. Check API response shape. Body:', JSON.stringify(res).slice(0, 500));
  }
  const idToStore = shipmentId ? String(shipmentId) : `logestechs-${order.id}-${Date.now()}`;
  const updateResult = await updateOrderShipment(order.id, idToStore, shipmentStatus);
  if (updateResult.error) {
    return { order, shipment: res, error: updateResult.error };
  }
  return { order: updateResult.data, shipment: res, error: null };
}

/**
 * Get package status from LogesTechs GET /guests/packages/status?id= or ?barcode=
 * For simulated shipments (id starting with sim-), return status from orders table.
 */
async function getPackageStatus(params) {
  const { id, barcode } = params;
  if (!id && !barcode) {
    return { data: null, error: { message: 'id or barcode is required' } };
  }
  const sid = (id && String(id).trim()) || null;
  if (sid && sid.startsWith('sim-')) {
    const { data: rows, error } = await supabase
      .from(ORDERS_TABLE)
      .select('delivery_status, status')
      .eq('delivery_id', sid)
      .limit(1);
    if (error) {
      logger.error('shipmentService getPackageStatus sim lookup', { message: error.message });
      return { data: { status: 'created' }, error: null };
    }
    const order = rows && rows[0];
    const status = (order && (order.delivery_status || order.status)) || 'created';
    return { data: { status }, error: null };
  }
  const base = SHIPMENT_API_BASE.replace(/\/$/, '');
  const statusPath = process.env.LOGESTECHS_STATUS_PATH || `/guests/${COMPANY_ID}/packages/status`;
  const url = statusPath.startsWith('http') ? statusPath : `${base}${statusPath.startsWith('/') ? statusPath : `/${statusPath}`}`;
  const query = id ? `id=${encodeURIComponent(id)}` : `barcode=${encodeURIComponent(barcode)}`;
  const headers = { 'company-id': COMPANY_ID, 'Content-Type': 'application/json' };
  safeLog('GET STATUS REQUEST', { url: `${url}?${query}`, headers });
  try {
    const response = await axios.get(`${url}?${query}`, { headers, timeout: 10000 });
    safeLog('GET STATUS RESPONSE', { status: response.status, data: response.data });
    return { data: response.data, error: null };
  } catch (err) {
    const errRes = err.response;
    safeLog('GET STATUS ERROR', { status: errRes && errRes.status, data: errRes && errRes.data, message: err.message });
    const msg = (errRes && errRes.data && errRes.data.message) || err.message;
    return { data: null, error: { message: msg } };
  }
}

/**
 * Print AWBs: LogesTechs POST /guests/{companyId}/packages/pdf with body { ids: [shipment ids] }
 */
async function printAwb(shipmentIds) {
  if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    return { data: null, error: { message: 'shipmentIds array is required' } };
  }
  const url = `${SHIPMENT_API_BASE.replace(/\/$/, '')}/guests/${COMPANY_ID}/packages/pdf`;
  safeLog('PRINT PDF REQUEST', { url, body: { ids: shipmentIds } });
  const idsPayload = shipmentIds.map((id) => {
    const n = Number(id);
    return Number.isNaN(n) ? String(id) : n;
  });
  try {
    const response = await axios.post(
      url,
      { ids: idsPayload },
      {
        headers: { 'company-id': COMPANY_ID, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
    safeLog('PRINT PDF RESPONSE', {
      status: response.status,
      dataKeys: response.data ? Object.keys(response.data) : [],
    });
    return { data: response.data, error: null };
  } catch (err) {
    const errRes = err.response;
    safeLog('PRINT PDF ERROR', { status: errRes && errRes.status, message: err.message });
    const msg = (errRes && errRes.data && errRes.data.message) || err.message;
    return { data: null, error: { message: msg } };
  }
}

/**
 * Cancel shipment: LogesTechs PUT /guests/{companyId}/packages/{shipmentId}/cancel
 * Body: { email, password }
 */
async function cancelShipment(shipmentId) {
  const auth = getAuth();
  if (!auth.email || !auth.password) {
    return { data: null, error: { message: 'LogesTechs credentials not configured' } };
  }
  const url = `${SHIPMENT_API_BASE.replace(/\/$/, '')}/guests/${COMPANY_ID}/packages/${encodeURIComponent(shipmentId)}/cancel`;
  safeLog('CANCEL REQUEST', { url, shipmentId });
  try {
    const response = await axios.put(
      url,
      { email: auth.email, password: auth.password },
      {
        headers: { 'company-id': COMPANY_ID, 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );
    safeLog('CANCEL RESPONSE', { status: response.status, data: response.data });
    return { data: response.data, error: null };
  } catch (err) {
    const errRes = err.response;
    safeLog('CANCEL ERROR', { status: errRes && errRes.status, message: err.message });
    const msg = (errRes && errRes.data && errRes.data.message) || err.message;
    return { data: null, error: { message: msg } };
  }
}

logConfigStatus();

export { getOrderById, updateOrderShipment, createShipment, getPackageStatus, printAwb, cancelShipment, ORDERS_TABLE };
