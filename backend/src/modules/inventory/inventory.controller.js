'use strict';

const { success, error, paginated } = require('../../utils/response');
const service = require('./inventory.service');
const { parsePagination } = require('../../utils/pagination');

async function listBatches(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const { data, total } = await service.listBatches(req.query, pagination);
    return paginated(res, data, { ...pagination, total });
  } catch (err) { next(err); }
}

async function getBatch(req, res, next) {
  try {
    const batch = await service.getBatchById(req.params.id);
    if (!batch) return error(res, 'Batch not found', 404, 'NOT_FOUND');
    return success(res, batch);
  } catch (err) { next(err); }
}

async function createBatch(req, res, next) {
  try {
    const batch = await service.createBatch(req.body);
    return success(res, batch, 'Batch created', 201);
  } catch (err) { next(err); }
}

async function updateBatch(req, res, next) {
  try {
    const batch = await service.updateBatch(req.params.id, req.body);
    return success(res, batch, 'Batch updated');
  } catch (err) { next(err); }
}

async function stockSummary(req, res, next) {
  try {
    const data = await service.getStockSummary();
    return success(res, data, 'Stock summary');
  } catch (err) { next(err); }
}

async function adjust(req, res, next) {
  try {
    const adj = await service.adjustBatch(req.body.batchId, req.body, req.user.id);
    return success(res, adj, 'Stock adjusted');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function listReservations(req, res, next) {
  try {
    const data = await service.listReservations(req.query.orderId);
    return success(res, data);
  } catch (err) { next(err); }
}

async function nearExpiry(req, res, next) {
  try {
    const data = await service.getNearExpiryBatches();
    return success(res, data, 'Near-expiry batches');
  } catch (err) { next(err); }
}

async function listAdjustments(req, res, next) {
  try {
    const data = await service.listAdjustments(req.query, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

module.exports = { listBatches, getBatch, createBatch, updateBatch, stockSummary, adjust, listReservations, nearExpiry, listAdjustments };
