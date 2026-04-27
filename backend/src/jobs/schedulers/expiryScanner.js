'use strict';

const { query } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Scans inventory_batches for near-expiry items (≤30 days)
 * and enqueues stock alert jobs.
 * Runs every 24 hours via setInterval.
 */
function start(stockAlertQueue) {
  const run = async () => {
    logger.info('Expiry scanner: starting scan...');
    try {
      const result = await query(`
        SELECT ib.id, ib.product_id, ib.warehouse_id, ib.batch_number,
               ib.quantity, ib.expiry_date,
               p.name AS product_name, p.low_stock_threshold
        FROM inventory_batches ib
        JOIN products p ON p.id = ib.product_id
        WHERE ib.is_active = TRUE
          AND ib.quantity > 0
          AND ib.expiry_date IS NOT NULL
          AND ib.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
          AND ib.expiry_date >= CURRENT_DATE
      `);

      logger.info(`Expiry scanner: found ${result.rows.length} near-expiry batch(es)`);

      for (const batch of result.rows) {
        await stockAlertQueue.add('expiry-alert', {
          batchId: batch.id,
          productId: batch.product_id,
          warehouseId: batch.warehouse_id,
          productName: batch.product_name,
          availableQty: batch.quantity,
          threshold: batch.low_stock_threshold,
          expiryDate: batch.expiry_date,
          batchNumber: batch.batch_number,
          alertType: 'expiry',
        });
      }
    } catch (err) {
      logger.error('Expiry scanner error', { err });
    }
  };

  // Run immediately on startup, then every 24 hours
  run();
  setInterval(run, 24 * 60 * 60 * 1000);

  // Also check for low stock
  const lowStockRun = async () => {
    logger.info('Low stock scanner: starting scan...');
    try {
      const result = await query(`
        SELECT product_id, warehouse_id, product_name, available_qty
        FROM v_available_stock
        JOIN products p ON p.id = product_id
        WHERE available_qty < p.low_stock_threshold
      `);

      for (const item of result.rows) {
        await stockAlertQueue.add('low-stock-alert', {
          productId: item.product_id,
          warehouseId: item.warehouse_id,
          productName: item.product_name,
          availableQty: item.available_qty,
          alertType: 'low_stock',
        });
      }
    } catch (err) {
      logger.error('Low stock scanner error', { err });
    }
  };

  setInterval(lowStockRun, 6 * 60 * 60 * 1000); // every 6 hours
}

module.exports = { start };
