'use strict';

const { query } = require('../../config/database');

async function listRetailers() {
  const result = await query(`
    SELECT
      b.id AS business_id,
      b.name AS business_name,
      b.type,
      b.gstin,
      b.phone,
      b.email,
      b.credit_limit,
      b.address,
      b.is_active,
      b.created_at,
      -- Credit summary
      COALESCE(SUM(CASE WHEN cl.type = 'debit' THEN cl.amount ELSE 0 END), 0)  AS total_debits,
      COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE 0 END), 0) AS total_credits,
      COALESCE(SUM(CASE WHEN cl.type = 'debit' THEN cl.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE 0 END), 0) AS current_balance,
      b.credit_limit - (
        COALESCE(SUM(CASE WHEN cl.type = 'debit' THEN cl.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE 0 END), 0)
      ) AS available_credit,
      -- Order counts
      COUNT(DISTINCT o.id) AS total_orders,
      COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) AS pending_orders,
      COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) AS delivered_orders
    FROM businesses b
    LEFT JOIN credit_ledger cl ON cl.business_id = b.id
    LEFT JOIN orders o ON o.business_id = b.id
    WHERE b.type IN ('retailer', 'distributor')
    GROUP BY b.id
    ORDER BY b.name
  `);
  return result.rows;
}

async function getRetailerDetail(businessId) {
  // Profile
  const profileRes = await query(
    `SELECT b.*,
            u.first_name, u.last_name,
            u.email   AS user_email,
            u.phone   AS user_phone
     FROM businesses b
     LEFT JOIN users u ON u.business_id = b.id
     WHERE b.id = $1
     LIMIT 1`,
    [businessId]
  );

  // Balance
  const balRes = await query(
    `SELECT
       b.credit_limit,
       COALESCE(SUM(CASE WHEN cl.type='debit' THEN cl.amount ELSE 0 END),0) AS total_debits,
       COALESCE(SUM(CASE WHEN cl.type='credit' THEN cl.amount ELSE 0 END),0) AS total_credits,
       COALESCE(SUM(CASE WHEN cl.type='debit' THEN cl.amount ELSE 0 END),0)
         - COALESCE(SUM(CASE WHEN cl.type='credit' THEN cl.amount ELSE 0 END),0) AS current_balance
     FROM businesses b
     LEFT JOIN credit_ledger cl ON cl.business_id = b.id
     WHERE b.id = $1
     GROUP BY b.id`,
    [businessId]
  );

  // Recent orders
  const ordersRes = await query(
    `SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at,
            COUNT(oi.id) AS item_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.business_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT 10`,
    [businessId]
  );

  // Invoices — uses generated_at, not created_at
  const invoicesRes = await query(
    `SELECT id, invoice_number, total_amount, paid_amount, due_date, is_void, generated_at AS created_at
     FROM invoices
     WHERE business_id = $1
     ORDER BY generated_at DESC
     LIMIT 8`,
    [businessId]
  );

  // Ledger
  const ledgerRes = await query(
    `SELECT id, type, amount, description, reference_type, created_at
     FROM credit_ledger
     WHERE business_id = $1
     ORDER BY created_at DESC
     LIMIT 15`,
    [businessId]
  );

  return {
    profile: profileRes.rows[0] || null,
    balance: balRes.rows[0] || null,
    orders: ordersRes.rows,
    invoices: invoicesRes.rows,
    ledger: ledgerRes.rows,
  };
}

module.exports = { listRetailers, getRetailerDetail };
