'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./warehouse.controller');
const { requireRoles } = require('../../middleware/rbac');
const { auditLogger } = require('../../middleware/auditLogger');

const router = express.Router();
const WH_ADMIN = requireRoles('admin', 'warehouse_manager');

// GET /api/warehouse/grn
router.get('/grn', WH_ADMIN, controller.listGRN);

// POST /api/warehouse/grn
router.post(
  '/grn',
  WH_ADMIN,
  auditLogger('grn'),
  [
    body('warehouseId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('warehouseId must be a valid UUID'),
    body('items').isArray({ min: 1 }),
    body('items.*.productId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('productId must be a valid UUID'),
    body('items.*.batchNumber').notEmpty(),
    body('items.*.receivedQty').isFloat({ min: 0.001 }),
    validate,
  ],
  controller.createGRN
);

// GET /api/warehouse/grn/:id
router.get('/grn/:id', WH_ADMIN, controller.getGRN);

// POST /api/warehouse/pick/:orderId
router.post('/pick/:orderId', WH_ADMIN, auditLogger('pick'), controller.pickOrder);

// POST /api/warehouse/dispatch/:orderId
router.post(
  '/dispatch/:orderId',
  WH_ADMIN,
  auditLogger('dispatch'),
  [
    body('vehicleNumber').optional().trim(),
    body('driverName').optional().trim(),
    body('driverPhone').optional().trim(),
    validate,
  ],
  controller.dispatchOrder
);

// GET /api/warehouse/dispatches
router.get('/dispatches', WH_ADMIN, controller.listDispatches);

// GET /api/warehouse/dispatches/:id
router.get('/dispatches/:id', WH_ADMIN, controller.getDispatch);

// PATCH /api/warehouse/dispatches/:id/deliver
router.patch('/dispatches/:id/deliver', WH_ADMIN, auditLogger('dispatch'), controller.markDelivered);

// GET /api/warehouse
router.get('/', WH_ADMIN, controller.listWarehouses);

module.exports = router;
