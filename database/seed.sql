-- ============================================================
--  FDMS — Seed Data
--  Demo users, products, inventory, orders
-- ============================================================

-- Roles
INSERT INTO roles (id, name, description, permissions) VALUES
  ('11111111-0000-0000-0000-000000000001', 'admin', 'Full system access', '{
    "users": ["read","write","delete"],
    "products": ["read","write","delete"],
    "inventory": ["read","write","adjust"],
    "orders": ["read","write","cancel","confirm","dispatch"],
    "finance": ["read","write"],
    "reports": ["read"],
    "audit_logs": ["read"]
  }'::jsonb),
  ('11111111-0000-0000-0000-000000000002', 'retailer', 'Place and track own orders', '{
    "products": ["read"],
    "orders": ["read","write"],
    "finance": ["read_own"]
  }'::jsonb),
  ('11111111-0000-0000-0000-000000000003', 'warehouse_manager', 'Manage inventory and fulfillment', '{
    "inventory": ["read","write","adjust"],
    "orders": ["read","process","dispatch"],
    "warehouse": ["read","write"]
  }'::jsonb),
  ('11111111-0000-0000-0000-000000000004', 'sales_executive', 'Manage retailer accounts and orders', '{
    "products": ["read","write_pricing"],
    "orders": ["read","write","confirm"],
    "businesses": ["read","write"],
    "finance": ["read"]
  }'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Businesses
INSERT INTO businesses (id, name, type, gstin, address, phone, email, credit_limit) VALUES
  ('22222222-0000-0000-0000-000000000001', 'FDMS Internal', 'manufacturer', NULL,
   '{"street":"123 HQ Road","city":"Hyderabad","state":"Telangana","pin":"500001"}'::jsonb,
   '040-12345678', 'admin@fdms.com', 0),
  ('22222222-0000-0000-0000-000000000002', 'GreenFields Agro', 'retailer', '36AABCG1234A1Z5',
   '{"street":"456 Farm Road","city":"Warangal","state":"Telangana","pin":"506001"}'::jsonb,
   '9876543210', 'retailer@fdms.com', 500000),
  ('22222222-0000-0000-0000-000000000003', 'Sunshine Distributors', 'distributor', '36AABCS5678B2Z3',
   '{"street":"789 Market Street","city":"Nizamabad","state":"Telangana","pin":"503001"}'::jsonb,
   '9765432109', 'sunshine@fdms.com', 750000)
ON CONFLICT DO NOTHING;

-- Users (passwords: Admin@123, Retail@123, Warehouse@123, Sales@123 — bcrypt hashed)
INSERT INTO users (id, business_id, email, password_hash, first_name, last_name, phone) VALUES
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   'admin@fdms.com', crypt('Admin@123', gen_salt('bf', 12)), 'Rajan', 'Sharma', '9000000001'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'retailer@fdms.com', crypt('Retail@123', gen_salt('bf', 12)), 'Priya', 'Reddy', '9000000002'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001',
   'warehouse@fdms.com', crypt('Warehouse@123', gen_salt('bf', 12)), 'Kiran', 'Kumar', '9000000003'),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001',
   'sales@fdms.com', crypt('Sales@123', gen_salt('bf', 12)), 'Arjun', 'Patel', '9000000004')
ON CONFLICT (email) DO NOTHING;

-- User Roles
INSERT INTO user_roles (user_id, role_id) VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003'),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- Product Categories
INSERT INTO product_categories (id, name, description) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Nitrogen Fertilizers', 'N-based fertilizers'),
  ('44444444-0000-0000-0000-000000000002', 'Phosphate Fertilizers', 'P-based fertilizers'),
  ('44444444-0000-0000-0000-000000000003', 'Potash Fertilizers', 'K-based fertilizers'),
  ('44444444-0000-0000-0000-000000000004', 'Complex Fertilizers', 'NPK combinations'),
  ('44444444-0000-0000-0000-000000000005', 'Bio Fertilizers', 'Organic / bio-based')
ON CONFLICT DO NOTHING;

