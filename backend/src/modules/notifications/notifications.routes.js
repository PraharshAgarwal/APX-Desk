'use strict';

const express = require('express');
const router = express.Router();
const { success, paginated } = require('../../utils/response');
const { query } = require('../../config/database');
const { parsePagination } = require('../../utils/pagination');

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const countResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1', [req.user.id]
    );
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    return paginated(res, result.rows, { limit, offset, total: parseInt(countResult.rows[0].count) });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    return success(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    return success(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    return success(res, { count: parseInt(result.rows[0].count) });
  } catch (err) { next(err); }
});

module.exports = router;
