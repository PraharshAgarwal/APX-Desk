'use strict';

/**
 * Reservation Reaper — releases stale, uncommitted reservations.
 *
 * Runs every hour. Finds inventory_reservations where:
 *   - committed = FALSE  (not yet dispatched)
 *   - expires_at < NOW() (past the 24-hour hold window)
 *
 * For each expired reservation it:
 *   1. Returns the quantity back to the batch's reserved_qty
 *   2. Deletes the reservation record
 *
 * The parent order is left as-is; it may be separately cancelled
 * by ops staff or by a future policy scheduler.
 */

const { withTransaction } = require('../../config/database');
const logger = require('../../utils/logger');

async function reapExpiredReservations() {
  logger.info('Reservation reaper: scanning for expired reservations...');

  return withTransaction(async (client) => {
    // Fetch and lock all expired, uncommitted reservations
    const result = await client.query(
      `SELECT id, batch_id, order_id, quantity
       FROM inventory_reservations
       WHERE committed = FALSE
         AND expires_at < NOW()
       FOR UPDATE SKIP LOCKED`
    );

    if (result.rows.length === 0) {
      logger.info('Reservation reaper: nothing to reap');
      return;
    }

    logger.info(`Reservation reaper: releasing ${result.rows.length} expired reservation(s)`);

    for (const res of result.rows) {
      // Return the held quantity back to the batch
      await client.query(
        `UPDATE inventory_batches
         SET reserved_qty = GREATEST(0, reserved_qty - $1),
             updated_at   = NOW()
         WHERE id = $2`,
        [res.quantity, res.batch_id]
      );

      // Remove the expired reservation
      await client.query(
        'DELETE FROM inventory_reservations WHERE id = $1',
        [res.id]
      );

      logger.debug(`Reservation reaper: released reservation ${res.id} for order ${res.order_id}`);
    }

    logger.info(`Reservation reaper: released ${result.rows.length} reservation(s)`);
  });
}

function start() {
  const run = async () => {
    try {
      await reapExpiredReservations();
    } catch (err) {
      logger.error('Reservation reaper error', { err });
    }
  };

  // Run immediately on startup, then every hour
  run();
  setInterval(run, 60 * 60 * 1000);
}

module.exports = { start };
