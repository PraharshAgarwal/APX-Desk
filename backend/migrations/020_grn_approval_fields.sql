-- Migration 020: Add reviewed_by, review fields, received_from, vehicle_number to GRNs
-- Also ensures the status type includes pending_approval/completed/cancelled

ALTER TABLE goods_receipt_notes
  ADD COLUMN IF NOT EXISTS reviewed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes       TEXT,
  ADD COLUMN IF NOT EXISTS received_from      TEXT,        -- supplier / place goods came from
  ADD COLUMN IF NOT EXISTS vehicle_number     TEXT;        -- truck/vehicle that delivered

-- Update the status enum to match the service expectations
-- (only runs if enum values are missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_approval'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'grn_status')
  ) THEN
    ALTER TYPE grn_status ADD VALUE IF NOT EXISTS 'pending_approval';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'completed'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'grn_status')
  ) THEN
    ALTER TYPE grn_status ADD VALUE IF NOT EXISTS 'completed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancelled'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'grn_status')
  ) THEN
    ALTER TYPE grn_status ADD VALUE IF NOT EXISTS 'cancelled';
  END IF;
END
$$;
