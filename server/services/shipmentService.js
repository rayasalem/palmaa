/**
 * Shipment service: LogesTechs API integration.
 * Base URL: https://apisv2.logestechs.com/api
 * Company ID: 634 (or LOGESTECHS_COMPANY_ID in env)
 * Docs: https://www.postman.com/ali-asfour/logestech-s-api/collection/1kmztpz/logestechs-apis
 */

import axios from 'axios';
import { supabase } from '../config/supabaseClient.js';

const ORDERS_TABLE = 'orders';
const SHIPMENT_API_BASE = process.env.SHIPMENT_API_BASE || 'https://apisv2.logestechs.com/api';
const COMPANY_ID = process.env.LOGESTECHS_COMPANY_ID || '634';
const LOGESTECHS_EMAIL = process.env.LOGESTECHS_EMAIL || '';
const LOGESTECHS_PASSWORD = process.env.LOGESTECHS_PASSWORD || '';
const LOG_SHIPMENT_REQUESTS = process.env.LOG_SHIPMENT_REQUESTS === 'true' || process.env.LOG_SHIPMENT_REQUESTS === '1';

function safeLog(label, obj) {
  if (!LOG_SHIPMENT_REQUESTS) return;
  const sanitized = obj && typeof obj === 'object' ? JSON.parse(JSON.stringify(obj, (k, v) => (k === 'password' ? '[REDACTED]' : v))) : obj;
  console.log(`[shipmentService] ${label}:`, JSON.stringify(sanitized, null, 2));
}

function getAuth() {
  return {
    email: LOGESTECHS_EMAIL,
    password: LOGESTECHS_PASSWORD,
  };
}

