'use strict';

const { success, error, paginated } = require('../../utils/response');
const service = require('./finance.service');
const { parsePagination } = require('../../utils/pagination');

async function allBalances(req, res, next) {
  try { return success(res, await service.getAllBalances()); } catch (err) { next(err); }
}
async function getBalance(req, res, next) {
  try {
    const balance = await service.getBusinessBalance(req.params.businessId);
    if (!balance) return error(res, 'Business not found', 404, 'NOT_FOUND');
    return success(res, balance);
  } catch (err) { next(err); }
}
async function getLedger(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const { data, total } = await service.getLedger(req.params.businessId, pagination);
    return paginated(res, data, { ...pagination, total });
  } catch (err) { next(err); }
}
async function listInvoices(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const data = await service.listInvoices(req.query, pagination);
    return success(res, data);
  } catch (err) { next(err); }
}
async function generateInvoice(req, res, next) {
  try {
    const invoice = await service.generateInvoice(req.params.orderId, req.user.id);
    return success(res, invoice, 'Invoice generated', 201);
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}
async function listPayments(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    return success(res, await service.listPayments(req.query, pagination));
  } catch (err) { next(err); }
}
async function recordPayment(req, res, next) {
  try {
    const payment = await service.recordPayment(req.body, req.user.id);
    return success(res, payment, 'Payment recorded', 201);
  } catch (err) { next(err); }
}
async function updateCreditLimit(req, res, next) {
  try {
    const biz = await service.updateCreditLimit(req.params.businessId, req.body.creditLimit, req.user.id);
    return success(res, biz, 'Credit limit updated');
  } catch (err) { next(err); }
}

module.exports = { allBalances, getBalance, getLedger, listInvoices, generateInvoice, listPayments, recordPayment, updateCreditLimit };