-- Products
INSERT INTO products (id, sku, name, description, category_id, unit, gst_rate, low_stock_threshold) VALUES
  ('55555555-0000-0000-0000-000000000001', 'UREA-46', 'Urea (46% N)', 'Granular urea fertilizer 46% nitrogen content', '44444444-0000-0000-0000-000000000001', 'bag', 0, 500),
  ('55555555-0000-0000-0000-000000000002', 'DAP-18-46', 'DAP (18-46-0)', 'Di-ammonium phosphate', '44444444-0000-0000-0000-000000000002', 'bag', 0, 300),
  ('55555555-0000-0000-0000-000000000003', 'MOP-60', 'MOP (0-0-60)', 'Muriate of Potash 60% K2O', '44444444-0000-0000-0000-000000000003', 'bag', 0, 200),
  ('55555555-0000-0000-0000-000000000004', 'NPK-10-26-26', 'NPK 10:26:26', 'Complex NPK fertilizer', '44444444-0000-0000-0000-000000000004', 'bag', 0, 250),
  ('55555555-0000-0000-0000-000000000005', 'NPK-20-20-00', 'NPK 20:20:00', 'Nitrogen-Phosphate complex', '44444444-0000-0000-0000-000000000004', 'bag', 0, 200),
  ('55555555-0000-0000-0000-000000000006', 'RHIZO-BIO', 'Rhizobium Bio Fertilizer', 'Nitrogen-fixing rhizobium culture', '44444444-0000-0000-0000-000000000005', 'kg', 5, 100)
ON CONFLICT (sku) DO NOTHING;

-- Product Pricing (standard)
INSERT INTO product_pricing (product_id, pricing_type, price_per_unit, valid_from) VALUES
  ('55555555-0000-0000-0000-000000000001', 'standard', 290.00, CURRENT_DATE),
  ('55555555-0000-0000-0000-000000000002', 'standard', 1350.00, CURRENT_DATE),
  ('55555555-0000-0000-0000-000000000003', 'standard', 1100.00, CURRENT_DATE),
  ('55555555-0000-0000-0000-000000000004', 'standard', 1200.00, CURRENT_DATE),
  ('55555555-0000-0000-0000-000000000005', 'standard', 1250.00, CURRENT_DATE),
  ('55555555-0000-0000-0000-000000000006', 'standard', 85.00, CURRENT_DATE);

-- Tiered pricing for Urea (volume discount)
INSERT INTO product_pricing (product_id, pricing_type, min_quantity, max_quantity, price_per_unit, discount_pct, valid_from) VALUES
  ('55555555-0000-0000-0000-000000000001', 'tiered', 100, 499, 280.00, 3.5, CURRENT_DATE),
  ('55555555-0000-0000-0000-000000000001', 'tiered', 500, NULL, 270.00, 6.9, CURRENT_DATE);

