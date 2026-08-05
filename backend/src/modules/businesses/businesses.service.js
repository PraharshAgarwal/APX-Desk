'use strict';

const { query } = require('../../config/database');

async function listRetailers(search) {
  const params = [];
  const whereExtra = search
    ? ` AND (b.name ILIKE $1 OR b.phone ILIKE $1 OR b.gstin ILIKE $1)` : '';
  if (search) params.push(`%${search}%`);

  const result = await query(`
    SELECT
      b.id,
      b.name,
      b.type,
      b.gstin,
      b.phone,
      b.email,
      b.district,
      b.alternate_phone,
      b.pan_number,
      b.imfs_id_wholesaler,
      b.imfs_id_retailer,
      b.assigned_sales_executive_id,
      COALESCE(b.address->>'city', '') AS city,
      b.credit_limit,
      b.address,
      b.is_active,
      b.created_at,
      -- Assigned sales exec name
      CONCAT(se.first_name, ' ', se.last_name) AS assigned_exec_name,
      -- Credit summary
      COALESCE(SUM(CASE WHEN cl.type = 'debit' THEN cl.amount ELSE 0 END), 0)  AS total_debits,
      COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE 0 END), 0) AS total_credits,
      COALESCE(SUM(CASE WHEN cl.type = 'debit' THEN cl.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE 0 END), 0) AS current_balance,
      COALESCE(b.credit_limit, 0) - (
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
    LEFT JOIN users se ON se.id = b.assigned_sales_executive_id
    WHERE b.type IN ('retailer', 'distributor')${whereExtra}
    GROUP BY b.id, se.first_name, se.last_name
    ORDER BY b.name
  `, params);
  return result.rows;
}

async function getRetailerDetail(businessId) {
  // Full profile (b.* includes all new columns)
  const profileRes = await query(
    `SELECT b.*,
            u.first_name, u.last_name,
            u.email   AS user_email,
            u.phone   AS user_phone,
            CONCAT(se.first_name, ' ', se.last_name) AS assigned_exec_name,
            se.email  AS assigned_exec_email,
            se.phone  AS assigned_exec_phone
     FROM businesses b
     LEFT JOIN users u ON u.business_id = b.id AND u.status = 'active'
     LEFT JOIN users se ON se.id = b.assigned_sales_executive_id
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

  // Invoices
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
    profile:  profileRes.rows[0] || null,
    balance:  balRes.rows[0] || null,
    orders:   ordersRes.rows,
    invoices: invoicesRes.rows,
    ledger:   ledgerRes.rows,
  };
}

async function updateProfile(businessId, payload) {
  // Whitelist of allowed columns
  const SCALAR = [
    'name', 'phone', 'alternate_phone', 'email', 'district', 'gstin',
    'pan_number', 'imfs_id_wholesaler', 'imfs_id_retailer',
    'security_bank_name', 'security_cheque_dd_no', 'security_rtgs_utr',
    'security_deposit_date', 'blank_cheque_bank', 'blank_cheque_no1', 'blank_cheque_no2',
    'assigned_sales_executive_id', 'is_active',
    'security_amount',
  ];
  const JSONB_MERGE = ['turnover', 'fertilizer_licence', 'pesticide_licence', 'seed_licence', 'business_estimate', 'address'];

  const sets = [];
  const params = [businessId];
  let idx = 2;

  for (const col of SCALAR) {
    if (payload[col] !== undefined) {
      sets.push(`${col} = $${idx++}`);
      params.push(payload[col] === '' ? null : payload[col]);
    }
  }

  // Auto-derive credit_limit = 5 × security_amount whenever deposit is provided
  if (payload.security_amount != null && payload.security_amount !== '') {
    const creditLimit = Number(payload.security_amount) * 5;
    sets.push(`credit_limit = $${idx++}`);
    params.push(creditLimit);
  }

  // JSONB columns: merge with existing data
  for (const col of JSONB_MERGE) {
    if (payload[col] !== undefined && typeof payload[col] === 'object') {
      sets.push(`${col} = COALESCE(${col}, '{}') || $${idx++}::jsonb`);
      params.push(JSON.stringify(payload[col]));
    }
  }

  if (sets.length === 0) throw new Error('No valid fields to update');

  sets.push('updated_at = NOW()');

  const result = await query(
    `UPDATE businesses SET ${sets.join(', ')} WHERE id = $1 RETURNING id`,
    params
  );
  return result.rows[0];
}


async function listSalesExecutives() {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'sales_executive' AND u.status = 'active'
     ORDER BY u.first_name`,
    []
  );
  return result.rows;
}

module.exports = { listRetailers, getRetailerDetail, updateProfile, listSalesExecutives };
