'use strict';

const { validationResult } = require('express-validator');
const { error } = require('./response');

/**
 * Middleware to run after express-validator checks.
 * Returns 422 with validation details if there are errors.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 422, 'VALIDATION_ERROR', errors.array());
  }
  next();
}

/**
 * Validate UUID format.
 */
function isUUID(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

module.exports = { validate, isUUID };

/**
 * express-validator chain that accepts any UUID format string (v1-v5 and non-versioned).
 * Use instead of body('field').isUUID() to support seed data UUIDs.
 * @param {string} field - request body field name
 */
function uuidBody(field) {
  const { body } = require('express-validator');
  return body(field)
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage(`${field} must be a valid UUID`);
}

module.exports = { validate, isUUID, uuidBody };

