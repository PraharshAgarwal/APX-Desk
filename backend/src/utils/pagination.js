'use strict';

/**
 * Parse pagination params from query string.
 * @returns {{ page, limit, offset }}
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build ORDER BY clause from sort query params.
 * @param {string} sortParam - e.g. "created_at:desc,name:asc"
 * @param {string[]} allowedFields - whitelist of sortable columns
 * @param {string} defaultSort - default ORDER BY clause
 */
function buildOrderBy(sortParam, allowedFields, defaultSort = 'created_at DESC') {
  if (!sortParam) return defaultSort;

  const clauses = sortParam
    .split(',')
    .map((s) => {
      const [field, dir] = s.trim().split(':');
      if (!allowedFields.includes(field)) return null;
      const direction = dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      return `${field} ${direction}`;
    })
    .filter(Boolean);

  return clauses.length > 0 ? clauses.join(', ') : defaultSort;
}

module.exports = { parsePagination, buildOrderBy };
