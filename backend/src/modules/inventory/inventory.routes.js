'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./inventory.controller');
const { requireRoles } = require('../../middleware/rbac');
const { auditLogger } = require('../../middleware/auditLogger');

const router = express.Router();
const WH_ADMIN = requireRoles('admin', 'warehouse_manager');

// GET /api/inventory/batches
router.get('/batches', WH_ADMIN, controller.listBatches);

// GET /api/inventory/batches/:id
router.get('/batches/:id', WH_ADMIN, controller.getBatch);

// GET /api/inventory/stock — available stock summary per product
router.get('/stock', controller.stockSummary);

// POST /api/inventory/batches — create batch (via GRN)
router.post(
  '/batches',
  WH_ADMIN,
  auditLogger('inventory_batch'),
  [
    body('productId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('productId must be a valid UUID'),
    body('warehouseId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('warehouseId must be a valid UUID'),
    body('batchNumber').notEmpty(),
    body('receivedQty').isFloat({ min: 0.001 }),
    validate,
  ],
  controller.createBatch
);

// PATCH /api/inventory/batches/:id — update bin location
router.patch('/batches/:id', WH_ADMIN, auditLogger('inventory_batch'), controller.updateBatch);

// POST /api/inventory/adjust — stock adjustment
router.post(
  '/adjust',
  WH_ADMIN,
  auditLogger('inventory_adjustment'),
  [
    body('batchId')
      .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      .withMessage('batchId must be a valid UUID'),
    body('reason')
      .isIn(['damage', 'expiry', 'return', 'transfer', 'correction', 'theft'])
      .withMessage('Invalid reason'),
    body('quantityDelta')
      .notEmpty().withMessage('quantityDelta is required')
      .isNumeric().withMessage('quantityDelta must be a number')
      .not().equals('0').withMessage('quantityDelta cannot be zero'),
    validate,
  ],
  controller.adjust
);

// GET /api/inventory/reservations
router.get('/reservations', WH_ADMIN, controller.listReservations);

// GET /api/inventory/near-expiry
router.get('/near-expiry', WH_ADMIN, controller.nearExpiry);

// GET /api/inventory/adjustments
router.get('/adjustments', WH_ADMIN, controller.listAdjustments);

module.exports = router;
