-- ============================================================
--  FDMS — PostgreSQL Database Schema
--  Fertilizer Distribution Management System
--  Version: 1.0.0
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE business_type AS ENUM ('retailer', 'distributor', 'manufacturer');
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'
);
CREATE TYPE adjustment_reason AS ENUM (
  'damage', 'expiry', 'return', 'transfer', 'correction', 'theft'
);
CREATE TYPE ledger_type AS ENUM ('credit', 'debit');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'upi', 'cheque', 'credit');
CREATE TYPE notification_type AS ENUM (
  'order_placed', 'order_confirmed', 'order_dispatched', 'order_delivered',
  'payment_received', 'low_stock', 'expiry_warning', 'credit_limit_warning'
);
CREATE TYPE pricing_type AS ENUM ('standard', 'tiered', 'customer_specific', 'promotional');
CREATE TYPE grn_status AS ENUM ('draft', 'completed', 'cancelled');
CREATE TYPE dispatch_status AS ENUM ('pending', 'in_transit', 'delivered', 'returned');

-- ============================================================
-- ROLES & USERS
-- ============================================================

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) UNIQUE NOT NULL,  -- 'admin', 'retailer', 'warehouse_manager', 'sales_executive'
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',  -- feature-level permission map
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE businesses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  type            business_type NOT NULL DEFAULT 'retailer',
  gstin           VARCHAR(15) UNIQUE,
  pan             VARCHAR(10),
  address         JSONB,                    -- { street, city, state, pin, country }
  phone           VARCHAR(15),
  email           VARCHAR(100),
  credit_limit    NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  onboarded_by    UUID,                     -- references users.id (sales exec)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID REFERENCES businesses(id) ON DELETE SET NULL,
  email           VARCHAR(100) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  first_name      VARCHAR(50) NOT NULL,
  last_name       VARCHAR(50) NOT NULL,
  phone           VARCHAR(15),
  status          user_status NOT NULL DEFAULT 'active',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS & PRICING
-- ============================================================

CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES product_categories(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category_id     UUID REFERENCES product_categories(id),
  unit            VARCHAR(20) NOT NULL DEFAULT 'kg',  -- kg, litre, bag, ton
  weight_per_unit NUMERIC(10,3),                       -- for shipping calculations
  hsn_code        VARCHAR(8),
  gst_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  low_stock_threshold INTEGER NOT NULL DEFAULT 100,
  image_url       TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_pricing (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pricing_type    pricing_type NOT NULL DEFAULT 'standard',
  business_id     UUID REFERENCES businesses(id),   -- NULL = applies to all
  min_quantity    INTEGER NOT NULL DEFAULT 1,
  max_quantity    INTEGER,                            -- NULL = unlimited
  price_per_unit  NUMERIC(12,2) NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  valid_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT valid_quantity_range CHECK (max_quantity IS NULL OR max_quantity >= min_quantity)
);

-- ============================================================
-- WAREHOUSES & INVENTORY
-- ============================================================

CREATE TABLE warehouses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(20) UNIQUE NOT NULL,
  address     JSONB,
  manager_id  UUID REFERENCES users(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouse_bins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  bin_code      VARCHAR(20) NOT NULL,
  zone          VARCHAR(20),              -- A, B, C / Cold, Dry, etc.
  capacity      NUMERIC(12,2),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (warehouse_id, bin_code)
);

CREATE TABLE goods_receipt_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number      VARCHAR(30) UNIQUE NOT NULL,
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  supplier_name   VARCHAR(200),
  invoice_number  VARCHAR(100),
  received_by     UUID NOT NULL REFERENCES users(id),
  status          grn_status NOT NULL DEFAULT 'draft',
  notes           TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_batches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  bin_id          UUID REFERENCES warehouse_bins(id),
  grn_id          UUID REFERENCES goods_receipt_notes(id),
  batch_number    VARCHAR(50) NOT NULL,
  quantity        NUMERIC(12,3) NOT NULL DEFAULT 0,   -- current available qty
  reserved_qty    NUMERIC(12,3) NOT NULL DEFAULT 0,   -- soft-locked for orders
  received_qty    NUMERIC(12,3) NOT NULL,              -- original quantity received
  cost_per_unit   NUMERIC(12,2),
  expiry_date     DATE,
  manufacture_date DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT non_negative_qty CHECK (quantity >= 0),
  CONSTRAINT non_negative_reserved CHECK (reserved_qty >= 0),
  CONSTRAINT qty_geq_reserved CHECK (quantity >= reserved_qty)
);

