'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./warehouse.controller');
const { requireRoles } = require('../../middleware/rbac');
const { auditLogger } = require('../../middleware/auditLogger');

const router = express.Router();
const WH_ADMIN  = requireRoles('admin', 'warehouse_manager');
const ADMIN_ONLY = requireRoles('admin');
const APPROVER  = requireRoles('admin', 'sales_executive');
const WH_ONLY   = requireRoles('warehouse_manager');

// GET /api/warehouse/grn/pending   — approval queue (admin & sales_executive only)
// NOTE: must be registered BEFORE /grn/:id to avoid "pending" being matched as an id
router.get('/grn/pending', APPROVER, controller.listPendingGRNs);

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

// PATCH /api/warehouse/grn/:id/approve   — admin or sales_executive only
router.patch(
  '/grn/:id/approve',
  APPROVER,
  auditLogger('grn'),
  [
    body('approved').isBoolean().withMessage('approved must be true or false'),
    body('notes').optional().trim().isLength({ max: 500 }),
    validate,
  ],
  controller.approveGRN
);

// POST /api/warehouse/dispatch/:orderId  — Admin creates dispatch (pending_dispatch)
router.post(
  '/dispatch/:orderId',
  ADMIN_ONLY,
  auditLogger('dispatch'),
  [
    body('vehicleNumber').notEmpty().withMessage('vehicleNumber is required').trim().isLength({ max: 20 }),
    body('driverName').notEmpty().withMessage('driverName is required').trim().isLength({ max: 100 }),
    body('driverPhone').notEmpty().withMessage('driverPhone is required').trim().isLength({ max: 20 }),
    body('lrNumber').optional().trim().isLength({ max: 50 }),
    body('notes').optional().trim().isLength({ max: 500 }),
    validate,
  ],
  controller.createDispatch
);

// PATCH /api/warehouse/dispatches/:id/execute  — Warehouse manager executes pending dispatch
router.patch(
  '/dispatches/:id/execute',
  WH_ONLY,
  auditLogger('dispatch'),
  controller.executeDispatch
);

// GET /api/warehouse/dispatches
router.get('/dispatches', WH_ADMIN, controller.listDispatches);

// GET /api/warehouse/dispatches/:id
router.get('/dispatches/:id', WH_ADMIN, controller.getDispatch);

// PATCH /api/warehouse/dispatches/:id/deliver
router.patch('/dispatches/:id/deliver', WH_ADMIN, auditLogger('dispatch'), controller.markDelivered);

// GET /api/warehouse
router.get('/', WH_ADMIN, controller.listWarehouses);

// ── Transfer routes ────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const { param } = require('express-validator');

// GET /api/warehouse/transfer
router.get('/transfer', WH_ADMIN, controller.listTransfers);

// POST /api/warehouse/transfer
router.post(
  '/transfer',
  WH_ADMIN,
  auditLogger('transfer'),
  [
    body('fromWarehouseId').matches(UUID_RE).withMessage('fromWarehouseId must be a valid UUID'),
    body('toWarehouseId').matches(UUID_RE).withMessage('toWarehouseId must be a valid UUID'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
    body('items.*.batchId').matches(UUID_RE).withMessage('each batchId must be a valid UUID'),
    body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('each quantity must be > 0'),
    body('notes').optional().trim().isLength({ max: 500 }),
    validate,
  ],
  controller.createTransfer
);

// GET /api/warehouse/transfer/:id
router.get(
  '/transfer/:id',
  WH_ADMIN,
  [param('id').matches(UUID_RE).withMessage('id must be a valid UUID'), validate],
  controller.getTransfer
);

// PATCH /api/warehouse/transfer/:id/complete
router.patch(
  '/transfer/:id/complete',
  WH_ADMIN,
  auditLogger('transfer'),
  [param('id').matches(UUID_RE).withMessage('id must be a valid UUID'), validate],
  controller.completeTransfer
);

// PATCH /api/warehouse/transfer/:id/cancel
router.patch(
  '/transfer/:id/cancel',
  WH_ADMIN,
  auditLogger('transfer'),
  [param('id').matches(UUID_RE).withMessage('id must be a valid UUID'), validate],
  controller.cancelTransfer
);

module.exports = router;
