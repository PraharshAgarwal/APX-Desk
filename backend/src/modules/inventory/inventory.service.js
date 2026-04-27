'use strict';

/**
 * ⭐ CRITICAL SERVICE — Inventory Management
 *
 * Implements:
 *  - FEFO (First-Expired-First-Out) batch selection
 *  - Reservation system (soft-lock before commit)
 *  - Atomic adjustments with before/after state
 */

const { query, withTransaction } = require('../../config/database');
const { parsePagination } = require('../../utils/pagination');
const logger = require('../../utils/logger');

// ── BATCH QUERIES ─────────────────────────────────────────────

async function listBatches({ warehouseId, productId, nearExpiry, manufacturer }, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = ['ib.is_active = TRUE'];
  const params = [];
  let idx = 1;

  if (warehouseId)    { conditions.push(`ib.warehouse_id = $${idx++}`);   params.push(warehouseId); }
  if (productId)      { conditions.push(`ib.product_id = $${idx++}`);     params.push(productId); }
  if (manufacturer)   { conditions.push(`p.manufacturer = $${idx++}`);    params.push(manufacturer); }
  if (nearExpiry === 'true') {
    conditions.push(`ib.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(`SELECT COUNT(*) FROM inventory_batches ib JOIN products p ON p.id = ib.product_id ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT ib.id,
            ib.product_id, ib.warehouse_id, ib.bin_id, ib.grn_id,
            ib.batch_number, ib.quantity, ib.reserved_qty, ib.received_qty,
            ib.cost_per_unit, ib.expiry_date, ib.manufacture_date,
            ib.is_active, ib.created_at, ib.updated_at,
            p.name AS product_name, p.sku, p.manufacturer,
            w.name AS warehouse_name,
            wb.bin_code,
            (ib.quantity - ib.reserved_qty) AS available_qty,
            (ib.expiry_date - CURRENT_DATE) AS days_until_expiry
     FROM inventory_batches ib
     JOIN products p ON p.id = ib.product_id
     JOIN warehouses w ON w.id = ib.warehouse_id
     LEFT JOIN warehouse_bins wb ON wb.id = ib.bin_id
     ${where}
     ORDER BY ib.expiry_date NULLS LAST, ib.created_at
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return { data: result.rows, total };
}

async function getBatchById(id) {
  const result = await query(
    `SELECT ib.*, p.name AS product_name, p.sku, w.name AS warehouse_name, wb.bin_code
     FROM inventory_batches ib
     JOIN products p ON p.id = ib.product_id
     JOIN warehouses w ON w.id = ib.warehouse_id
     LEFT JOIN warehouse_bins wb ON wb.id = ib.bin_id
     WHERE ib.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function createBatch(data) {
  const { productId, warehouseId, binId, grnId, batchNumber, receivedQty, costPerUnit, expiryDate, manufactureDate } = data;
  const result = await query(
    `INSERT INTO inventory_batches
       (product_id, warehouse_id, bin_id, grn_id, batch_number, quantity, received_qty, cost_per_unit, expiry_date, manufacture_date)
     VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9) RETURNING *`,
    [productId, warehouseId, binId || null, grnId || null, batchNumber, receivedQty, costPerUnit || null, expiryDate || null, manufactureDate || null]
  );
  return result.rows[0];
}

async function updateBatch(id, { binId }) {
  const result = await query(
    'UPDATE inventory_batches SET bin_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [binId, id]
  );
  return result.rows[0];
}

async function getStockSummary() {
  const result = await query('SELECT * FROM v_available_stock ORDER BY product_name');
  return result.rows;
}

async function getNearExpiryBatches() {
  const result = await query('SELECT * FROM v_near_expiry_batches');
  return result.rows;
}

// ── RESERVATION SYSTEM ────────────────────────────────────────

/**
 * Reserve stock for an order using FEFO (earliest expiry first).
 * Runs inside a transaction to prevent race conditions.
 *
 * @param {string}  orderId
 * @param {Array}   items   - [{ productId, warehouseId, quantity }]
 * @param {Object}  client  - pg transaction client (optional)
 */
async function reserveStock(orderId, items, existingClient = null) {
  const run = async (client) => {
    const reservations = [];

    for (const item of items) {
      const { productId, warehouseId, quantity } = item;
      let remaining = parseFloat(quantity);

      // Select batches in FEFO order — lock rows to prevent concurrent reservation
      const batchResult = await client.query(
        `SELECT id, quantity, reserved_qty, expiry_date,
                (quantity - reserved_qty) AS available
         FROM inventory_batches
         WHERE product_id = $1
           AND warehouse_id = $2
           AND is_active = TRUE
           AND (quantity - reserved_qty) > 0
         ORDER BY expiry_date NULLS LAST, created_at
         FOR UPDATE SKIP LOCKED`,
        [productId, warehouseId]
      );

      const batches = batchResult.rows;
      const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.available), 0);

      if (totalAvailable < remaining) {
        const err = new Error(`Insufficient stock for product ${productId}. Available: ${totalAvailable}, Requested: ${remaining}`);
        err.statusCode = 409; err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }

      for (const batch of batches) {
        if (remaining <= 0) break;

        const toReserve = Math.min(remaining, parseFloat(batch.available));
        remaining -= toReserve;

        // Increment reserved_qty on the batch
        await client.query(
          'UPDATE inventory_batches SET reserved_qty = reserved_qty + $1, updated_at = NOW() WHERE id = $2',
          [toReserve, batch.id]
        );

        // Insert reservation record
        const resResult = await client.query(
          `INSERT INTO inventory_reservations (order_id, batch_id, product_id, quantity)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [orderId, batch.id, productId, toReserve]
        );

        reservations.push(resResult.rows[0]);
      }
    }

    return reservations;
  };

  return existingClient ? run(existingClient) : withTransaction(run);
}

