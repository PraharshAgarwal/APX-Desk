'use strict';

/**
 * auth.service.test.js
 *
 * Unit tests for the authentication service.
 * All external dependencies (DB, JWT, bcrypt) are mocked.
 *
 * File lives at: src/modules/auth/__tests__/auth.service.test.js
 * Service lives at: src/modules/auth/auth.service.js
 * Mock paths are relative from the TEST file's directory.
 */

// ── Mocks (must be declared before require) ───────────────────────────────────

// Paths are from: src/modules/auth/__tests__/ → service accesses these modules
jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../config/env', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      refreshSecret: 'test-refresh-secret',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));
jest.mock('../../../middleware/auth', () => ({
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const { query }      = require('../../../config/database');
const { login, refreshTokens, logout } = require('../auth.service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ACTIVE_USER = {
  id: 'user-uuid-1',
  email: 'admin@fdms.test',
  password_hash: '$2a$12$hashed',
  first_name: 'Test',
  last_name: 'Admin',
  business_id: null,
  status: 'active',
  roles: ['admin'],
};

// ── login() ───────────────────────────────────────────────────────────────────

describe('auth.service → login()', () => {
  beforeEach(() => {
    // SELECT user+roles → UPDATE last_login → INSERT refresh_token (via issueTokens)
    query
      .mockResolvedValueOnce({ rows: [ACTIVE_USER] })   // SELECT user + roles
      .mockResolvedValueOnce({ rows: [] })               // UPDATE last_login_at
      .mockResolvedValueOnce({ rows: [] });              // INSERT refresh_token in issueTokens
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock-token');
  });

  test('returns accessToken + refreshToken + user on valid credentials', async () => {
    const result = await login('admin@fdms.test', 'validpass', '127.0.0.1');
    expect(result).toHaveProperty('accessToken', 'mock-token');
    expect(result).toHaveProperty('refreshToken', 'mock-token');
    expect(result.user.email).toBe('admin@fdms.test');
    expect(result.user.roles).toEqual(['admin']);
  });

  test('throws INVALID_CREDENTIALS when user is not found', async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [] }); // no matching user
    await expect(login('nobody@fdms.test', 'pass', '127.0.0.1'))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
  });

  test('throws ACCOUNT_SUSPENDED when user status is not active', async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_USER, status: 'suspended' }] });
    await expect(login('admin@fdms.test', 'pass', '127.0.0.1'))
      .rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED', statusCode: 403 });
  });

  test('throws INVALID_CREDENTIALS when password does not match', async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [ACTIVE_USER] });
    bcrypt.compare.mockResolvedValueOnce(false);
    await expect(login('admin@fdms.test', 'wrongpass', '127.0.0.1'))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
  });
});

// ── refreshTokens() ───────────────────────────────────────────────────────────

describe('auth.service → refreshTokens()', () => {
  const DECODED = { sub: ACTIVE_USER.id };

  test('issues new token pair when refresh token is valid', async () => {
    jwt.verify.mockReturnValue(DECODED);
    query
      .mockResolvedValueOnce({ rows: [{ id: 'token-row-1' }] })     // SELECT refresh_token (not revoked)
      .mockResolvedValueOnce({ rows: [] })                            // DELETE / revoke old token
      .mockResolvedValueOnce({ rows: [{ roles: ['admin'] }] })       // SELECT roles
      .mockResolvedValueOnce({ rows: [] });                           // INSERT new refresh_token
    jwt.sign.mockReturnValue('new-token');

    const result = await refreshTokens('old-refresh-token');
    expect(result).toHaveProperty('accessToken', 'new-token');
    expect(result).toHaveProperty('refreshToken', 'new-token');
  });

  test('throws INVALID_TOKEN when JWT signature is bad', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });
    await expect(refreshTokens('bad-token'))
      .rejects.toMatchObject({ code: 'INVALID_TOKEN', statusCode: 401 });
  });

  test('throws TOKEN_REVOKED when token is not found in DB', async () => {
    jwt.verify.mockReturnValue(DECODED);
    query.mockResolvedValueOnce({ rows: [] }); // token not in DB → revoked/expired
    await expect(refreshTokens('revoked-token'))
      .rejects.toMatchObject({ code: 'TOKEN_REVOKED', statusCode: 401 });
  });
});

// ── logout() ──────────────────────────────────────────────────────────────────

describe('auth.service → logout()', () => {
  test('revokes the refresh token in DB', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await logout(ACTIVE_USER.id, 'some-refresh-token');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE refresh_tokens SET revoked_at'),
      expect.any(Array)
    );
  });

  test('does not run any query when no refresh token is provided', async () => {
    await logout(ACTIVE_USER.id, null);
    expect(query).not.toHaveBeenCalled();
  });
});
