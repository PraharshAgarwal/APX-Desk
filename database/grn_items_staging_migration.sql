-- ============================================================
--  FDMS — GRN Items Staging Table Migration
--  Holds line items for GRNs that are pending approval.
--  Once approved, rows are promoted into inventory_batches.
--  Once rejected, rows are cascade-deleted with the GRN.
-- ============================================================

CREATE TABLE IF NOT EXISTS grn_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id           UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  bin_id           UUID REFERENCES warehouse_bins(id),
  batch_number     VARCHAR(50) NOT NULL,
  received_qty     NUMERIC(12,3) NOT NULL CHECK (received_qty > 0),
  cost_per_unit    NUMERIC(12,2),
  expiry_date      DATE,
  manufacture_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items (grn_id);