async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select('*')
    .eq('id', orderId)
    .single();
  if (error) {
    console.error('[shipmentService] Get order error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Call LogesTechs POST /ship/request/by-email
 * Body: { email, password, pkgUnitType, pkg, destinationAddress, originAddress }
 */
async function callCreateShipmentApi(body) {
  const url = `${SHIPMENT_API_BASE.replace(/\/$/, '')}/ship/request/by-email`;
  safeLog('CREATE SHIPMENT REQUEST', { url, headers: { 'company-id': COMPANY_ID }, body });
  try {
    const response = await axios.post(url, body, {
      headers: {
        'company-id': COMPANY_ID,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });
    safeLog('CREATE SHIPMENT RESPONSE', { status: response.status, data: response.data });
    return { data: response.data, error: null };
  } catch (err) {
    const res = err.response;
    const msg = res?.data?.message || (typeof res?.data === 'string' ? res.data : JSON.stringify(res?.data || err.message));
    safeLog('CREATE SHIPMENT ERROR', { status: res?.status, data: res?.data, message: msg });
    console.error('[shipmentService] Create shipment API error:', msg);
    return { data: null, error: { message: typeof msg === 'string' ? msg : msg } };
  }
}

async function updateOrderShipment(orderId, shipmentId, shipmentStatus) {
  console.log('[shipmentService] Updating order shipment:', { orderId, shipmentId, shipmentStatus });
  const now = new Date().toISOString();
  const isDelivered = String(shipmentStatus || '').toLowerCase() === 'delivered';
  const updatePayload = {
    delivery_id: shipmentId,
    delivery_status: shipmentStatus,
    updated_at: now,
  };
  if (isDelivered) {
    updatePayload.completed_at = now;
    updatePayload.delivery_confirmed_at = now;
    updatePayload.status = 'completed';
  }
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single();
  if (error) {
    console.error('[shipmentService] Update error:', error.message);
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

  const cod = Number(merged.cod ?? merged.amount ?? 0);
  const quantity = Math.max(1, Number(merged.quantity ?? 1));
  const serviceType = merged.serviceType || 'STANDARD';
  const shipmentType = merged.shipmentType || 'COD';

  const senderName = String(merged.senderName || process.env.SENDER_NAME || 'Palma Marketplace').trim();
  const senderPhone = String(merged.senderPhone || process.env.SENDER_PHONE || merged.phone || '').trim();
  const receiverName = String(merged.receiverName || merged.recipient_name || '').trim();
  const receiverPhone = String(merged.receiverPhone || merged.phone || '').trim();
  const receiverPhone2 = String(merged.receiverPhone2 || '').trim() || undefined;

  const destCityId = Number(merged.cityId) || null;
  const destVillageId = Number(merged.villageId) || null;
  const destRegionId = Number(merged.regionId) || null;

  const destinationAddress = {
    addressLine1: String(merged.addressLine1 || merged.address || '').trim(),
    cityId: destCityId,
    villageId: destVillageId,
    regionId: destRegionId,
  };

  const originCityId = Number(merged.originCityId || process.env.SENDER_CITY_ID) || destCityId;
  const originVillageId = Number(merged.originVillageId || process.env.SENDER_VILLAGE_ID) || destVillageId;
  const originRegionId = Number(merged.originRegionId || process.env.SENDER_REGION_ID) || destRegionId;

  const originAddress = {
    addressLine1: String(merged.originAddressLine1 || process.env.SENDER_ADDRESS_LINE1 || merged.addressLine1 || '').trim(),
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
    invoiceNumber: `${String(merged.invoiceNumber || merged.id || order?.id || 'ORD').trim()}-${Date.now()}`,
    senderName,
    businessSenderName: String(merged.businessSenderName || process.env.SENDER_BUSINESS_NAME || 'Palma Marketplace').trim(),
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

/**
 * Create shipment for an order via LogesTechs POST /ship/request/by-email.
 * Requires env: LOGESTECHS_EMAIL, LOGESTECHS_PASSWORD; LOGESTECHS_COMPANY_ID (default 634).
 */
async function createShipment(orderId, shipmentInput) {
  const auth = getAuth();
  if (!auth.email || !auth.password) {
    return {
      order: null,
      shipment: null,
      error: { message: 'LogesTechs credentials not configured (LOGESTECHS_EMAIL, LOGESTECHS_PASSWORD)' },
    };
  }

  const orderResult = await getOrderById(orderId);
  if (orderResult.error) {
    return { order: null, shipment: null, error: orderResult.error };
  }

  const order = orderResult.data;
  if (order?.delivery_id) {
    return {
      order,
      shipment: { id: order.delivery_id, status: order.delivery_status },
      error: null,
    };
  }

  const body = buildShipmentPayload(order, shipmentInput);
  const apiResult = await callCreateShipmentApi(body);
  if (apiResult.error) {
    return { order, shipment: null, error: apiResult.error };
  }

  const res = apiResult.data || {};
  const shipmentId = res.id ?? res.shipment_id ?? res.shipmentId ?? null;
  const shipmentStatus = res.status ?? res.barcode ? 'created' : 'created';

  const updateResult = await updateOrderShipment(orderId, String(shipmentId), shipmentStatus);
  if (updateResult.error) {
    return { order, shipment: res, error: updateResult.error };
  }
  return { order: updateResult.data, shipment: res, error: null };
}

/**
 * Get package status from LogesTechs GET /guests/packages/status?id= or ?barcode=
 */
async function getPackageStatus(params) {
  const { id, barcode } = params;
  if (!id && !barcode) {
    return { data: null, error: { message: 'id or barcode is required' } };
  }
  const url = `${SHIPMENT_API_BASE.replace(/\/$/, '')}/guests/packages/status`;
  const query = id ? `id=${encodeURIComponent(id)}` : `barcode=${encodeURIComponent(barcode)}`;
  safeLog('GET STATUS REQUEST', { url: `${url}?${query}`, headers: { 'company-id': COMPANY_ID } });
  try {
    const response = await axios.get(`${url}?${query}`, {
      headers: { 'company-id': COMPANY_ID, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    safeLog('GET STATUS RESPONSE', { status: response.status, data: response.data });
    return { data: response.data, error: null };
  } catch (err) {
    safeLog('GET STATUS ERROR', { status: err.response?.status, data: err.response?.data, message: err.message });
    const msg = err.response?.data?.message || err.message;
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
  try {
    const response = await axios.post(
      url,
      { ids: shipmentIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n)) },
      {
        headers: { 'company-id': COMPANY_ID, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
    safeLog('PRINT PDF RESPONSE', { status: response.status, dataKeys: response.data ? Object.keys(response.data) : [] });
    return { data: response.data, error: null };
  } catch (err) {
    safeLog('PRINT PDF ERROR', { status: err.response?.status, message: err.message });
    const msg = err.response?.data?.message || err.message;
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
    safeLog('CANCEL ERROR', { status: err.response?.status, message: err.message });
    const msg = err.response?.data?.message || err.message;
    return { data: null, error: { message: msg } };
  }
}

export {
  getOrderById,
  updateOrderShipment,
  createShipment,
  getPackageStatus,
  printAwb,
  cancelShipment,
  ORDERS_TABLE,
};
