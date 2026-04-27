'use strict';

const logger = require('../utils/logger');

/**
 * Global error handler — must be registered last in Express.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Normalize error
  const statusCode = err.statusCode || err.status || 500;
  const code       = err.code       || 'INTERNAL_ERROR';
  const message    = err.message    || 'An unexpected error occurred';

  // Log appropriately
  if (statusCode >= 500) {
    logger.error('Server error', {
      code, message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });
  } else {
    logger.warn('Client error', { code, message, method: req.method, path: req.path });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Resource already exists', detail: err.detail },
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REFERENCE', message: 'Referenced resource does not exist' },
    });
  }

  // PostgreSQL check constraint
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: { code: 'CONSTRAINT_VIOLATION', message: err.message },
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}

module.exports = errorHandler;
