'use strict';

const express = require('express');
const controller = require('./businesses.controller');
const { requireRoles } = require('../../middleware/rbac');

const router = express.Router();
const ADMIN_SALES = requireRoles('admin', 'sales_executive');
const ADMIN_ONLY  = requireRoles('admin');

// GET  /api/businesses          — list all retailers/distributors
router.get('/',                 ADMIN_SALES, controller.list);

// GET  /api/businesses/sales-executives — list active sales execs for dropdown
router.get('/sales-executives', ADMIN_ONLY,  controller.listSalesExecs);

// GET  /api/businesses/:id      — full retailer detail
router.get('/:id',              ADMIN_SALES, controller.getDetail);

// PATCH /api/businesses/:id     — update extended profile (admin only)
router.patch('/:id',            ADMIN_ONLY,  controller.updateProfile);

module.exports = router;
