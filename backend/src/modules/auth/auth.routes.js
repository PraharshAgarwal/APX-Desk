'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { emailLimiter } = require('../../middleware/loginRateLimiter');

const router = express.Router();

// POST /api/auth/login
// Guard: 10 attempts per 15 min per email address (per user)
router.post(
  '/login',
  emailLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    validate,
  ],
  controller.login
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('refreshToken is required').isString(),
    validate,
  ],
  controller.refresh
);

// POST /api/auth/logout
router.post('/logout', authenticate, controller.logout);

// GET /api/auth/me
router.get('/me', authenticate, controller.me);

module.exports = router;
