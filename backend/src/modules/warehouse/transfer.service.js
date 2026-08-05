'use strict';

/**
 * warehouse/transfer.service.js
 *
 * Inter-warehouse stock transfer.
 *
 * Flow:
 *   1. createTransfer  — validate + deduct qty from source batch + create transfer record
 *   2. completeTransfer — mark completed + create new batch(es) at destination warehouse
 *   3. cancelTransfer  — restore qty to source batches (if still pending)
 */

const { query, withTransaction } = require('../../config/database');
const { parsePagination } = require('../../utils/pagination');
const logger = require('../../utils/logger');

// ── List ──────────────────────────────────────────────────────

async function listTransfers(filters, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const { fromWarehouseId, toWarehouseId, status } = filters || {};

  const conditions = [];
  const params = [];
  let idx = 1;

  if (fromWarehouseId) { conditions.push(`wt.from_warehouse_id = $${idx++}`); params.push(fromWarehouseId); }
  if (toWarehouseId)   { conditions.push(`wt.to_warehouse_id   = $${idx++}`); params.push(toWarehouseId); }
  if (status)          { conditions.push(`wt.status = $${idx++}`);            params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM warehouse_transfers wt ${where}`, params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT
       wt.*,
       fw.name   AS from_warehouse_name,
       tw.name   AS to_warehouse_name,
       u.first_name || ' ' || u.last_name AS created_by_name,
       (
         SELECT json_agg(json_build_object(
           'id',          wti.id,
           'product_id',  wti.product_id,
           'product_name', p.name,
           'sku',          p.sku,
           'quantity',     wti.quantity,
           'source_batch_id', wti.source_batch_id,
           'dest_batch_id',   wti.dest_batch_id
         ))
         FROM warehouse_transfer_items wti
         JOIN products p ON p.id = wti.product_id
         WHERE wti.transfer_id = wt.id
       ) AS items
     FROM warehouse_transfers wt
     JOIN warehouses fw ON fw.id = wt.from_warehouse_id
     JOIN warehouses tw ON tw.id = wt.to_warehouse_id
     JOIN users u       ON u.id  = wt.created_by
     ${where}
     ORDER BY wt.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  return { data: result.rows, meta: { total, limit, offset } };
}

// ── Get one ───────────────────────────────────────────────────

async function getTransferById(id) {
  const result = await query(
    `SELECT
       wt.*,
       fw.name   AS from_warehouse_name,
       tw.name   AS to_warehouse_name,
       u.first_name || ' ' || u.last_name AS created_by_name,
       (
         SELECT json_agg(json_build_object(
           'id',          wti.id,
           'product_id',  wti.product_id,
           'product_name', p.name,
           'sku',          p.sku,
           'quantity',     wti.quantity,
           'source_batch_id', wti.source_batch_id,
           'dest_batch_id',   wti.dest_batch_id
         ))
         FROM warehouse_transfer_items wti
         JOIN products p ON p.id = wti.product_id
         WHERE wti.transfer_id = wt.id
       ) AS items
     FROM warehouse_transfers wt
     JOIN warehouses fw ON fw.id = wt.from_warehouse_id
     JOIN warehouses tw ON tw.id = wt.to_warehouse_id
     JOIN users u       ON u.id  = wt.created_by
     WHERE wt.id = $1`,
    [id]
  );
  if (!result.rows[0]) {
    const err = new Error('Transfer not found'); err.statusCode = 404; throw err;
  }
  return result.rows[0];
}

// ── Create ────────────────────────────────────────────────────

async function createTransfer({ fromWarehouseId, toWarehouseId, items, notes }, user) {
  return withTransaction(async (client) => {
    // 1. Validate each item: batch exists, belongs to source WH, has enough qty
    for (const item of items) {
      const batchResult = await client.query(
        `SELECT id, quantity, reserved_qty, product_id, warehouse_id
         FROM inventory_batches
         WHERE id = $1 AND is_active = TRUE
         FOR UPDATE`,
        [item.batchId]
      );

      if (batchResult.rows.length === 0) {
        const err = new Error(`Batch ${item.batchId} not found`);
        err.statusCode = 404; err.code = 'BATCH_NOT_FOUND'; throw err;
      }

      const batch = batchResult.rows[0];

      if (batch.warehouse_id !== fromWarehouseId) {
        const err = new Error(`Batch ${item.batchId} does not belong to the source warehouse`);
        err.statusCode = 422; err.code = 'BATCH_WRONG_WAREHOUSE'; throw err;
      }

      const available = parseFloat(batch.quantity) - parseFloat(batch.reserved_qty);
      if (available < parseFloat(item.quantity)) {
        const err = new Error(
          `Insufficient available stock in batch ${item.batchId}. ` +
          `Available: ${available}, Requested: ${item.quantity}`
        );
        err.statusCode = 422; err.code = 'INSUFFICIENT_STOCK'; throw err;
      }

      // Verify product matches what caller said
      item._productId = batch.product_id;
      item._batch = batch;
    }

    // 2. Create transfer header
    const transferResult = await client.query(
      `INSERT INTO warehouse_transfers
         (from_warehouse_id, to_warehouse_id, status, notes, created_by)
       VALUES ($1, $2, 'pending', $3, $4) RETURNING *`,
      [fromWarehouseId, toWarehouseId, notes || null, user.id]
    );
    const transfer = transferResult.rows[0];

    // 3. Create items + deduct qty from source batches
    for (const item of items) {
      // Insert transfer item
      await client.query(
        `INSERT INTO warehouse_transfer_items
           (transfer_id, source_batch_id, product_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [transfer.id, item.batchId, item._productId, item.quantity]
      );

      // Deduct from source batch immediately (in-transit means physically moved)
      await client.query(
        `UPDATE inventory_batches
         SET quantity = quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [parseFloat(item.quantity), item.batchId]
      );
    }

    // 4. Mark as in_transit
    await client.query(
      `UPDATE warehouse_transfers SET status = 'in_transit' WHERE id = $1`,
      [transfer.id]
    );

    logger.info(`Transfer ${transfer.transfer_number} created: ${fromWarehouseId} → ${toWarehouseId}`, { userId: user.id });
    return { ...transfer, status: 'in_transit', items };
  });
}

// ── Complete (goods received at destination) ──────────────────

async function completeTransfer(transferId, user) {
  return withTransaction(async (client) => {
    // Lock the transfer
    const transferResult = await client.query(
      `SELECT * FROM warehouse_transfers WHERE id = $1 FOR UPDATE`,
      [transferId]
    );

    if (transferResult.rows.length === 0) {
      const err = new Error('Transfer not found'); err.statusCode = 404; throw err;
    }

    const transfer = transferResult.rows[0];

    if (transfer.status !== 'in_transit') {
      const err = new Error(`Cannot complete a transfer with status '${transfer.status}'`);
      err.statusCode = 422; err.code = 'INVALID_TRANSFER_STATE'; throw err;
    }

    // Get all transfer items
    const itemsResult = await client.query(
      `SELECT wti.*, ib.batch_number, ib.cost_per_unit, ib.expiry_date, ib.manufacture_date, ib.bin_id
       FROM warehouse_transfer_items wti
       JOIN inventory_batches ib ON ib.id = wti.source_batch_id
       WHERE wti.transfer_id = $1`,
      [transferId]
    );

    // Create new batch at destination for each item
    for (const item of itemsResult.rows) {
      const newBatchResult = await client.query(
        `INSERT INTO inventory_batches
           (product_id, warehouse_id, batch_number, quantity, reserved_qty, received_qty,
            cost_per_unit, expiry_date, manufacture_date, is_active)
         VALUES ($1, $2, $3, $4, 0, $4, $5, $6, $7, TRUE) RETURNING id`,
        [
          item.product_id,
          transfer.to_warehouse_id,
          `${item.batch_number}-TRF`,   // suffix to distinguish origin
          item.quantity,
          item.cost_per_unit || null,
          item.expiry_date || null,
          item.manufacture_date || null,
        ]
      );

      // Link dest_batch_id on the transfer item for traceability
      await client.query(
        `UPDATE warehouse_transfer_items SET dest_batch_id = $1 WHERE id = $2`,
        [newBatchResult.rows[0].id, item.id]
      );
    }

    // Mark transfer as completed
    const completed = await client.query(
      `UPDATE warehouse_transfers
       SET status = 'completed', completed_by = $1, completed_at = NOW()
       WHERE id = $2 RETURNING *`,
      [user.id, transferId]
    );

    logger.info(`Transfer ${transfer.transfer_number} completed`, { userId: user.id });
    return completed.rows[0];
  });
}

// ── Cancel ────────────────────────────────────────────────────

async function cancelTransfer(transferId, user) {
  return withTransaction(async (client) => {
    const transferResult = await client.query(
      `SELECT * FROM warehouse_transfers WHERE id = $1 FOR UPDATE`,
      [transferId]
    );

    if (transferResult.rows.length === 0) {
      const err = new Error('Transfer not found'); err.statusCode = 404; throw err;
    }

    const transfer = transferResult.rows[0];

    if (!['pending', 'in_transit'].includes(transfer.status)) {
      const err = new Error(`Cannot cancel a transfer with status '${transfer.status}'`);
      err.statusCode = 422; err.code = 'INVALID_TRANSFER_STATE'; throw err;
    }

    // Restore qty to source batches
    const itemsResult = await client.query(
      `SELECT * FROM warehouse_transfer_items WHERE transfer_id = $1`,
      [transferId]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE inventory_batches SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.source_batch_id]
      );
    }

    const cancelled = await client.query(
      `UPDATE warehouse_transfers SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [transferId]
    );

    logger.info(`Transfer ${transfer.transfer_number} cancelled`, { userId: user.id });
    return cancelled.rows[0];
  });
}

module.exports = { listTransfers, getTransferById, createTransfer, completeTransfer, cancelTransfer };
