'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    validate,
  ],
  controller.login
);

// POST /api/auth/refresh
router.post('/refresh', controller.refresh);

// POST /api/auth/logout
router.post('/logout', authenticate, controller.logout);

// GET /api/auth/me
router.get('/me', authenticate, controller.me);

module.exports = router;
