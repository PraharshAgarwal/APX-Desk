'use strict';

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware factory — logs mutations (non-GET requests) to audit_logs.
 * Wraps res.json to capture response before logging.
 */
function auditLogger(entityType) {
  return async (req, res, next) => {
    if (req.method === 'GET') return next(); // skip reads

    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Fire-and-forget audit log write
      if (req.user && body?.success !== false) {
        const action = buildAction(req.method, req.path, entityType);
        writeAuditLog({
          userId: req.user.id,
          action,
          entityType,
          entityId: req.params?.id || body?.data?.id || null,
          beforeState: req._auditBefore || null,
          afterState: body?.data || null,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch((err) => logger.error('Audit log write failed', { err }));
      }
      return originalJson(body);
    };

    next();
  };
}

function buildAction(method, path, entityType) {
  const methodMap = {
    POST: `${entityType}.created`,
    PUT: `${entityType}.updated`,
    PATCH: `${entityType}.updated`,
    DELETE: `${entityType}.deleted`,
  };
  return methodMap[method] || `${entityType}.${method.toLowerCase()}`;
}

async function writeAuditLog({ userId, action, entityType, entityId, beforeState, afterState, ipAddress, userAgent }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before_state, after_state, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        action,
        entityType,
        entityId,
        beforeState ? JSON.stringify(beforeState) : null,
        afterState  ? JSON.stringify(afterState)  : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    logger.error('Failed to write audit log', { err });
  }
}

module.exports = { auditLogger, writeAuditLog };
