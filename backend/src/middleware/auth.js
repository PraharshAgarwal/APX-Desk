'use strict';

const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Verify JWT and attach user + roles to req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(res, 'Token expired', 401, 'TOKEN_EXPIRED');
      }
      return error(res, 'Invalid token', 401, 'INVALID_TOKEN');
    }

    // Load user with roles from DB (could be cached with Redis for perf)
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.business_id, u.status,
              array_agg(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [decoded.sub]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found', 401, 'UNAUTHORIZED');
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return error(res, 'Account is suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      businessId: user.business_id,
      roles: user.roles.filter(Boolean),
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error', { err });
    return error(res, 'Authentication failed', 500, 'AUTH_ERROR');
  }
}

module.exports = { authenticate };