-- FEFO index: select batches with earliest expiry first
CREATE INDEX idx_batches_fefo ON inventory_batches (product_id, warehouse_id, expiry_date NULLS LAST, created_at)
  WHERE is_active = TRUE;

CREATE INDEX idx_batches_product ON inventory_batches (product_id) WHERE is_active = TRUE;
CREATE INDEX idx_batches_warehouse ON inventory_batches (warehouse_id) WHERE is_active = TRUE;

CREATE TABLE inventory_reservations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL,               -- references orders.id
  batch_id    UUID NOT NULL REFERENCES inventory_batches(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    NUMERIC(12,3) NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  committed   BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT positive_reservation CHECK (quantity > 0)
);

CREATE INDEX idx_reservations_order ON inventory_reservations (order_id);
CREATE INDEX idx_reservations_batch ON inventory_reservations (batch_id);

CREATE TABLE inventory_adjustments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id    UUID NOT NULL REFERENCES inventory_batches(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  reason      adjustment_reason NOT NULL,
  quantity_delta NUMERIC(12,3) NOT NULL,   -- negative = reduction, positive = addition
  quantity_before NUMERIC(12,3) NOT NULL,
  quantity_after  NUMERIC(12,3) NOT NULL,
  notes       TEXT,
  adjusted_by UUID NOT NULL REFERENCES users(id),
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    VARCHAR(30) UNIQUE NOT NULL,
  business_id     UUID NOT NULL REFERENCES businesses(id),
  placed_by       UUID NOT NULL REFERENCES users(id),
  assigned_to     UUID REFERENCES users(id),          -- sales exec
  warehouse_id    UUID REFERENCES warehouses(id),
  status          order_status NOT NULL DEFAULT 'pending',
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  delivery_address JSONB,
  expected_delivery_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_business ON orders (business_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        NUMERIC(12,3) NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(15,2) NOT NULL,
  CONSTRAINT positive_qty CHECK (quantity > 0),
  CONSTRAINT positive_price CHECK (unit_price > 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status   order_status NOT NULL,
  changed_by  UUID NOT NULL REFERENCES users(id),
  notes       TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_order ON order_status_history (order_id, changed_at);

-- ============================================================
-- DISPATCH
-- ============================================================

CREATE TABLE dispatches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_number VARCHAR(30) UNIQUE NOT NULL,
  order_id        UUID NOT NULL REFERENCES orders(id),
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
  dispatched_by   UUID NOT NULL REFERENCES users(id),
  status          dispatch_status NOT NULL DEFAULT 'pending',
  vehicle_number  VARCHAR(20),
  driver_name     VARCHAR(100),
  driver_phone    VARCHAR(15),
  lr_number       VARCHAR(50),         -- Lorry Receipt number
  dispatched_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dispatch_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  batch_id    UUID NOT NULL REFERENCES inventory_batches(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    NUMERIC(12,3) NOT NULL
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number  VARCHAR(30) UNIQUE NOT NULL,
  order_id        UUID NOT NULL REFERENCES orders(id),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  subtotal        NUMERIC(15,2) NOT NULL,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL,
  due_date        DATE,
  paid_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_void         BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_url         TEXT,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by    UUID REFERENCES users(id)
);

-- ============================================================
-- FINANCE — LEDGER MODEL
-- ============================================================

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number  VARCHAR(30) UNIQUE NOT NULL,
  business_id     UUID NOT NULL REFERENCES businesses(id),
  invoice_id      UUID REFERENCES invoices(id),
  amount          NUMERIC(15,2) NOT NULL,
  method          payment_method NOT NULL,
  reference       VARCHAR(100),         -- UTR, cheque no, etc.
  notes           TEXT,
  recorded_by     UUID NOT NULL REFERENCES users(id),
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_payment CHECK (amount > 0)
);

CREATE TABLE credit_ledger (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  type            ledger_type NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  reference_id    UUID,                -- order_id or payment_id
  reference_type  VARCHAR(30),         -- 'order', 'payment', 'adjustment'
  description     TEXT NOT NULL,
  running_balance NUMERIC(15,2),       -- optional denormalized for display
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Prevent any UPDATE or DELETE on credit_ledger (immutable append-only)
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger is append-only. Mutations are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE ON credit_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_ledger_no_delete
  BEFORE DELETE ON credit_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE INDEX idx_ledger_business ON credit_ledger (business_id, created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB DEFAULT '{}',       -- extra context (order_id, batch_id, etc.)
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- ============================================================
-- AUDIT LOGS (Immutable)
-- ============================================================

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,   -- e.g. 'order.status_changed'
  entity_type     VARCHAR(50) NOT NULL,    -- 'order', 'inventory_batch', etc.
  entity_id       UUID,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent mutations on audit_logs
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs (action, created_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- Available stock per product per warehouse (FEFO ordered)
CREATE VIEW v_available_stock AS
SELECT
  ib.product_id,
  p.sku,
  p.name AS product_name,
  ib.warehouse_id,
  w.name AS warehouse_name,
  SUM(ib.quantity - ib.reserved_qty) AS available_qty,
  SUM(ib.quantity) AS total_qty,
  SUM(ib.reserved_qty) AS reserved_qty,
  MIN(ib.expiry_date) AS nearest_expiry
FROM inventory_batches ib
JOIN products p ON p.id = ib.product_id
JOIN warehouses w ON w.id = ib.warehouse_id
WHERE ib.is_active = TRUE AND ib.quantity > 0
GROUP BY ib.product_id, p.sku, p.name, ib.warehouse_id, w.name;

-- Business credit balance view
CREATE VIEW v_business_balance AS
SELECT
  b.id AS business_id,
  b.name AS business_name,
  b.credit_limit,
  COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE 0 END), 0) AS total_credits,
  COALESCE(SUM(CASE WHEN cl.type = 'debit'  THEN cl.amount ELSE 0 END), 0) AS total_debits,
  COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE -cl.amount END), 0) AS current_balance,
  b.credit_limit - COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE -cl.amount END), 0) AS available_credit
