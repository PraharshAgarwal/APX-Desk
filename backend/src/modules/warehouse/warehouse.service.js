'use strict';

const { query, withTransaction } = require('../../config/database');
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
    `SELECT grn.*,
            w.name AS warehouse_name,
            u.first_name || ' ' || u.last_name AS received_by_name,
            rv.first_name || ' ' || rv.last_name AS reviewed_by_name,
            (SELECT COUNT(*) FROM grn_items gi WHERE gi.grn_id = grn.id) AS item_count
     FROM goods_receipt_notes grn
     JOIN warehouses w ON w.id = grn.warehouse_id
     JOIN users u ON u.id = grn.received_by
     LEFT JOIN users rv ON rv.id = grn.reviewed_by
     ${where}
     ORDER BY grn.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
}

/**
 * Create a GRN in 'pending_approval' state.
 * Line items are stored in grn_items (staging) — NOT yet in inventory_batches.
 * Inventory is only committed when an admin/sales_executive approves.
 */
async function createGRN(data, userId) {
  const { warehouseId, supplierName, receivedFrom, vehicleNumber, invoiceNumber, notes, items } = data;

  return withTransaction(async (client) => {
    // Create GRN header — status is pending_approval (not completed)
    const grnResult = await client.query(
      `INSERT INTO goods_receipt_notes
         (grn_number, warehouse_id, supplier_name, received_from, vehicle_number,
          invoice_number, received_by, status, notes)
       VALUES ('', $1, $2, $3, $4, $5, $6, 'pending_approval', $7) RETURNING *`,
      [warehouseId, supplierName || null, receivedFrom || null, vehicleNumber || null,
       invoiceNumber || null, userId, notes || null]
    );
    const grn = grnResult.rows[0];

    // Store line items in staging table (grn_items)
    const stagedItems = [];
    for (const item of items) {
      const staged = await client.query(
        `INSERT INTO grn_items
           (grn_id, product_id, bin_id, batch_number, received_qty, cost_per_unit, expiry_date, manufacture_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          grn.id,
          item.productId,
          item.binId || null,
          item.batchNumber,
          item.receivedQty,
          item.costPerUnit || null,
          item.expiryDate || null,
          item.manufactureDate || null,
        ]
      );
      stagedItems.push(staged.rows[0]);
    }

    // Notify all admins about the pending GRN
    const approvers = await client.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'admin' AND u.status = 'active'`
    );
    for (const approver of approvers.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'order_placed', $2, $3, $4)`,
        [
          approver.id,
          `GRN Pending Approval: ${grn.grn_number}`,
          `A new GRN from ${receivedFrom || supplierName || 'unknown source'} via vehicle ${vehicleNumber || '—'} requires your approval.`,
          JSON.stringify({ grn_id: grn.id, grn_number: grn.grn_number }),
        ]
      );
    }

    return { grn, items: stagedItems };
  });
}

async function getGRN(id) {
  const grnResult = await query(
    `SELECT grn.*,
            w.name AS warehouse_name,
            u.first_name || ' ' || u.last_name AS received_by_name,
            rv.first_name || ' ' || rv.last_name AS reviewed_by_name
     FROM goods_receipt_notes grn
     JOIN warehouses w ON w.id = grn.warehouse_id
     JOIN users u ON u.id = grn.received_by
     LEFT JOIN users rv ON rv.id = grn.reviewed_by
     WHERE grn.id = $1`,
    [id]
  );
  if (grnResult.rows.length === 0) return null;
  const grn = grnResult.rows[0];

  if (grn.status === 'pending_approval') {
    // Return staged items for pending GRNs
    const itemsResult = await query(
      `SELECT gi.*, p.name AS product_name, p.sku, p.unit, p.manufacturer
       FROM grn_items gi
       JOIN products p ON p.id = gi.product_id
       WHERE gi.grn_id = $1
       ORDER BY gi.created_at`,
      [id]
    );
    grn.batches = itemsResult.rows.map(r => ({ ...r, quantity: r.received_qty }));
  } else {
    // Return committed inventory batches for completed/cancelled GRNs
    const batchResult = await query(
      `SELECT ib.*, p.name AS product_name, p.sku, p.unit, p.manufacturer
       FROM inventory_batches ib
       JOIN products p ON p.id = ib.product_id
       WHERE ib.grn_id = $1
       ORDER BY ib.created_at`,
      [id]
    );
    grn.batches = batchResult.rows;
  }

  return grn;
}

/**
 * List all GRNs in 'pending_approval' state.
 * Used by the admin/sales approval queue.
 */
