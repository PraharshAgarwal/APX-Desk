// migrate-manufacturer.js — run once then delete
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    // Add columns
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100) DEFAULT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturer)`);
    console.log('✅ Column added');

    // Seed manufacturers for existing products
    const seeds = [
      ['UREA-46',    'IFFCO'],
      ['DAP-18-46',  'IFFCO'],
      ['MOP-60',     'Jordan Potash / SOP'],
      ['NPK-10-26-26', 'Oswal Fertilizers'],
      ['NPK-20-20-00', 'Dayal Fertilizers'],
      ['RHIZO-BIO',  'BioMax Organics'],
    ];
    for (const [sku, mfr] of seeds) {
      const r = await client.query(`UPDATE products SET manufacturer=$1 WHERE sku=$2`, [mfr, sku]);
      console.log(`  ${sku} → ${mfr} (${r.rowCount} row)`);
    }

    // Also insert brand categories in product_categories if needed
    await client.query(`
      INSERT INTO product_categories (name, description) VALUES
        ('Oswal Fertilizers Products', 'Products by Oswal Fertilizers Ltd'),
        ('Dayal Fertilizers Products', 'Products by Dayal Fertilizers'),
        ('IFFCO Products', 'Products by IFFCO'),
        ('BioMax Organics Products', 'Products by BioMax Organics')
      ON CONFLICT (name) DO NOTHING
    `).catch(() => console.log('  (category insert skipped — name conflict constraint)'));

    console.log('✅ Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error('❌', e.message); process.exit(1); });
