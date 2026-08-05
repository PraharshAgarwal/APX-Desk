'use strict';

const { success, error } = require('../../utils/response');
const authService = require('./auth.service');
const { recordFailure, resetLimit } = require('../../middleware/loginRateLimiter');
const logger = require('../../utils/logger');

async function login(req, res, next) {
  const email = (req.body?.email || '').toString().toLowerCase().trim();
  try {
    const { password } = req.body;
    const result = await authService.login(email, password, req.ip);

    // ✅ Successful login — clear the failure counter
    resetLimit(email).catch(() => {});

    return success(res, result, 'Login successful');
  } catch (err) {
    // ❌ Failed login (wrong password or suspended) — record the attempt
    if (err.statusCode === 401 || err.statusCode === 403) {
      recordFailure(email).catch(() => {});
    }
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required', 400, 'MISSING_TOKEN');
    const result = await authService.refreshTokens(refreshToken);
    return success(res, result, 'Tokens refreshed');
  } catch (err) {
    if (err.statusCode) return error(res, err.message, err.statusCode, err.code);
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.user.id, refreshToken);
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  return success(res, req.user, 'Current user');
}

module.exports = { login, refresh, logout, me };
