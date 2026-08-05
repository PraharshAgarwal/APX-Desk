-- Migration 021: Add pending_dispatch to dispatch_status enum
-- Adds 'executed_by' column to record which warehouse manager executed the dispatch

ALTER TYPE dispatch_status ADD VALUE IF NOT EXISTS 'pending_dispatch';

ALTER TABLE dispatches
  ADD COLUMN IF NOT EXISTS executed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS executed_at  TIMESTAMPTZ;
