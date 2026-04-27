'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./orders.controller');
const { requireRoles } = require('../../middleware/rbac');
const { auditLogger } = require('../../middleware/auditLogger');

const router = express.Router();

// GET /api/orders
router.get('/', controller.list);

// GET /api/orders/:id
router.get('/:id', controller.getById);

// POST /api/orders
router.post(
  '/',
  auditLogger('order'),
  [
    body('businessId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('businessId must be a valid UUID'),
    body('items').isArray({ min: 1 }),
    body('items.*.productId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('productId must be a valid UUID'),
    body('items.*.quantity').isFloat({ min: 0.001 }),
    validate,
  ],
  controller.create
);

// PATCH /api/orders/:id/status
router.patch(
  '/:id/status',
  requireRoles('admin', 'sales_executive', 'warehouse_manager'),
  auditLogger('order'),
  [
    body('status').isIn(['confirmed', 'processing', 'dispatched', 'delivered', 'cancelled']),
    validate,
  ],
  controller.changeStatus
);

// PATCH /api/orders/:id/warehouse
router.patch(
  '/:id/warehouse',
  requireRoles('admin', 'sales_executive'),
  [
    body('warehouseId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('warehouseId must be a valid UUID'),
    validate,
  ],
  controller.assignWarehouse
);

// GET /api/orders/:id/history
router.get('/:id/history', controller.history);

module.exports = router;