async function listPendingGRNs() {
  const result = await query(
    `SELECT grn.*,
            w.name AS warehouse_name,
            u.first_name || ' ' || u.last_name AS received_by_name,
            (SELECT COUNT(*) FROM grn_items gi WHERE gi.grn_id = grn.id) AS item_count,
            (SELECT SUM(gi.received_qty) FROM grn_items gi WHERE gi.grn_id = grn.id) AS total_qty
     FROM goods_receipt_notes grn
     JOIN warehouses w ON w.id = grn.warehouse_id
     JOIN users u ON u.id = grn.received_by
     WHERE grn.status = 'pending_approval'
     ORDER BY grn.created_at ASC`
  );
  return result.rows;
}

/**
 * Approve or reject a pending GRN.
 * - approved = true  → commits grn_items → inventory_batches, sets status = 'completed'
 * - approved = false → sets status = 'cancelled', grn_items are cascade-deleted
 */
async function approveGRN(grnId, reviewerId, { approved, notes }) {
  return withTransaction(async (client) => {
    // Lock the GRN row for update
    const grnResult = await client.query(
      `SELECT grn.*, u.id AS creator_id
       FROM goods_receipt_notes grn
       JOIN users u ON u.id = grn.received_by
       WHERE grn.id = $1 FOR UPDATE`,
      [grnId]
    );
    if (grnResult.rows.length === 0) {
      throw Object.assign(new Error('GRN not found'), { statusCode: 404 });
    }
    const grn = grnResult.rows[0];

    if (grn.status !== 'pending_approval') {
      throw Object.assign(
        new Error(`GRN is not pending approval. Current status: ${grn.status}`),
        { statusCode: 422, code: 'INVALID_TRANSITION' }
      );
    }

    const newStatus = approved ? 'completed' : 'cancelled';

    if (approved) {
      // Fetch staged line items
      const itemsResult = await client.query(
        'SELECT * FROM grn_items WHERE grn_id = $1 ORDER BY created_at',
        [grnId]
      );

      if (itemsResult.rows.length === 0) {
        throw Object.assign(new Error('GRN has no line items to approve'), { statusCode: 422 });
      }

      // Promote each staging item → inventory_batch
      for (const item of itemsResult.rows) {
        await client.query(
          `INSERT INTO inventory_batches
             (product_id, warehouse_id, bin_id, grn_id, batch_number,
              quantity, received_qty, cost_per_unit, expiry_date, manufacture_date)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)`,
          [
            item.product_id,
            grn.warehouse_id,
            item.bin_id || null,
            grn.id,
            item.batch_number,
            item.received_qty,
            item.cost_per_unit || null,
            item.expiry_date || null,
            item.manufacture_date || null,
          ]
        );
      }

      // Mark GRN as completed
      await client.query(
        `UPDATE goods_receipt_notes
         SET status = 'completed', reviewed_by = $1, reviewed_at = NOW(),
             review_notes = $2, completed_at = NOW()
         WHERE id = $3`,
        [reviewerId, notes || null, grnId]
      );
    } else {
      // Rejection — grn_items are cascade-deleted via FK
      await client.query(
        `UPDATE goods_receipt_notes
         SET status = 'cancelled', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
         WHERE id = $3`,
        [reviewerId, notes || null, grnId]
      );
      // Explicitly delete staged items (belt-and-suspenders alongside FK cascade)
      await client.query('DELETE FROM grn_items WHERE grn_id = $1', [grnId]);
    }

    // Notify the GRN creator of the outcome
    const titleVerb = approved ? 'Approved' : 'Rejected';
    const bodyMsg = approved
      ? `Your GRN ${grn.grn_number} has been approved and inventory has been updated.`
      : `Your GRN ${grn.grn_number} was rejected. ${notes ? `Reason: ${notes}` : ''}`;

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'order_confirmed', $2, $3, $4)`,
      [
        grn.creator_id,
        `GRN ${titleVerb}: ${grn.grn_number}`,
        bodyMsg,
        JSON.stringify({ grn_id: grn.id, grn_number: grn.grn_number, approved }),
      ]
    );

    return { grnId, status: newStatus, approved };
  });
}

// ── DISPATCH (two-step) ───────────────────────────────────────

/**
 * Step 1 (Admin): Create a dispatch record with status 'pending_dispatch'.
 * Validates the order, stores vehicle/driver details.
 * Does NOT touch inventory. Notifies warehouse managers.
 */
async function createDispatch(orderId, dispatchData, adminId) {
  return withTransaction(async (client) => {
    // Validate order is confirmed or processing
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]
    );
    if (orderResult.rows.length === 0)
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    const order = orderResult.rows[0];
    if (!['confirmed', 'processing'].includes(order.status)) {
      throw Object.assign(
        new Error(`Order must be confirmed or in processing to create dispatch. Current: ${order.status}`),
        { statusCode: 422, code: 'INVALID_TRANSITION' }
      );
    }

    // Move order to processing if still confirmed
    if (order.status === 'confirmed') {
      await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', ['processing', orderId]);
      await client.query(
        'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
        [orderId, 'confirmed', 'processing', adminId, 'Dispatch created by admin']
      );
    }

    // Create dispatch record — pending_dispatch (no inventory touched yet)
    const dispResult = await client.query(
      `INSERT INTO dispatches
         (dispatch_number, order_id, warehouse_id, dispatched_by, status,
          vehicle_number, driver_name, driver_phone, lr_number, notes)
       VALUES ('', $1, $2, $3, 'pending_dispatch', $4, $5, $6, $7, $8) RETURNING *`,
      [
        orderId, order.warehouse_id, adminId,
        dispatchData.vehicleNumber,
        dispatchData.driverName,
        dispatchData.driverPhone,
        dispatchData.lrNumber || null,
        dispatchData.notes || null,
      ]
    );
    const dispatch = dispResult.rows[0];

    // Notify warehouse managers
    const wms = await client.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'warehouse_manager' AND u.status = 'active'`
    );
    for (const wm of wms.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'order_confirmed', $2, $3, $4)`,
        [
          wm.id,
          `Dispatch Ready: ${dispatch.dispatch_number}`,
          `A dispatch has been assigned to you. Vehicle: ${dispatchData.vehicleNumber}, Driver: ${dispatchData.driverName}. Please execute when ready.`,
          JSON.stringify({ dispatch_id: dispatch.id, order_id: orderId }),
        ]
      );
    }

    return dispatch;
  });
}

/**
 * Step 2 (Warehouse Manager): Execute a pending_dispatch.
 * Deducts inventory reservations → sets dispatch to 'in_transit',
 * order to 'dispatched'.
 */
async function executeDispatch(dispatchId, whManagerId) {
  return withTransaction(async (client) => {
    const dispResult = await client.query(
      'SELECT * FROM dispatches WHERE id = $1 FOR UPDATE', [dispatchId]
    );
    if (dispResult.rows.length === 0)
      throw Object.assign(new Error('Dispatch not found'), { statusCode: 404 });

    const dispatch = dispResult.rows[0];
    if (dispatch.status !== 'pending_dispatch') {
      throw Object.assign(
        new Error(`Dispatch is not pending execution. Current status: ${dispatch.status}`),
        { statusCode: 422, code: 'INVALID_TRANSITION' }
      );
    }

    // Get inventory reservations for the order
    const reservations = await client.query(
      `SELECT ir.*, oi.id AS order_item_id FROM inventory_reservations ir
       JOIN order_items oi ON oi.order_id = ir.order_id AND oi.product_id = ir.product_id
       WHERE ir.order_id = $1 AND ir.committed = FALSE`,
      [dispatch.order_id]
    );

    // Create dispatch items from reservations
    for (const res of reservations.rows) {
      await client.query(
        'INSERT INTO dispatch_items (dispatch_id, order_item_id, batch_id, product_id, quantity) VALUES ($1,$2,$3,$4,$5)',
        [dispatch.id, res.order_item_id, res.batch_id, res.product_id, res.quantity]
      );
    }

    // Deduct inventory
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

    // Update dispatch to in_transit
    await client.query(
      `UPDATE dispatches
       SET status = 'in_transit', dispatched_at = NOW(), executed_by = $1, executed_at = NOW()
       WHERE id = $2`,
      [whManagerId, dispatchId]
    );

    // Update order to dispatched
    await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', ['dispatched', dispatch.order_id]);
    await client.query(
      'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
      [dispatch.order_id, 'processing', 'dispatched', whManagerId, `Executed by warehouse manager via ${dispatch.vehicle_number || 'vehicle'}`]
    );

    // Notify admin of execution
    const admins = await client.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'admin' AND u.status = 'active'`
    );
    for (const admin of admins.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'order_confirmed', $2, $3, $4)`,
        [
          admin.id,
          `Dispatch Executed: ${dispatch.dispatch_number}`,
          `Dispatch ${dispatch.dispatch_number} has been executed by warehouse. Now in transit.`,
          JSON.stringify({ dispatch_id: dispatch.id }),
        ]
      );
    }

    return { ...dispatch, status: 'in_transit' };
  });
}

/** @deprecated Use createDispatch + executeDispatch instead */
async function pickOrder(orderId, userId) {
  return changeOrderStatus(orderId, 'processing', userId, 'Picked for dispatch');
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

module.exports = {
  listGRN, createGRN, getGRN,
  listPendingGRNs, approveGRN,
  pickOrder,
  createDispatch, executeDispatch,
  listDispatches, getDispatch, markDelivered,
  listWarehouses,
};
