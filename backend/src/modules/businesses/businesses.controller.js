'use strict';

const { success, error } = require('../../utils/response');
const service = require('./businesses.service');

async function list(req, res, next) {
  try {
    const retailers = await service.listRetailers();
    return success(res, retailers);
  } catch (err) { next(err); }
}

async function getDetail(req, res, next) {
  try {
    const detail = await service.getRetailerDetail(req.params.id);
    if (!detail.profile) return error(res, 'Business not found', 404, 'NOT_FOUND');
    return success(res, detail);
  } catch (err) { next(err); }
}

module.exports = { list, getDetail };
