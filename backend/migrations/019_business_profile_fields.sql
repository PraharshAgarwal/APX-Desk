-- Migration 019: Extended business profile fields
-- Adds all fields from the retailer registration form

ALTER TABLE businesses
  -- Firm details
  ADD COLUMN IF NOT EXISTS alternate_phone         TEXT,
  ADD COLUMN IF NOT EXISTS district                TEXT,

  -- Business details
  ADD COLUMN IF NOT EXISTS pan_number              TEXT,
  ADD COLUMN IF NOT EXISTS imfs_id_wholesaler      TEXT,
  ADD COLUMN IF NOT EXISTS imfs_id_retailer        TEXT,
  ADD COLUMN IF NOT EXISTS turnover                JSONB NOT NULL DEFAULT '{}',

  -- Licences (each as { no, issued_on, expires_on })
  ADD COLUMN IF NOT EXISTS fertilizer_licence      JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pesticide_licence       JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seed_licence            JSONB NOT NULL DEFAULT '{}',

  -- Security deposit
  ADD COLUMN IF NOT EXISTS security_bank_name      TEXT,
  ADD COLUMN IF NOT EXISTS security_amount         NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS security_cheque_dd_no   TEXT,
  ADD COLUMN IF NOT EXISTS security_rtgs_utr       TEXT,
  ADD COLUMN IF NOT EXISTS security_deposit_date   DATE,
  ADD COLUMN IF NOT EXISTS blank_cheque_bank       TEXT,
  ADD COLUMN IF NOT EXISTS blank_cheque_no1        TEXT,
  ADD COLUMN IF NOT EXISTS blank_cheque_no2        TEXT,

  -- Business estimates (MT / Lakhs per commodity)
  ADD COLUMN IF NOT EXISTS business_estimate       JSONB NOT NULL DEFAULT '{}',

  -- Assigned sales executive
  ADD COLUMN IF NOT EXISTS assigned_sales_executive_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index for searching by assigned exec
CREATE INDEX IF NOT EXISTS idx_businesses_sales_exec
  ON businesses(assigned_sales_executive_id)
  WHERE assigned_sales_executive_id IS NOT NULL;
