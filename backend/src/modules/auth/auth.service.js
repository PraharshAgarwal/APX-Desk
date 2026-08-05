'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../../config/database');
const { config } = require('../../config/env');
const { invalidateUserCache } = require('../../middleware/auth');
const logger = require('../../utils/logger');

/**
 * Authenticate user and issue JWT pair.
 */
async function login(email, password, ipAddress) {
  // Fetch user with roles
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
            u.business_id, u.status,
            array_agg(r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401; err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const user = result.rows[0];

  if (user.status !== 'active') {
    const err = new Error('Account is suspended or inactive');
    err.statusCode = 403; err.code = 'ACCOUNT_SUSPENDED';
    throw err;
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401; err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Update last login
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const roles = user.roles.filter(Boolean);
  const tokens = await issueTokens(user.id, roles);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      businessId: user.business_id,
      roles,
    },
  };
}

/**
 * Refresh access + refresh token pair.
 */
async function refreshTokens(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401; err.code = 'INVALID_TOKEN';
    throw err;
  }

  // Check token in DB (not revoked)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const result = await query(
    `SELECT * FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
    [decoded.sub, tokenHash]
  );

  if (result.rows.length === 0) {
    const err = new Error('Refresh token revoked or expired');
    err.statusCode = 401; err.code = 'TOKEN_REVOKED';
    throw err;
  }

  // Revoke old refresh token
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
    [tokenHash]
  );

  // Issue new pair
  const rolesResult = await query(
    `SELECT array_agg(r.name) AS roles FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [decoded.sub]
  );
  const roles = rolesResult.rows[0]?.roles?.filter(Boolean) || [];

  return issueTokens(decoded.sub, roles);
}

async function logout(userId, refreshToken) {
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND token_hash = $2',
      [userId, tokenHash]
    );
  }
  // Invalidate Redis cache so the session is immediately unusable
  await invalidateUserCache(userId);
}

// ── Internal helpers ──────────────────────────────────────────

async function issueTokens(userId, roles) {
  const accessToken = jwt.sign(
    { sub: userId, roles },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { sub: userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  // Store hashed refresh token
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  return { accessToken, refreshToken };
}

module.exports = { login, refreshTokens, logout };
