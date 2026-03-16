/**
 * Shipment controller: create shipment, get status, print AWB (LogesTechs API).
 * All actions verify order/shipment ownership (customer, merchant, or ADMIN).
 */

import * as shipmentService from '../services/shipmentService.js';
import * as orderService from '../services/orderService.js';
import logger from '../utils/logger.js';

/** Check if the current user may access this order (customer, merchant, or ADMIN). */
function canAccessOrder(order, req) {
  const userId = req.auth && req.auth.sub;
  const role = (req.auth && (req.auth.role || req.auth.role_id || '')) || '';
  if (role.toUpperCase() === 'ADMIN') return true;
  if (!userId) return false;
  const uid = String(userId).trim();
  return (order.customer_id && String(order.customer_id).trim() === uid) ||
    (order.merchant_id && String(order.merchant_id).trim() === uid);
}

async function createShipment(req, res) {
  try {
    const {
      orderId,
      // destination
      addressLine1,
      addressLine2,
      cityId,
      regionId,
      villageId,
      // parties
      recipient_name,
      phone,
      email,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      // package
      weight,
      cod,
      notes,
      invoiceNumber,
      quantity,
      description,
      serviceType,
      shipmentType,
      toCollectFromReceiver,
    } = req.body;

    if (!orderId || String(orderId).trim() === '') {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    if (!recipient_name || String(recipient_name).trim() === '') {
      return res.status(400).json({ success: false, error: 'recipient_name is required' });
    }
    if (!addressLine1 || String(addressLine1).trim() === '') {
      return res.status(400).json({ success: false, error: 'addressLine1 is required' });
    }
    if (!cityId || String(cityId).trim() === '') {
      return res.status(400).json({ success: false, error: 'cityId is required' });
    }
    if (!villageId || String(villageId).trim() === '') {
      return res.status(400).json({ success: false, error: 'villageId is required' });
    }
    if (!phone || String(phone).trim() === '') {
      return res.status(400).json({ success: false, error: 'receiver phone is required' });
    }

    const numWeight = Number(weight);
    if (Number.isNaN(numWeight) || numWeight <= 0) {
      return res.status(400).json({ success: false, error: 'weight must be a positive number' });
    }

    const numCod = cod != null ? Number(cod) : 0;
    if (Number.isNaN(numCod) || numCod < 0) {
      return res.status(400).json({ success: false, error: 'cod must be a non-negative number' });
    }

    const numQty = quantity != null ? Number(quantity) : 1;
    if (Number.isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ success: false, error: 'quantity must be a positive number' });
    }

    if (email && !/^\S+@\S+\.\S+$/.test(String(email))) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const phoneStr = String(phone).trim();
    if (!/^[0-9+\-\s]{6,}$/.test(phoneStr)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    const { data: existingOrder, error: orderErr } = await orderService.getOrderById(orderId);
    if (orderErr || !existingOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (!canAccessOrder(existingOrder, req)) {
      return res.status(403).json({ success: false, error: 'Not authorized to create shipment for this order' });
    }

    const shipmentInput = {
      addressLine1,
      addressLine2,
      cityId,
      regionId,
      villageId,
      recipient_name,
      phone,
      email,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      weight: numWeight,
      cod: numCod,
      notes,
      invoiceNumber,
      quantity: numQty,
      description,
      serviceType,
      shipmentType,
      toCollectFromReceiver,
    };

    console.log('[shipmentController] createShipment:', { orderId, cityId, villageId, cod: numCod, quantity: numQty });
    const { order, shipment, error } = await shipmentService.createShipment(orderId, shipmentInput);
    if (error) {
      logger.error('shipmentController createShipment error', { message: error && error.message });
      const msg = error.message || 'Failed to create shipment';
      const isDuplicate = typeof msg === 'string' && (msg.includes('موجود مسبقا') || msg.includes('already exists'));
      return res.status(isDuplicate ? 409 : 500).json({
        success: false,
        error: isDuplicate ? 'Shipment already exists for this order / الشحنة موجودة مسبقاً' : msg,
      });
    }

    return res.status(200).json({
      success: true,
      order,
      shipment,
      message: 'Shipment created; shipment_id and shipment_status saved to order.',
    });
  } catch (err) {
    logger.error('shipmentController createShipment unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getStatus(req, res) {
  try {
    const { id, barcode } = req.query;
    const sid = (id && String(id).trim()) || (barcode && String(barcode).trim());
    if (!sid) {
      return res.status(400).json({ success: false, error: 'id or barcode is required' });
    }
    const { data: orderByDelivery } = await orderService.getOrderByDeliveryId(sid);
    if (orderByDelivery && !canAccessOrder(orderByDelivery, req)) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this shipment status' });
    }
    const { data, error } = await shipmentService.getPackageStatus({ id, barcode });
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, status: data });
  } catch (err) {
    logger.error('shipmentController getStatus', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function printPdf(req, res) {
  try {
    const { ids } = req.body || {};
    const list = Array.isArray(ids) ? ids : [];
    for (const sid of list) {
      const idStr = sid != null ? String(sid).trim() : '';
      if (!idStr) continue;
      const { data: orderByDelivery } = await orderService.getOrderByDeliveryId(idStr);
      if (orderByDelivery && !canAccessOrder(orderByDelivery, req)) {
        return res.status(403).json({ success: false, error: 'Not authorized to print AWB for one or more shipments' });
      }
    }
    const { data, error } = await shipmentService.printAwb(list);
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, pdf: data });
  } catch (err) {
    logger.error('shipmentController printPdf', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function cancel(req, res) {
  try {
    const { shipmentId } = req.params;
    if (!shipmentId) {
      return res.status(400).json({ success: false, error: 'shipmentId is required' });
    }
    const { data: orderByDelivery, error: orderErr } = await orderService.getOrderByDeliveryId(shipmentId);
    if (!orderErr && orderByDelivery && !canAccessOrder(orderByDelivery, req)) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this shipment' });
    }
    const { data, error } = await shipmentService.cancelShipment(shipmentId);
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, result: data });
  } catch (err) {
    logger.error('shipmentController cancel', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { createShipment, getStatus, printPdf, cancel };
