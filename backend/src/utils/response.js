'use strict';

/**
 * Send a standardized success response.
 */
function success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Send a standardized error response.
 */
function error(res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

/**
 * Send paginated response.
 */
function paginated(res, data, { page, limit, total }) {
  return res.json({
    success: true,
    data,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

module.exports = { success, error, paginated };
