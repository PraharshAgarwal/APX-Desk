'use strict';

const { success, error } = require('../../utils/response');
const service = require('./warehouse.service');
const transferService = require('./transfer.service');
const { parsePagination } = require('../../utils/pagination');

async function listGRN(req, res, next) {
  try {
    const data = await service.listGRN(req.query, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

async function createGRN(req, res, next) {
  try {
    const result = await service.createGRN(req.body, req.user.id);
    return success(res, result, 'GRN submitted for approval', 201);
  } catch (err) { next(err); }
}

async function getGRN(req, res, next) {
  try {
    const grn = await service.getGRN(req.params.id);
    if (!grn) return error(res, 'GRN not found', 404, 'NOT_FOUND');
    return success(res, grn);
  } catch (err) { next(err); }
}

async function listPendingGRNs(req, res, next) {
  try {
    const data = await service.listPendingGRNs();
    return success(res, data);
  } catch (err) { next(err); }
}

async function approveGRN(req, res, next) {
  try {
    const { approved, notes } = req.body;
    const result = await service.approveGRN(req.params.id, req.user.id, { approved, notes });
    const msg = approved ? 'GRN approved — inventory updated' : 'GRN rejected';

    // Emit real-time event if Socket.IO is available
    const io = req.app.get('io');
    if (io) io.emit('grn:reviewed', { grnId: req.params.id, approved });

    return success(res, result, msg);
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function pickOrder(req, res, next) {
  try {
    const order = await service.pickOrder(req.params.orderId, req.user.id);
    return success(res, order, 'Order picked for dispatch');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function createDispatch(req, res, next) {
  try {
    const dispatch = await service.createDispatch(req.params.orderId, req.body, req.user.id);
    const io = req.app.get('io');
    if (io) io.emit('dispatch:created', { dispatchId: dispatch.id, orderId: req.params.orderId });
    return success(res, dispatch, 'Dispatch created — awaiting warehouse execution', 201);
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function executeDispatch(req, res, next) {
  try {
    const dispatch = await service.executeDispatch(req.params.id, req.user.id);
    const io = req.app.get('io');
    if (io) io.emit('dispatch:executed', { dispatchId: req.params.id });
    return success(res, dispatch, 'Dispatch executed — shipment in transit');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function listDispatches(req, res, next) {
  try {
    const data = await service.listDispatches(req.query, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

async function getDispatch(req, res, next) {
  try {
    const dispatch = await service.getDispatch(req.params.id);
    if (!dispatch) return error(res, 'Dispatch not found', 404, 'NOT_FOUND');
    return success(res, dispatch);
  } catch (err) { next(err); }
}

async function markDelivered(req, res, next) {
  try {
    const dispatch = await service.markDelivered(req.params.id, req.user.id);
    return success(res, dispatch, 'Marked as delivered');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function listWarehouses(req, res, next) {
  try { return success(res, await service.listWarehouses()); } catch (err) { next(err); }
}

// ── Transfer handlers ─────────────────────────────────────────

async function listTransfers(req, res, next) {
  try {
    const data = await transferService.listTransfers(req.query, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

async function createTransfer(req, res, next) {
  try {
    const result = await transferService.createTransfer(req.body, req.user);
    return success(res, result, 'Transfer initiated', 201);
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function getTransfer(req, res, next) {
  try {
    const transfer = await transferService.getTransferById(req.params.id);
    return success(res, transfer);
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function completeTransfer(req, res, next) {
  try {
    const transfer = await transferService.completeTransfer(req.params.id, req.user);
    return success(res, transfer, 'Transfer completed — stock received at destination');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function cancelTransfer(req, res, next) {
  try {
    const transfer = await transferService.cancelTransfer(req.params.id, req.user);
    return success(res, transfer, 'Transfer cancelled — stock restored');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

module.exports = {
  listGRN, createGRN, getGRN,
  listPendingGRNs, approveGRN,
  pickOrder, createDispatch, executeDispatch,
  listDispatches, getDispatch, markDelivered,
  listWarehouses,
  listTransfers, createTransfer, getTransfer, completeTransfer, cancelTransfer,
};