/**
 * Commit a reservation: deduct actual quantities from batches.
 * Called when an order is dispatched.
 */
async function commitReservation(orderId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      'SELECT * FROM inventory_reservations WHERE order_id = $1 AND committed = FALSE FOR UPDATE',
      [orderId]
    );

    for (const res of result.rows) {
      // Deduct from batch quantity
      await client.query(
        `UPDATE inventory_batches
         SET quantity = quantity - $1,
             reserved_qty = reserved_qty - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [res.quantity, res.batch_id]
      );

      // Mark reservation as committed
      await client.query(
        'UPDATE inventory_reservations SET committed = TRUE WHERE id = $1',
        [res.id]
      );
    }

    logger.info(`Committed reservation for order ${orderId}`, { count: result.rows.length });
    return result.rows;
  });
}

/**
 * Release (rollback) a reservation.
 * Called when an order is cancelled.
 */
async function releaseReservation(orderId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      'SELECT * FROM inventory_reservations WHERE order_id = $1 AND committed = FALSE FOR UPDATE',
      [orderId]
    );

    for (const res of result.rows) {
      await client.query(
        'UPDATE inventory_batches SET reserved_qty = reserved_qty - $1, updated_at = NOW() WHERE id = $2',
        [res.quantity, res.batch_id]
      );
      await client.query('DELETE FROM inventory_reservations WHERE id = $1', [res.id]);
    }

    logger.info(`Released reservation for order ${orderId}`, { count: result.rows.length });
  });
}

async function listReservations(orderId) {
  const params = [];
  let where = '';
  if (orderId) { where = 'WHERE ir.order_id = $1'; params.push(orderId); }

  const result = await query(
    `SELECT ir.*, p.name AS product_name, p.sku, ib.batch_number, ib.expiry_date
     FROM inventory_reservations ir
     JOIN products p ON p.id = ir.product_id
     JOIN inventory_batches ib ON ib.id = ir.batch_id
     ${where}
     ORDER BY ir.reserved_at DESC`,
    params
  );
  return result.rows;
}

// ── ADJUSTMENTS ───────────────────────────────────────────────

async function adjustBatch(batchId, { reason, quantityDelta, notes }, adjustedBy) {
  return withTransaction(async (client) => {
    const batchResult = await client.query(
      'SELECT * FROM inventory_batches WHERE id = $1 FOR UPDATE',
      [batchId]
    );
    if (batchResult.rows.length === 0) {
      const err = new Error('Batch not found'); err.statusCode = 404; throw err;
    }

    const batch = batchResult.rows[0];
    const quantityBefore = parseFloat(batch.quantity);
    const quantityAfter  = quantityBefore + parseFloat(quantityDelta);

    if (quantityAfter < 0) {
      const err = new Error(`Adjustment would result in negative stock. Current: ${quantityBefore}`);
      err.statusCode = 400; err.code = 'NEGATIVE_STOCK';
      throw err;
    }

    // Update batch
    await client.query(
      'UPDATE inventory_batches SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [quantityAfter, batchId]
    );

    // Log adjustment
    const adjResult = await client.query(
      `INSERT INTO inventory_adjustments
         (batch_id, product_id, warehouse_id, reason, quantity_delta, quantity_before, quantity_after, notes, adjusted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [batchId, batch.product_id, batch.warehouse_id, reason, quantityDelta, quantityBefore, quantityAfter, notes || null, adjustedBy]
    );

    return adjResult.rows[0];
  });
}

async function listAdjustments({ batchId, warehouseId }, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = [];
  const params = [];
  let idx = 1;

  if (batchId)     { conditions.push(`ia.batch_id = $${idx++}`);     params.push(batchId); }
  if (warehouseId) { conditions.push(`ia.warehouse_id = $${idx++}`); params.push(warehouseId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT ia.*, p.name AS product_name, p.sku,
            ib.batch_number,
            u.first_name || ' ' || u.last_name AS adjusted_by_name
     FROM inventory_adjustments ia
     JOIN products p ON p.id = ia.product_id
     JOIN inventory_batches ib ON ib.id = ia.batch_id
     JOIN users u ON u.id = ia.adjusted_by
     ${where}
     ORDER BY ia.adjusted_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
}

module.exports = {
  listBatches, getBatchById, createBatch, updateBatch, getStockSummary, getNearExpiryBatches,
  reserveStock, commitReservation, releaseReservation, listReservations,
  adjustBatch, listAdjustments,
};
