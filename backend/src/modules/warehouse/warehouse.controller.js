'use strict';

const { success, error } = require('../../utils/response');
const service = require('./warehouse.service');
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
    return success(res, result, 'GRN created', 201);
  } catch (err) { next(err); }
}

async function getGRN(req, res, next) {
  try {
    const grn = await service.getGRN(req.params.id);
    if (!grn) return error(res, 'GRN not found', 404, 'NOT_FOUND');
    return success(res, grn);
  } catch (err) { next(err); }
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

async function dispatchOrder(req, res, next) {
  try {
    const dispatch = await service.dispatchOrder(req.params.orderId, req.body, req.user.id);
    const io = req.app.get('io');
    if (io) io.emit('dispatch:created', { dispatchId: dispatch.id, orderId: req.params.orderId });
    return success(res, dispatch, 'Order dispatched', 201);
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

module.exports = { listGRN, createGRN, getGRN, pickOrder, dispatchOrder, listDispatches, getDispatch, markDelivered, listWarehouses };
