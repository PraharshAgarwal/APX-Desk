'use strict';

/**
 * Finance Service — Ledger Model
 *
 * RULES:
 *  - No direct balance column. Balance = SUM(credits) - SUM(debits)
 *  - credit_ledger is append-only (enforced by DB trigger)
 *  - Every financial event creates a ledger entry
 */

const { query, withTransaction } = require('../../config/database');
const { parsePagination } = require('../../utils/pagination');

// ── Ledger Operations ─────────────────────────────────────────

/**
 * Create a DEBIT entry (business owes money — e.g., order placed).
 */
async function debitBusiness(businessId, amount, referenceId, referenceType, description, userId, client = null) {
  const run = client || query;
  const fn = client ? (sql, p) => client.query(sql, p) : query;

  await fn(
    `INSERT INTO credit_ledger (business_id, type, amount, reference_id, reference_type, description, created_by)
     VALUES ($1, 'debit', $2, $3, $4, $5, $6)`,
    [businessId, amount, referenceId || null, referenceType || null, description, userId]
  );
}

/**
 * Create a CREDIT entry (business pays money — e.g., payment received).
 */
async function creditBusiness(businessId, amount, referenceId, referenceType, description, userId, client = null) {
  const fn = client ? (sql, p) => client.query(sql, p) : query;

  await fn(
    `INSERT INTO credit_ledger (business_id, type, amount, reference_id, reference_type, description, created_by)
     VALUES ($1, 'credit', $2, $3, $4, $5, $6)`,
    [businessId, amount, referenceId || null, referenceType || null, description, userId]
  );
}

/**
 * Get computed balance for a business.
 */
async function getBusinessBalance(businessId) {
  const result = await query(
    'SELECT * FROM v_business_balance WHERE business_id = $1',
    [businessId]
  );
  return result.rows[0] || null;
}

/**
 * Check if a business has sufficient credit for an amount.
 */
async function checkCreditLimit(businessId, amount) {
  const balance = await getBusinessBalance(businessId);
  if (!balance) return { allowed: false, reason: 'Business not found' };

  const { credit_limit, current_balance } = balance;
  const availableCredit = parseFloat(credit_limit) - parseFloat(current_balance);

  if (availableCredit < parseFloat(amount)) {
    return { allowed: false, reason: `Credit limit exceeded. Available: ₹${availableCredit.toFixed(2)}`, availableCredit };
  }

  return { allowed: true, availableCredit };
}

// ── Ledger Queries ────────────────────────────────────────────

async function getLedger(businessId, pagination) {
  const { limit, offset } = parsePagination(pagination);

  const countResult = await query(
    'SELECT COUNT(*) FROM credit_ledger WHERE business_id = $1',
    [businessId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT cl.*, u.first_name || ' ' || u.last_name AS created_by_name
     FROM credit_ledger cl
     LEFT JOIN users u ON u.id = cl.created_by
     WHERE cl.business_id = $1
     ORDER BY cl.created_at DESC
     LIMIT $2 OFFSET $3`,
    [businessId, limit, offset]
  );

  return { data: result.rows, total };
}

async function getAllBalances() {
  const result = await query('SELECT * FROM v_business_balance ORDER BY business_name');
  return result.rows;
}

// ── Payments ──────────────────────────────────────────────────

async function recordPayment(data, userId) {
  const { businessId, invoiceId, amount, method, reference, notes, paymentDate } = data;

  return withTransaction(async (client) => {
    // Generate unique payment number inside the transaction
    const numRes = await client.query(
      `SELECT 'PAY-' || LPAD(nextval('payment_number_seq')::TEXT, 6, '0') AS num`
    );
    const paymentNumber = numRes.rows[0].num;

    // Insert payment record
    const payResult = await client.query(
      `INSERT INTO payments (payment_number, business_id, invoice_id, amount, method, reference, notes, recorded_by, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [paymentNumber, businessId, invoiceId || null, amount, method, reference || null, notes || null, userId, paymentDate || new Date()]
    );
    const payment = payResult.rows[0];

    // Credit the ledger
    await creditBusiness(
      businessId, amount, payment.id, 'payment',
      `Payment received — ${method}${reference ? ` (Ref: ${reference})` : ''}`,
      userId, client
    );

    // Update invoice paid_amount if linked
    if (invoiceId) {
      await client.query(
        'UPDATE invoices SET paid_amount = paid_amount + $1 WHERE id = $2',
        [amount, invoiceId]
      );
    }

    return payment;
  });
}

async function listPayments({ businessId }, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = [];
  const params = [];
  let idx = 1;

  if (businessId) { conditions.push(`p.business_id = $${idx++}`); params.push(businessId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT p.*, b.name AS business_name, u.first_name || ' ' || u.last_name AS recorded_by_name
     FROM payments p
     JOIN businesses b ON b.id = p.business_id
     JOIN users u ON u.id = p.recorded_by
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
}

// ── Credit Limits ─────────────────────────────────────────────

async function updateCreditLimit(businessId, creditLimit, userId) {
  const result = await query(
    'UPDATE businesses SET credit_limit = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, credit_limit',
    [creditLimit, businessId]
  );
  return result.rows[0];
}

// ── Invoices ──────────────────────────────────────────────────

async function generateInvoice(orderId, userId) {
  return withTransaction(async (client) => {
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1', [orderId]
    );
    if (orderResult.rows.length === 0) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    const order = orderResult.rows[0];

    // Check no existing invoice
    const existing = await client.query('SELECT id FROM invoices WHERE order_id = $1', [orderId]);
    if (existing.rows.length > 0) throw Object.assign(new Error('Invoice already generated'), { statusCode: 409 });

    const result = await client.query(
      `INSERT INTO invoices (invoice_number, order_id, business_id, subtotal, tax_amount, discount_amount, total_amount, due_date, generated_by)
       VALUES ('', $1, $2, $3, $4, $5, $6, CURRENT_DATE + 30, $7) RETURNING *`,
      [orderId, order.business_id, order.subtotal, order.tax_amount, order.discount_amount, order.total_amount, userId]
    );
    return result.rows[0];
  });
}

async function listInvoices({ businessId }, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = [];
  const params = [];
  let idx = 1;

  if (businessId) { conditions.push(`i.business_id = $${idx++}`); params.push(businessId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT i.*, b.name AS business_name, o.order_number
     FROM invoices i
     JOIN businesses b ON b.id = i.business_id
     JOIN orders o ON o.id = i.order_id
     ${where}
     ORDER BY i.generated_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return result.rows;
}

module.exports = {
  debitBusiness, creditBusiness, getBusinessBalance, checkCreditLimit,
  getLedger, getAllBalances,
  recordPayment, listPayments,
  updateCreditLimit,
  generateInvoice, listInvoices,
};
