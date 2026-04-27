'use strict';

const { error } = require('../utils/response');

/**
 * Role-based access control guard factory.
 * Usage: router.get('/admin', requireRoles('admin'), handler)
 *        router.get('/ops', requireRoles('admin', 'warehouse_manager'), handler)
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return error(
        res,
        `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

/**
 * Ensure the user can only access their own business data,
 * unless they are an admin or sales executive.
 */
function requireOwnBusiness(req, res, next) {
  const { businessId } = req.params;
  const user = req.user;

  if (user.roles.includes('admin') || user.roles.includes('sales_executive')) {
    return next(); // admins and sales can access any business
  }

  if (user.businessId !== businessId) {
    return error(res, 'Access denied to this business', 403, 'FORBIDDEN');
  }

  next();
}

module.exports = { requireRoles, requireOwnBusiness };
