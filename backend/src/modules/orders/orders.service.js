'use strict';

/**
 * Orders Service — State Machine + Stock Reservation
 *
 * Valid transitions:
 *   pending    → confirmed | cancelled
 *   confirmed  → processing | cancelled
 *   processing → dispatched
 *   dispatched → delivered
 */

const { query, withTransaction } = require('../../config/database');
const { parsePagination } = require('../../utils/pagination');
const { resolvePrice } = require('../products/products.service');
const { reserveStock, releaseReservation } = require('../inventory/inventory.service');
const { debitBusiness, creditBusiness } = require('../finance/finance.service');
const logger = require('../../utils/logger');

const VALID_TRANSITIONS = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled'],
  processing: ['dispatched'],
  dispatched: ['delivered'],
  delivered:  [],
  cancelled:  [],
};

// ── List / Get ────────────────────────────────────────────────

async function listOrders({ businessId, status, search, year, month }, userRoles, userBusinessId, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = [];
  const params = [];
  let idx = 1;

  // Staff roles can see all orders (optionally filtered by businessId query param)
  const isStaff = ['admin', 'sales_executive', 'warehouse_manager'].some(r => userRoles.includes(r));

  if (!isStaff) {
    // Non-staff (retailers, unassigned): ALWAYS scope to their own business
    conditions.push(`o.business_id = $${idx++}`);
    params.push(userBusinessId);
  } else if (businessId) {
    // Staff filtering by a specific business
    conditions.push(`o.business_id = $${idx++}`);
    params.push(businessId);
  }

  if (status) { conditions.push(`o.status = $${idx++}`); params.push(status); }
  if (search) { conditions.push(`o.order_number ILIKE $${idx++}`); params.push(`%${search}%`); }
  if (year)  { conditions.push(`EXTRACT(YEAR  FROM o.created_at) = $${idx++}`); params.push(parseInt(year)); }
  if (month) { conditions.push(`EXTRACT(MONTH FROM o.created_at) = $${idx++}`); params.push(parseInt(month)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM orders o
     LEFT JOIN businesses b ON b.id = o.business_id
     ${where}`, params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT o.*,
            b.name AS business_name,
            u.first_name || ' ' || u.last_name AS placed_by_name,
            w.name AS warehouse_name,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o
     JOIN businesses b ON b.id = o.business_id
     JOIN users u ON u.id = o.placed_by
     LEFT JOIN warehouses w ON w.id = o.warehouse_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return { data: result.rows, total };
}

async function getOrderById(id) {
  const orderResult = await query(
    `SELECT o.*,
            b.name AS business_name,
            u.first_name || ' ' || u.last_name AS placed_by_name,
            w.name AS warehouse_name
     FROM orders o
     JOIN businesses b ON b.id = o.business_id
     JOIN users u ON u.id = o.placed_by
     LEFT JOIN warehouses w ON w.id = o.warehouse_id
     WHERE o.id = $1`,
    [id]
  );
  if (orderResult.rows.length === 0) return null;

  const order = orderResult.rows[0];

  const itemsResult = await query(
    `SELECT oi.*, p.name AS product_name, p.sku, p.unit FROM order_items oi
     JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
    [id]
  );
  order.items = itemsResult.rows;

  const historyResult = await query(
    `SELECT osh.*, u.first_name || ' ' || u.last_name AS changed_by_name
     FROM order_status_history osh
     JOIN users u ON u.id = osh.changed_by
     WHERE osh.order_id = $1 ORDER BY osh.changed_at`,
    [id]
  );
  order.statusHistory = historyResult.rows;

  return order;
}

// ── Create Order ──────────────────────────────────────────────

async function createOrder(data, user) {
  const { businessId, warehouseId, items, notes, deliveryAddress, expectedDeliveryDate } = data;

  return withTransaction(async (client) => {
    // Resolve prices and compute totals
    let subtotal = 0;
    const resolvedItems = [];

    for (const item of items) {
      const pricing = await resolvePrice(item.productId, businessId, item.quantity);
      if (!pricing) {
        const err = new Error(`No pricing found for product ${item.productId}`);
        err.statusCode = 400; err.code = 'NO_PRICING'; throw err;
      }

      const lineTotal = parseFloat(item.quantity) * pricing.effectivePrice;
      subtotal += lineTotal;

      resolvedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: pricing.pricePerUnit,
        discountPct: pricing.discountPct,
        lineTotal,
      });
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, business_id, placed_by, warehouse_id, status, subtotal, total_amount, notes, delivery_address, expected_delivery_date)
       VALUES ('', $1, $2, $3, 'pending', $4, $4, $5, $6, $7) RETURNING *`,
      [businessId, user.id, warehouseId || null, subtotal, notes || null,
       deliveryAddress ? JSON.stringify(deliveryAddress) : null, expectedDeliveryDate || null]
    );
    const order = orderResult.rows[0];

    // Insert order items
    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_pct, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.productId, item.quantity, item.unitPrice, item.discountPct, item.lineTotal]
      );
    }

    // Record status history
    await client.query(
      'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by) VALUES ($1, NULL, $2, $3)',
      [order.id, 'pending', user.id]
    );

    return order;
  });
}

// ── Status Transition ─────────────────────────────────────────

async function changeOrderStatus(orderId, toStatus, userId, notes) {
  return withTransaction(async (client) => {
    const result = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (result.rows.length === 0) {
      const err = new Error('Order not found'); err.statusCode = 404; throw err;
    }

    const order = result.rows[0];
    const fromStatus = order.status;
    const allowed = VALID_TRANSITIONS[fromStatus] || [];

    if (!allowed.includes(toStatus)) {
      const err = new Error(`Cannot transition from '${fromStatus}' to '${toStatus}'`);
      err.statusCode = 422; err.code = 'INVALID_TRANSITION'; throw err;
    }

    // Side effects per transition
    if (toStatus === 'confirmed') {
      // Reserve inventory
      const items = (await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]
      )).rows;

      const warehouseId = order.warehouse_id;
      if (!warehouseId) {
        const err = new Error('Order must have a warehouse assigned before confirmation');
        err.statusCode = 400; err.code = 'NO_WAREHOUSE'; throw err;
      }

      await reserveStock(
        orderId,
        items.map((i) => ({ productId: i.product_id, warehouseId, quantity: i.quantity })),
        client
      );

      // Debit the business credit ledger
      await debitBusiness(
        order.business_id,
        order.total_amount,
        orderId,
        'order',
        `Order ${order.order_number} confirmed`,
        userId,
        client
      );
    }

    if (toStatus === 'cancelled') {
      // Release any reservations
      await releaseReservation(orderId);
      // Credit back the amount if it was debited
      if (['confirmed', 'processing'].includes(fromStatus)) {
        await creditBusiness(
          order.business_id,
          order.total_amount,
          orderId,
          'order',
          `Order ${order.order_number} cancelled — credit restored`,
          userId,
          client
        );
      }
    }

    // Update order status
    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [toStatus, orderId]
    );

    // Record history
    await client.query(
      'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
      [orderId, fromStatus, toStatus, userId, notes || null]
    );

    logger.info(`Order ${orderId} status: ${fromStatus} → ${toStatus}`, { userId });
    return { ...order, status: toStatus };
  });
}

async function getStatusHistory(orderId) {
  const result = await query(
    `SELECT osh.*, u.first_name || ' ' || u.last_name AS changed_by_name
     FROM order_status_history osh
     JOIN users u ON u.id = osh.changed_by
     WHERE osh.order_id = $1 ORDER BY osh.changed_at`,
    [orderId]
  );
  return result.rows;
}

async function assignWarehouse(orderId, warehouseId) {
  const result = await query(
    `UPDATE orders SET warehouse_id = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'pending' RETURNING *`,
    [warehouseId, orderId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Order not found or is not in pending status');
    err.statusCode = 422; err.code = 'INVALID_STATE'; throw err;
  }
  return result.rows[0];
}

module.exports = { listOrders, getOrderById, createOrder, changeOrderStatus, assignWarehouse, getStatusHistory };
