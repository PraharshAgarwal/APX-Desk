'use strict';

const { query, withTransaction } = require('../../config/database');
const { createBatch } = require('../inventory/inventory.service');
const { commitReservation } = require('../inventory/inventory.service');
const { changeOrderStatus } = require('../orders/orders.service');
const { parsePagination } = require('../../utils/pagination');

// ── GRN ───────────────────────────────────────────────────────

async function listGRN({ warehouseId, status, dateFrom, dateTo } = {}, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = [];
  const params = [];
  let idx = 1;

  if (warehouseId) { conditions.push(`grn.warehouse_id = $${idx++}`); params.push(warehouseId); }
  if (status)      { conditions.push(`grn.status = $${idx++}`);        params.push(status); }
  if (dateFrom)    { conditions.push(`grn.created_at >= $${idx++}`);   params.push(dateFrom); }
  if (dateTo)      { conditions.push(`grn.created_at < ($${idx++}::date + INTERVAL '1 day')`); params.push(dateTo); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT grn.*, w.name AS warehouse_name, u.first_name || ' ' || u.last_name AS received_by_name
     FROM goods_receipt_notes grn
     JOIN warehouses w ON w.id = grn.warehouse_id
     JOIN users u ON u.id = grn.received_by
     ${where}
     ORDER BY grn.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
}

async function createGRN(data, userId) {
  const { warehouseId, supplierName, invoiceNumber, notes, items } = data;

  return withTransaction(async (client) => {
    // Create GRN header
    const grnResult = await client.query(
      `INSERT INTO goods_receipt_notes (grn_number, warehouse_id, supplier_name, invoice_number, received_by, status, notes)
       VALUES ('', $1, $2, $3, $4, 'completed', $5) RETURNING *`,
      [warehouseId, supplierName || null, invoiceNumber || null, userId, notes || null]
    );
    const grn = grnResult.rows[0];

    // Create inventory batches for each item
    const batches = [];
    for (const item of items) {
      const batch = await client.query(
        `INSERT INTO inventory_batches
           (product_id, warehouse_id, bin_id, grn_id, batch_number, quantity, received_qty, cost_per_unit, expiry_date, manufacture_date)
         VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9) RETURNING *`,
        [item.productId, warehouseId, item.binId || null, grn.id,
         item.batchNumber, item.receivedQty, item.costPerUnit || null,
         item.expiryDate || null, item.manufactureDate || null]
      );
      batches.push(batch.rows[0]);
    }

    return { grn, batches };
  });
}

async function getGRN(id) {
  const grnResult = await query('SELECT * FROM goods_receipt_notes WHERE id = $1', [id]);
  if (grnResult.rows.length === 0) return null;
  const grn = grnResult.rows[0];

  const batchResult = await query(
    `SELECT ib.*, p.name AS product_name, p.sku, p.unit, p.manufacturer
     FROM inventory_batches ib
     JOIN products p ON p.id = ib.product_id
     WHERE ib.grn_id = $1
     ORDER BY ib.created_at`,
    [id]
  );
  grn.batches = batchResult.rows;
  return grn;
}

// ── PICK & DISPATCH ──────────────────────────────────────────

async function pickOrder(orderId, userId) {
  // Move order to processing
  return changeOrderStatus(orderId, 'processing', userId, 'Picked for dispatch');
}

async function dispatchOrder(orderId, dispatchData, userId) {
  return withTransaction(async (client) => {
    // Validate order is confirmed or processing
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]
    );
    if (orderResult.rows.length === 0) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    const order = orderResult.rows[0];
    if (!['confirmed', 'processing'].includes(order.status)) {
      throw Object.assign(
        new Error(`Order must be confirmed or in processing status to dispatch. Current: ${order.status}`),
        { statusCode: 422, code: 'INVALID_TRANSITION' }
      );
    }

    // If still confirmed, move to processing first
    if (order.status === 'confirmed') {
      await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', ['processing', orderId]);
      await client.query(
        'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
        [orderId, 'confirmed', 'processing', userId, 'Auto-picked for dispatch']
      );
    }

    // Get reservations to create dispatch items
    const reservations = await client.query(
      `SELECT ir.*, oi.id AS order_item_id FROM inventory_reservations ir
       JOIN order_items oi ON oi.order_id = ir.order_id AND oi.product_id = ir.product_id
       WHERE ir.order_id = $1 AND ir.committed = FALSE`,
      [orderId]
    );

    // Create dispatch record
    const dispResult = await client.query(
      `INSERT INTO dispatches (dispatch_number, order_id, warehouse_id, dispatched_by, status, vehicle_number, driver_name, driver_phone, lr_number, dispatched_at)
       VALUES ('', $1, $2, $3, 'in_transit', $4, $5, $6, $7, NOW()) RETURNING *`,
      [orderId, order.warehouse_id, userId, dispatchData.vehicleNumber || null,
       dispatchData.driverName || null, dispatchData.driverPhone || null, dispatchData.lrNumber || null]
    );
    const dispatch = dispResult.rows[0];

    // Create dispatch items from reservations
    for (const res of reservations.rows) {
      await client.query(
        'INSERT INTO dispatch_items (dispatch_id, order_item_id, batch_id, product_id, quantity) VALUES ($1,$2,$3,$4,$5)',
        [dispatch.id, res.order_item_id, res.batch_id, res.product_id, res.quantity]
      );
    }

    // Inline commit of inventory reservations (no nested withTransaction)
    for (const res of reservations.rows) {
      await client.query(
        `UPDATE inventory_batches
         SET quantity = quantity - $1, reserved_qty = reserved_qty - $1, updated_at = NOW()
         WHERE id = $2`,
        [res.quantity, res.batch_id]
      );
      await client.query(
        'UPDATE inventory_reservations SET committed = TRUE WHERE id = $1',
        [res.id]
      );
    }

    // Inline order status update to dispatched (no nested withTransaction)
    await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', ['dispatched', orderId]);
    await client.query(
      'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
      [orderId, 'processing', 'dispatched', userId, `Dispatched via ${dispatchData.vehicleNumber || 'vehicle'}`]
    );

    return dispatch;
  });
}

