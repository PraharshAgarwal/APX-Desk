-- ============================================================
--  FDMS — Pricing & Product Data Cleanup
--  Removes all accumulated/duplicate pricing rows and resets
--  product_pricing to the clean seed state.
--
--  Safe to run multiple times (idempotent).
--  Does NOT touch orders, inventory_batches, or users.
-- ============================================================

BEGIN;

-- ── 1. Wipe ALL product_pricing rows ─────────────────────────
--  We truncate and re-seed from scratch so there are zero
--  duplicates and zero stale promotional/override rows from
--  testing.
--
--  CASCADE is safe: product_pricing has no FK children.
TRUNCATE TABLE product_pricing RESTART IDENTITY;

-- ── 2. Re-insert the authoritative standard prices ────────────
INSERT INTO product_pricing (product_id, pricing_type, price_per_unit, discount_pct, min_quantity, valid_from, is_active)
VALUES
  -- Urea 46% N  — ₹290/bag, 0% GST
  ('55555555-0000-0000-0000-000000000001', 'standard', 290.00,  0, 1, CURRENT_DATE, TRUE),
  -- DAP 18-46-0 — ₹1350/bag, 0% GST
  ('55555555-0000-0000-0000-000000000002', 'standard', 1350.00, 0, 1, CURRENT_DATE, TRUE),
  -- MOP 0-0-60  — ₹1100/bag, 0% GST
  ('55555555-0000-0000-0000-000000000003', 'standard', 1100.00, 0, 1, CURRENT_DATE, TRUE),
  -- NPK 10:26:26 — ₹1200/bag, 0% GST
  ('55555555-0000-0000-0000-000000000004', 'standard', 1200.00, 0, 1, CURRENT_DATE, TRUE),
  -- NPK 20:20:00 — ₹1250/bag, 0% GST
  ('55555555-0000-0000-0000-000000000005', 'standard', 1250.00, 0, 1, CURRENT_DATE, TRUE),
  -- Rhizobium Bio Fertilizer — ₹85/kg, 5% GST
  ('55555555-0000-0000-0000-000000000006', 'standard', 85.00,   0, 1, CURRENT_DATE, TRUE);

-- ── 3. Re-insert tiered pricing for Urea (volume discount) ───
INSERT INTO product_pricing (product_id, pricing_type, min_quantity, max_quantity, price_per_unit, discount_pct, valid_from, is_active)
VALUES
  ('55555555-0000-0000-0000-000000000001', 'tiered', 100, 499, 280.00, 3.5, CURRENT_DATE, TRUE),
  ('55555555-0000-0000-0000-000000000001', 'tiered', 500, NULL, 270.00, 6.9, CURRENT_DATE, TRUE);

-- ── 4. Reset GST rates on products to their correct values ───
--  (In case any test saves polluted gst_rate values)
UPDATE products SET gst_rate = 0,  updated_at = NOW()
  WHERE id IN (
    '55555555-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000002',
    '55555555-0000-0000-0000-000000000003',
    '55555555-0000-0000-0000-000000000004',
    '55555555-0000-0000-0000-000000000005'
  );

UPDATE products SET gst_rate = 5, updated_at = NOW()
  WHERE id = '55555555-0000-0000-0000-000000000006';

COMMIT;

-- Verify: should show exactly 8 rows (6 standard + 2 tiered), all is_active = TRUE
SELECT pricing_type, COUNT(*) AS cnt
FROM product_pricing
GROUP BY pricing_type
ORDER BY pricing_type;
