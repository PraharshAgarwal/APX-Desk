-- ============================================================
--  FDMS — GRN Approval Workflow Migration
--  Run this BEFORE deploying the backend changes.
--  Safe to run on existing data (all changes are additive).
-- ============================================================

-- 1. Add new enum value to grn_status
--    NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
--    Run this file with psql directly or via a non-transactional migration tool.
ALTER TYPE grn_status ADD VALUE IF NOT EXISTS 'pending_approval' BEFORE 'completed';

-- 2. Add approval-tracking columns to goods_receipt_notes
ALTER TABLE goods_receipt_notes
  ADD COLUMN IF NOT EXISTS reviewed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes  TEXT;

-- 3. Index to speed up "pending approval" queue lookups
CREATE INDEX IF NOT EXISTS idx_grn_pending
  ON goods_receipt_notes (status, created_at DESC)
  WHERE status = 'pending_approval';