async function listDispatches({ status } = {}, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) { conditions.push(`d.status = $${idx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT d.*,
            o.order_number,
            b.name AS business_name,
            u.first_name || ' ' || u.last_name AS dispatched_by_name
     FROM dispatches d
     LEFT JOIN orders o ON o.id = d.order_id
     LEFT JOIN businesses b ON b.id = o.business_id
     LEFT JOIN users u ON u.id = d.dispatched_by
     ${where}
     ORDER BY d.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
}

async function getDispatch(id) {
  const dispResult = await query(
    `SELECT d.*, o.order_number, b.name AS business_name,
            u.first_name || ' ' || u.last_name AS dispatched_by_name,
            w.name AS warehouse_name
     FROM dispatches d
     LEFT JOIN orders o ON o.id = d.order_id
     LEFT JOIN businesses b ON b.id = o.business_id
     LEFT JOIN users u ON u.id = d.dispatched_by
     LEFT JOIN warehouses w ON w.id = d.warehouse_id
     WHERE d.id = $1`,
    [id]
  );
  if (dispResult.rows.length === 0) return null;
  const dispatch = dispResult.rows[0];

  const itemsResult = await query(
    `SELECT di.*, p.name AS product_name, p.sku, p.unit, p.manufacturer,
            ib.batch_number, ib.expiry_date
     FROM dispatch_items di
     JOIN products p ON p.id = di.product_id
     LEFT JOIN inventory_batches ib ON ib.id = di.batch_id
     WHERE di.dispatch_id = $1
     ORDER BY p.name`,
    [id]
  );
  dispatch.items = itemsResult.rows;
  return dispatch;
}

async function markDelivered(dispatchId, userId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      'UPDATE dispatches SET status = $1, delivered_at = NOW() WHERE id = $2 RETURNING *',
      ['delivered', dispatchId]
    );
    if (result.rows.length === 0) throw Object.assign(new Error('Dispatch not found'), { statusCode: 404 });

    const dispatch = result.rows[0];
    await changeOrderStatus(dispatch.order_id, 'delivered', userId, 'Delivery confirmed');
    return dispatch;
  });
}

async function listWarehouses() {
  const result = await query(
    `SELECT w.*, u.first_name || ' ' || u.last_name AS manager_name FROM warehouses w
     LEFT JOIN users u ON u.id = w.manager_id WHERE w.is_active = TRUE ORDER BY w.name`
  );
  return result.rows;
}

module.exports = { listGRN, createGRN, getGRN, pickOrder, dispatchOrder, listDispatches, getDispatch, markDelivered, listWarehouses };
