'use strict';

const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');
const { query } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const USER_CACHE_TTL = 300; // 5 minutes

/**
 * Verify JWT and attach user + roles to req.user.
 * User profile is cached in Redis to avoid a DB hit on every request.
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

    const cacheKey = `user:${decoded.sub}`;
    const redis = getRedisClient();

    // 1. Try the cache first
    let user;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        user = JSON.parse(cached);
      }
    } catch (cacheErr) {
      // Redis unavailable — fall through to DB
      logger.warn('Auth cache read failed, falling back to DB', { err: cacheErr.message });
    }

    // 2. Cache miss — load from DB and populate cache
    if (!user) {
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

      const row = result.rows[0];
      user = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        businessId: row.business_id,
        status: row.status,
        roles: row.roles.filter(Boolean),
      };

      // Store in Redis — fire-and-forget, don't block the request on cache errors
      redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(user)).catch((err) => {
        logger.warn('Auth cache write failed', { err: err.message });
      });
    }

    if (user.status !== 'active') {
      return error(res, 'Account is suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessId: user.businessId,
      roles: user.roles,
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error', { err });
    return error(res, 'Authentication failed', 500, 'AUTH_ERROR');
  }
}

/**
 * Invalidate a user's auth cache entry.
 * Call this on logout, role change, or account suspension.
 */
async function invalidateUserCache(userId) {
  try {
    await getRedisClient().del(`user:${userId}`);
  } catch (err) {
    logger.warn('Failed to invalidate user cache', { userId, err: err.message });
  }
}

module.exports = { authenticate, invalidateUserCache };