-- Warehouse
INSERT INTO warehouses (id, name, code, address, manager_id) VALUES
  ('66666666-0000-0000-0000-000000000001', 'Hyderabad Central Warehouse', 'HYD-WH-01',
   '{"street":"Industrial Area, Phase 2","city":"Hyderabad","state":"Telangana","pin":"500018"}'::jsonb,
   '33333333-0000-0000-0000-000000000003'),
  ('66666666-0000-0000-0000-000000000002', 'Warangal Regional Store', 'WGL-WH-01',
   '{"street":"NH 163, Kazipet","city":"Warangal","state":"Telangana","pin":"506003"}'::jsonb,
   '33333333-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- Warehouse Bins
INSERT INTO warehouse_bins (warehouse_id, bin_code, zone, capacity) VALUES
  ('66666666-0000-0000-0000-000000000001', 'A-01', 'A', 5000),
  ('66666666-0000-0000-0000-000000000001', 'A-02', 'A', 5000),
  ('66666666-0000-0000-0000-000000000001', 'B-01', 'B', 3000),
  ('66666666-0000-0000-0000-000000000002', 'A-01', 'A', 2000),
  ('66666666-0000-0000-0000-000000000002', 'A-02', 'A', 2000);

-- GRN
INSERT INTO goods_receipt_notes (id, grn_number, warehouse_id, supplier_name, invoice_number, received_by, status, completed_at) VALUES
  ('77777777-0000-0000-0000-000000000001', 'GRN-001001', '66666666-0000-0000-0000-000000000001',
   'National Fertilizers Ltd', 'NFL-2024-8821', '33333333-0000-0000-0000-000000000003', 'completed', NOW()),
  ('77777777-0000-0000-0000-000000000002', 'GRN-001002', '66666666-0000-0000-0000-000000000001',
   'IFFCO', 'IFFCO-2024-4412', '33333333-0000-0000-0000-000000000003', 'completed', NOW())
ON CONFLICT DO NOTHING;

-- Inventory Batches (FEFO-sortable via expiry_date)
INSERT INTO inventory_batches (id, product_id, warehouse_id, grn_id, batch_number, quantity, received_qty, cost_per_unit, expiry_date, manufacture_date) VALUES
  -- Urea batches (two batches for FEFO testing)
  ('88888888-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'UREA-B2024-001', 1200, 1200, 265.00, '2025-03-31', '2024-04-01'),
  ('88888888-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000002', 'UREA-B2024-002', 800, 800, 268.00, '2025-09-30', '2024-09-01'),
  -- DAP batch
  ('88888888-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'DAP-B2024-001', 650, 650, 1280.00, '2025-12-31', '2024-01-01'),
  -- MOP batch
  ('88888888-0000-0000-0000-000000000004', '55555555-0000-0000-0000-000000000003', '66666666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000002', 'MOP-B2024-001', 420, 420, 1040.00, '2025-12-31', '2024-02-01'),
  -- NPK batches
  ('88888888-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000004', '66666666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'NPK1026-B2024-001', 380, 380, 1130.00, '2025-10-31', '2024-03-01'),
  ('88888888-0000-0000-0000-000000000006', '55555555-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000002', 'RHIZO-B2024-001', 250, 250, 72.00, '2025-06-30', '2024-06-01')
ON CONFLICT DO NOTHING;

-- Credit Ledger (initial credit for GreenFields)
INSERT INTO credit_ledger (business_id, type, amount, reference_type, description, created_by) VALUES
  ('22222222-0000-0000-0000-000000000002', 'credit', 200000.00, 'payment', 'Opening balance / advance payment', '33333333-0000-0000-0000-000000000001');

-- Sample Order (delivered)
INSERT INTO orders (id, order_number, business_id, placed_by, warehouse_id, status, subtotal, tax_amount, total_amount, delivery_address) VALUES
  ('99999999-0000-0000-0000-000000000001', 'ORD-001001', '22222222-0000-0000-0000-000000000002',
   '33333333-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', 'delivered',
   87000.00, 0, 87000.00,
   '{"street":"456 Farm Road","city":"Warangal","state":"Telangana","pin":"506001"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, tax_rate, line_total) VALUES
  ('99999999-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 200, 290.00, 0, 58000.00),
  ('99999999-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002',  20, 1350.00, 0, 27000.00);

-- Status history for the delivered order
INSERT INTO order_status_history (order_id, from_status, to_status, changed_by) VALUES
  ('99999999-0000-0000-0000-000000000001', NULL, 'pending', '33333333-0000-0000-0000-000000000002'),
  ('99999999-0000-0000-0000-000000000001', 'pending', 'confirmed', '33333333-0000-0000-0000-000000000004'),
  ('99999999-0000-0000-0000-000000000001', 'confirmed', 'processing', '33333333-0000-0000-0000-000000000003'),
  ('99999999-0000-0000-0000-000000000001', 'processing', 'dispatched', '33333333-0000-0000-0000-000000000003'),
  ('99999999-0000-0000-0000-000000000001', 'dispatched', 'delivered', '33333333-0000-0000-0000-000000000003');

-- Invoice for the delivered order
INSERT INTO invoices (invoice_number, order_id, business_id, subtotal, total_amount, paid_amount, due_date, generated_by) VALUES
  ('INV-005001', '99999999-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
   87000.00, 87000.00, 87000.00, CURRENT_DATE + 30, '33333333-0000-0000-0000-000000000001');

-- Debit ledger entry for the order
INSERT INTO credit_ledger (business_id, type, amount, reference_id, reference_type, description, created_by) VALUES
  ('22222222-0000-0000-0000-000000000002', 'debit', 87000.00, '99999999-0000-0000-0000-000000000001', 'order', 'Order ORD-001001 — 200 bags Urea + 20 bags DAP', '33333333-0000-0000-0000-000000000001');
