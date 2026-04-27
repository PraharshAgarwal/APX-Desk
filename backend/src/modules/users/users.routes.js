'use strict';

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../utils/validators');
const { success, paginated } = require('../../utils/response');
const { requireRoles } = require('../../middleware/rbac');
const { query } = require('../../config/database');
const bcrypt = require('bcryptjs');
const { parsePagination } = require('../../utils/pagination');

const router = express.Router();

// GET /api/users
router.get('/', requireRoles('admin', 'sales_executive'), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const countResult = await query('SELECT COUNT(*) FROM users');
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.status, u.last_login_at, u.created_at,
              b.name AS business_name,
              array_agg(r.name) AS roles
       FROM users u
       LEFT JOIN businesses b ON b.id = u.business_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY u.id, b.name
       ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return paginated(res, result.rows, { limit, offset, total: parseInt(countResult.rows[0].count) });
  } catch (err) { next(err); }
});

// POST /api/users
router.post(
  '/',
  requireRoles('admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('roles').isArray({ min: 1 }),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, phone, businessId, roles } = req.body;
      const passwordHash = await bcrypt.hash(password, 12);

      const userResult = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, business_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, first_name, last_name, phone, status`,
        [email, passwordHash, firstName, lastName, phone || null, businessId || null]
      );
      const user = userResult.rows[0];

      // Assign roles
      for (const roleName of roles) {
        const roleResult = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length > 0) {
          await query(
            'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [user.id, roleResult.rows[0].id, req.user.id]
          );
        }
      }

      return success(res, user, 'User created', 201);
    } catch (err) { next(err); }
  }
);

// PATCH /api/users/:id
router.patch('/:id', requireRoles('admin'), async (req, res, next) => {
  try {
    const { status, phone, businessId } = req.body;
    const result = await query(
      'UPDATE users SET status = COALESCE($1, status), phone = COALESCE($2, phone), business_id = COALESCE($3, business_id), updated_at = NOW() WHERE id = $4 RETURNING id, email, first_name, last_name, status',
      [status, phone, businessId, req.params.id]
    );
    return success(res, result.rows[0], 'User updated');
  } catch (err) { next(err); }
});

// GET /api/users/audit-logs
router.get('/audit-logs', requireRoles('admin'), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { entityType, year, month } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;
    if (entityType) { conditions.push(`al.entity_type = $${idx++}`); params.push(entityType); }
    if (year)       { conditions.push(`EXTRACT(YEAR  FROM al.created_at) = $${idx++}`); params.push(Number(year)); }
    if (month)      { conditions.push(`EXTRACT(MONTH FROM al.created_at) = $${idx++}`); params.push(Number(month)); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const countRes = await query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params.slice(0, idx - 1));
    const total = parseInt(countRes.rows[0].count);
    const result = await query(
      `SELECT al.*, u.first_name || ' ' || u.last_name AS user_name
       FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    return success(res, result.rows, 'ok', 200, { total });
  } catch (err) { next(err); }
});

module.exports = router;
