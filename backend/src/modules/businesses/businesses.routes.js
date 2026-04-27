'use strict';

const express = require('express');
const controller = require('./businesses.controller');
const { requireRoles } = require('../../middleware/rbac');

const router = express.Router();
const ADMIN_SALES = requireRoles('admin', 'sales_executive');

// GET /api/businesses — list all retailers/distributors
router.get('/', ADMIN_SALES, controller.list);

// GET /api/businesses/:id — full retailer detail
router.get('/:id', ADMIN_SALES, controller.getDetail);

module.exports = router;
