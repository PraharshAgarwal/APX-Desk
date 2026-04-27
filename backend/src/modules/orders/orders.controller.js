'use strict';

const { success, error, paginated } = require('../../utils/response');
const service = require('./orders.service');
const { parsePagination } = require('../../utils/pagination');

async function list(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const { data, total } = await service.listOrders(req.query, req.user.roles, req.user.businessId, pagination);
    return paginated(res, data, { ...pagination, total });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const order = await service.getOrderById(req.params.id);
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');
    // Scope check: non-staff can only view orders belonging to their business
    const isStaff = ['admin', 'sales_executive', 'warehouse_manager'].some(r => req.user.roles.includes(r));
    if (!isStaff && order.business_id !== req.user.businessId) {
      return error(res, 'Access denied', 403, 'FORBIDDEN');
    }
    return success(res, order);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const order = await service.createOrder(req.body, req.user);
    return success(res, order, 'Order placed', 201);
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function changeStatus(req, res, next) {
  try {
    const order = await service.changeOrderStatus(req.params.id, req.body.status, req.user.id, req.body.notes);
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${order.placed_by}`).emit('order:status_changed', {
        orderId: order.id, orderNumber: order.order_number, status: order.status,
      });
    }
    return success(res, order, 'Order status updated');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const data = await service.getStatusHistory(req.params.id);
    return success(res, data, 'Order status history');
  } catch (err) { next(err); }
}

async function assignWarehouse(req, res, next) {
  try {
    const order = await service.assignWarehouse(req.params.id, req.body.warehouseId);
    return success(res, order, 'Warehouse assigned');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

module.exports = { list, getById, create, changeStatus, assignWarehouse, history };
