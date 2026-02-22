/**
 * Shipment controller: create shipment, get status, print AWB (LogesTechs API).
 */

import * as shipmentService from '../services/shipmentService.js';

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
      console.error('[shipmentController] createShipment error:', error);
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
    console.error('[shipmentController] createShipment unexpected:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getStatus(req, res) {
  try {
    const { id, barcode } = req.query;
    const { data, error } = await shipmentService.getPackageStatus({ id, barcode });
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, status: data });
  } catch (err) {
    console.error('[shipmentController] getStatus:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function printPdf(req, res) {
  try {
    const { ids } = req.body || {};
    const list = Array.isArray(ids) ? ids : [];
    const { data, error } = await shipmentService.printAwb(list);
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, pdf: data });
  } catch (err) {
    console.error('[shipmentController] printPdf:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function cancel(req, res) {
  try {
    const { shipmentId } = req.params;
    if (!shipmentId) {
      return res.status(400).json({ success: false, error: 'shipmentId is required' });
    }
    const { data, error } = await shipmentService.cancelShipment(shipmentId);
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, result: data });
  } catch (err) {
    console.error('[shipmentController] cancel:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { createShipment, getStatus, printPdf, cancel };
