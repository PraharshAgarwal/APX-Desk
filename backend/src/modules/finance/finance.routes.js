'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./finance.controller');
const { requireRoles } = require('../../middleware/rbac');
const { requireOwnBusiness } = require('../../middleware/rbac');

const router = express.Router();
const ADMIN = requireRoles('admin');
const ADMIN_SALES = requireRoles('admin', 'sales_executive');

// GET /api/finance/balances
router.get('/balances', ADMIN_SALES, controller.allBalances);

// GET /api/finance/balance/:businessId
router.get('/balance/:businessId', requireOwnBusiness, controller.getBalance);

// GET /api/finance/ledger/:businessId
router.get('/ledger/:businessId', requireOwnBusiness, controller.getLedger);

// GET /api/finance/invoices
router.get('/invoices', controller.listInvoices);

// POST /api/finance/invoices/:orderId/generate
router.post('/invoices/:orderId/generate', ADMIN_SALES, controller.generateInvoice);

// GET /api/finance/payments
router.get('/payments', ADMIN_SALES, controller.listPayments);

// POST /api/finance/payments
router.post(
  '/payments',
  ADMIN_SALES,
  [
    body('businessId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('businessId must be a valid UUID'),
    body('amount').isFloat({ min: 0.01 }),
    body('method').isIn(['cash', 'bank_transfer', 'upi', 'cheque', 'credit']),
    validate,
  ],
  controller.recordPayment
);

// PATCH /api/finance/credit-limits/:businessId
router.patch(
  '/credit-limits/:businessId',
  ADMIN,
  [body('creditLimit').isFloat({ min: 0 }), validate],
  controller.updateCreditLimit
);

module.exports = router;
