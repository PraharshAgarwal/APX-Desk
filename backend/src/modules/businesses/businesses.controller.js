'use strict';

const { success, error } = require('../../utils/response');
const service = require('./businesses.service');

async function list(req, res, next) {
  try {
    const retailers = await service.listRetailers(req.query.search);
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

async function updateProfile(req, res, next) {
  try {
    const updated = await service.updateProfile(req.params.id, req.body);
    if (!updated) return error(res, 'Business not found', 404, 'NOT_FOUND');
    return success(res, updated, 'Profile updated');
  } catch (err) { next(err); }
}

async function listSalesExecs(req, res, next) {
  try {
    const execs = await service.listSalesExecutives();
    return success(res, execs);
  } catch (err) { next(err); }
}

module.exports = { list, getDetail, updateProfile, listSalesExecs };
