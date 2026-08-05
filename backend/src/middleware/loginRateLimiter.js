'use strict';

/**
 * loginRateLimiter
 *
 * Tracks only FAILED login attempts per user (email address).
 * Counter is reset on a successful login.
 *
 * Exposes two helpers to be called from the auth controller:
 *   - checkLimit(email)   → call BEFORE the password check (guard)
 *   - recordFailure(email) → call AFTER a failed attempt
 *   - resetLimit(email)   → call AFTER a successful login
 *
 * Redis-backed so counts survive restarts and scale across instances.
 * Fails open when Redis is unavailable (never blocks a legitimate login
 * due to infra issues).
 */

const { getRedisClient } = require('../config/redis');
const logger             = require('../utils/logger');

const WINDOW_SECONDS = 15 * 60;   // 15-minute sliding window
const MAX_ATTEMPTS   = 10;

function emailKey(email) {
  // Normalise so Case/whitespace variations all share one counter
  return `ratelimit:login:email:${email.toLowerCase().trim()}`;
}

async function getCount(key) {
  try {
    const val = await getRedisClient().get(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0; // fail-open
  }
}

async function getTTL(key) {
  try {
    return Math.max(await getRedisClient().ttl(key), 0);
  } catch {
    return WINDOW_SECONDS;
  }
}

/**
 * Record one failed attempt.
 * Sets a 15-minute TTL on the first failure so the window resets automatically.
 */
async function recordFailure(email) {
  const key = emailKey(email);
  try {
    const redis = getRedisClient();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    logger.debug('loginRateLimiter: failed attempt recorded', { email, count });
  } catch (err) {
    logger.warn('loginRateLimiter: could not record failure in Redis', { err: err.message });
  }
}

/**
 * Reset the counter after a successful login.
 */
async function resetLimit(email) {
  try {
    await getRedisClient().del(emailKey(email));
  } catch {
    // Non-critical — if this fails the counter just expires naturally
  }
}

/**
 * Express middleware — blocks the request when the failure counter
 * for this email has already reached MAX_ATTEMPTS.
 * Must run BEFORE the password check.
 */
async function emailLimiter(req, res, next) {
  const email = (req.body?.email || '').toString().toLowerCase().trim();
  if (!email) return next(); // let the validator reject it

  const key   = emailKey(email);
  const count = await getCount(key);

  if (count >= MAX_ATTEMPTS) {
    const retryAfter = await getTTL(key);
    logger.warn('loginRateLimiter: account locked', { email, count, retryAfter });

    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many failed login attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
      },
    });
  }

  next();
}

module.exports = { emailLimiter, recordFailure, resetLimit };