FROM businesses b
LEFT JOIN credit_ledger cl ON cl.business_id = b.id
GROUP BY b.id, b.name, b.credit_limit;

-- Near-expiry batches (within 30 days)
CREATE VIEW v_near_expiry_batches AS
SELECT
  ib.*,
  p.name AS product_name,
  p.sku,
  w.name AS warehouse_name,
  (ib.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM inventory_batches ib
JOIN products p ON p.id = ib.product_id
JOIN warehouses w ON w.id = ib.warehouse_id
WHERE
  ib.is_active = TRUE
  AND ib.quantity > 0
  AND ib.expiry_date IS NOT NULL
  AND ib.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
ORDER BY ib.expiry_date;

-- ============================================================
-- SEQUENCES FOR HUMAN-READABLE NUMBERS
-- ============================================================

CREATE SEQUENCE order_number_seq START 1000;
CREATE SEQUENCE invoice_number_seq START 5000;
CREATE SEQUENCE payment_number_seq START 1000;
CREATE SEQUENCE dispatch_number_seq START 1000;
CREATE SEQUENCE grn_number_seq START 1000;

-- Auto-generate order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- Auto-generate invoice_number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- Auto-generate dispatch_number
CREATE OR REPLACE FUNCTION generate_dispatch_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dispatch_number := 'DSP-' || LPAD(nextval('dispatch_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dispatch_number
  BEFORE INSERT ON dispatches
  FOR EACH ROW WHEN (NEW.dispatch_number IS NULL OR NEW.dispatch_number = '')
  EXECUTE FUNCTION generate_dispatch_number();

-- Auto-generate GRN number
CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.grn_number := 'GRN-' || LPAD(nextval('grn_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grn_number
  BEFORE INSERT ON goods_receipt_notes
  FOR EACH ROW WHEN (NEW.grn_number IS NULL OR NEW.grn_number = '')
  EXECUTE FUNCTION generate_grn_number();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_batches_updated_at BEFORE UPDATE ON inventory_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
