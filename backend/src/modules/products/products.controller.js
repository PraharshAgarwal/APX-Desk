'use strict';

const { success, error, paginated } = require('../../utils/response');
const service = require('./products.service');
const { parsePagination } = require('../../utils/pagination');

async function list(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const { data, total } = await service.listProducts(req.query, pagination);
    return paginated(res, data, { ...pagination, total });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const product = await service.getProductById(req.params.id);
    if (!product) return error(res, 'Product not found', 404, 'NOT_FOUND');
    return success(res, product);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const product = await service.createProduct(req.body, req.user.id);
    return success(res, product, 'Product created', 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const product = await service.updateProduct(req.params.id, req.body);
    if (!product) return error(res, 'Product not found', 404, 'NOT_FOUND');
    return success(res, product, 'Product updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.deleteProduct(req.params.id);
    return success(res, null, 'Product deactivated');
  } catch (err) { next(err); }
}

async function getPricing(req, res, next) {
  try {
    const pricing = await service.getProductPricing(req.params.id);
    return success(res, pricing);
  } catch (err) { next(err); }
}

async function upsertPricing(req, res, next) {
  try {
    const pricing = await service.upsertPricing(req.params.id, req.body, req.user.id);
    return success(res, pricing, 'Pricing saved', 201);
  } catch (err) { next(err); }
}

async function getManufacturers(req, res, next) {
  try {
    const manufacturers = await service.getManufacturers();
    return success(res, manufacturers);
  } catch (err) { next(err); }
}

async function listAllPricing(req, res, next) {
  try {
    const rows = await service.listAllPricing({ pricingType: req.query.type });
    return success(res, rows);
  } catch (err) { next(err); }
}

async function deactivatePricing(req, res, next) {
  try {
    const row = await service.deactivatePricing(req.params.pricingId);
    if (!row) return error(res, 'Pricing record not found', 404, 'NOT_FOUND');
    return success(res, row, 'Pricing removed');
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, getPricing, upsertPricing, getManufacturers, listAllPricing, deactivatePricing };
