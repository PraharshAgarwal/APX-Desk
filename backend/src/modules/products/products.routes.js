'use strict';

const express = require('express');
const { body, query: qv, param } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./products.controller');
const { requireRoles } = require('../../middleware/rbac');
const { auditLogger } = require('../../middleware/auditLogger');

const router = express.Router();
const ADMIN_SALES = requireRoles('admin', 'sales_executive');

// GET /api/products
router.get('/', controller.list);

// GET /api/products/manufacturers — list of distinct manufacturer brands
router.get('/manufacturers', controller.getManufacturers);

// GET /api/products/:id
router.get('/:id', controller.getById);

// POST /api/products
router.post(
  '/',
  ADMIN_SALES,
  auditLogger('product'),
  [
    body('sku').notEmpty().trim(),
    body('name').notEmpty().trim(),
    body('unit').notEmpty(),
    body('gstRate').isNumeric(),
    validate,
  ],
  controller.create
);

// PATCH /api/products/:id
router.patch(
  '/:id',
  ADMIN_SALES,
  auditLogger('product'),
  controller.update
);

// DELETE /api/products/:id
router.delete('/:id', requireRoles('admin'), auditLogger('product'), controller.remove);

// GET /api/products/:id/pricing
router.get('/:id/pricing', controller.getPricing);

// POST /api/products/:id/pricing
router.post(
  '/:id/pricing',
  ADMIN_SALES,
  [
    body('pricingType').isIn(['standard', 'tiered', 'customer_specific', 'promotional']),
    body('pricePerUnit').isFloat({ min: 0 }),
    validate,
  ],
  controller.upsertPricing
);

module.exports = router;
