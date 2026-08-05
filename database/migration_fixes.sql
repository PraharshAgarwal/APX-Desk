-- ============================================================
--  FDMS — Patch Migration  (Issues 15–18)
--  Run once against the live DB.
--  All statements are idempotent (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── Issue 17: Add missing FK on inventory_reservations.order_id ─────────────
-- The original schema had a comment "-- references orders.id" but no constraint.
ALTER TABLE inventory_reservations
  ADD CONSTRAINT IF NOT EXISTS fk_reservations_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- ── Issue 16: Composite index for v_business_balance aggregation ─────────────
-- checkCreditLimit calls v_business_balance which scans credit_ledger by
-- business_id and groups by type. A covering index makes SUM() far cheaper.
CREATE INDEX IF NOT EXISTS idx_ledger_business_type_amount
  ON credit_ledger (business_id, type, amount)
  INCLUDE (created_at);

-- ── Issue 15 (DB side): add transfer to warehouse_transfers ──────────────────
-- New table for inter-warehouse transfers (Issue 14 backend)
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1000;

CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number VARCHAR(30) UNIQUE NOT NULL DEFAULT '',
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'   -- pending | in_transit | completed | cancelled
                  CHECK (status IN ('pending','in_transit','completed','cancelled')),
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  completed_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  CONSTRAINT different_warehouses CHECK (from_warehouse_id <> to_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_wh ON warehouse_transfers (from_warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_to_wh   ON warehouse_transfers (to_warehouse_id,   created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_status  ON warehouse_transfers (status, created_at DESC);

CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id     UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  source_batch_id UUID NOT NULL REFERENCES inventory_batches(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  -- set when transfer is completed: the new batch created in dest WH
  dest_batch_id   UUID REFERENCES inventory_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON warehouse_transfer_items (transfer_id);

-- Auto-number transfers
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.transfer_number := 'TRF-' || LPAD(nextval('transfer_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop+recreate trigger (idempotent pattern)
DROP TRIGGER IF EXISTS trg_transfer_number ON warehouse_transfers;
CREATE TRIGGER trg_transfer_number
  BEFORE INSERT ON warehouse_transfers
  FOR EACH ROW WHEN (NEW.transfer_number = '' OR NEW.transfer_number IS NULL)
  EXECUTE FUNCTION generate_transfer_number();

-- ── Issue 18: Fix v_business_balance logic bug ───────────────────────────────
--
-- BUG (original):
--   current_balance = SUM(credit - debit)   →  positive = business has a credit (paid more)
--   available_credit = credit_limit - current_balance
--
--   With ₹50,000 debit and ₹20,000 credit:
--     current_balance = 20,000 - 50,000 = -30,000   (negative!)
--     available_credit = 100,000 - (-30,000) = 130,000   (BUG: inflated)
--
-- FIX:
--   current_balance = SUM(debit - credit)   →  positive = outstanding debt
--   available_credit = credit_limit - current_balance
--
--   With ₹50,000 debit and ₹20,000 credit:
--     current_balance = 50,000 - 20,000 = 30,000   (correct: ₹30k owed)
--     available_credit = 100,000 - 30,000 = 70,000  (correct)
CREATE OR REPLACE VIEW v_business_balance AS
SELECT
  b.id                  AS business_id,
  b.name                AS business_name,
  b.credit_limit,
  COALESCE(SUM(CASE WHEN cl.type = 'credit' THEN cl.amount ELSE 0    END), 0) AS total_credits,
  COALESCE(SUM(CASE WHEN cl.type = 'debit'  THEN cl.amount ELSE 0    END), 0) AS total_debits,
  -- current_balance = outstanding debt (positive means the business owes money)
  COALESCE(SUM(CASE WHEN cl.type = 'debit'  THEN cl.amount ELSE -cl.amount END), 0) AS current_balance,
  -- available_credit = how much more they can spend
  b.credit_limit - COALESCE(SUM(CASE WHEN cl.type = 'debit' THEN cl.amount ELSE -cl.amount END), 0) AS available_credit
FROM businesses b
LEFT JOIN credit_ledger cl ON cl.business_id = b.id
GROUP BY b.id, b.name, b.credit_limit;
