'use strict';

/**
 * Auto-migrations — run safe, idempotent schema changes on startup.
 * Uses IF NOT EXISTS so they're safe to run repeatedly.
 */
const { query } = require('../config/database');
const logger = require('../utils/logger');

const MIGRATIONS = [
  {
    name: 'add_manufacturer_to_products',
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100) DEFAULT NULL`,
  },
  {
    name: 'index_products_manufacturer',
    sql: `CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturer)`,
  },
  {
    name: 'seed_manufacturer_iffco',
    sql: `UPDATE products SET manufacturer = 'IFFCO' WHERE sku IN ('UREA-46', 'DAP-18-46') AND manufacturer IS NULL`,
  },
  {
    name: 'seed_manufacturer_oswal',
    sql: `UPDATE products SET manufacturer = 'Oswal Fertilizers' WHERE sku = 'NPK-10-26-26' AND manufacturer IS NULL`,
  },
  {
    name: 'seed_manufacturer_dayal',
    sql: `UPDATE products SET manufacturer = 'Dayal Fertilizers' WHERE sku = 'NPK-20-20-00' AND manufacturer IS NULL`,
  },
  {
    name: 'seed_manufacturer_jordan',
    sql: `UPDATE products SET manufacturer = 'Jordan Potash' WHERE sku = 'MOP-60' AND manufacturer IS NULL`,
  },
  {
    name: 'seed_manufacturer_biomax',
    sql: `UPDATE products SET manufacturer = 'BioMax Organics' WHERE sku = 'RHIZO-BIO' AND manufacturer IS NULL`,
  },
  {
    name: 'create_payment_number_trigger_fn',
    sql: `
      CREATE OR REPLACE FUNCTION generate_payment_number()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.payment_number := 'PAY-' || LPAD(nextval('payment_number_seq')::TEXT, 6, '0');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `,
  },
  {
    name: 'create_payment_number_trigger',
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payment_number'
        ) THEN
          CREATE TRIGGER trg_payment_number
            BEFORE INSERT ON payments
            FOR EACH ROW WHEN (NEW.payment_number IS NULL OR NEW.payment_number = '')
            EXECUTE FUNCTION generate_payment_number();
        END IF;
      END $$
    `,
  },
];

async function runMigrations() {
  let ran = 0;
  for (const m of MIGRATIONS) {
    try {
      await query(m.sql);
      ran++;
    } catch (err) {
      logger.warn(`Migration skipped [${m.name}]: ${err.message}`);
    }
  }
  logger.info(`Auto-migrations: ${ran}/${MIGRATIONS.length} applied`);
}

module.exports = { runMigrations };
