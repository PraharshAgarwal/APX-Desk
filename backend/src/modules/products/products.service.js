'use strict';

const { query, withTransaction } = require('../../config/database');
const { parsePagination } = require('../../utils/pagination');

async function listProducts({ search, categoryId, manufacturer, isActive }, pagination) {
  const { limit, offset } = parsePagination(pagination);
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.manufacturer ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }
  if (categoryId) {
    conditions.push(`p.category_id = $${idx}`);
    params.push(categoryId); idx++;
  }
  if (manufacturer) {
    conditions.push(`p.manufacturer = $${idx}`);
    params.push(manufacturer); idx++;
  }
  if (isActive !== undefined) {
    conditions.push(`p.is_active = $${idx}`);
    params.push(isActive === 'true'); idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM products p ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(limit, offset);
  const result = await query(
    `SELECT p.*, c.name AS category_name,
            COALESCE(p.manufacturer, 'Generic') AS manufacturer,
            (SELECT price_per_unit FROM product_pricing
             WHERE product_id = p.id AND pricing_type = 'standard'
               AND is_active = TRUE AND business_id IS NULL
             ORDER BY created_at DESC LIMIT 1) AS base_price,
            (SELECT SUM(ib.quantity - ib.reserved_qty)
             FROM inventory_batches ib
             WHERE ib.product_id = p.id AND ib.is_active = TRUE) AS available_qty
     FROM products p
     LEFT JOIN product_categories c ON c.id = p.category_id
     ${where}
     ORDER BY COALESCE(p.manufacturer, 'Generic'), p.name
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return { data: result.rows, total };
}

async function getManufacturers() {
  const result = await query(
    `SELECT COALESCE(manufacturer, 'Generic') AS manufacturer, COUNT(*) AS product_count
     FROM products
     WHERE is_active = TRUE
     GROUP BY COALESCE(manufacturer, 'Generic')
     ORDER BY manufacturer`
  );
  return result.rows;
}

async function getProductById(id) {
  const result = await query(
    `SELECT p.*, c.name AS category_name FROM products p
     LEFT JOIN product_categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function createProduct(data, createdBy) {
  const { sku, name, description, categoryId, unit, weightPerUnit, hsnCode, gstRate, lowStockThreshold } = data;
  const result = await query(
    `INSERT INTO products (sku, name, description, category_id, unit, weight_per_unit, hsn_code, gst_rate, low_stock_threshold, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [sku, name, description, categoryId, unit, weightPerUnit, hsnCode, gstRate || 0, lowStockThreshold || 100, createdBy]
  );
  return result.rows[0];
}

async function updateProduct(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = ['name', 'description', 'category_id', 'unit', 'gst_rate', 'low_stock_threshold', 'is_active', 'image_url', 'manufacturer', 'hsn_code'];
  for (const [key, val] of Object.entries(data)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(col)) {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) return null;
  values.push(id);

  const result = await query(
    `UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

async function deleteProduct(id) {
  await query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
}

async function getProductPricing(productId) {
  const result = await query(
    `SELECT pp.*, b.name AS business_name FROM product_pricing pp
     LEFT JOIN businesses b ON b.id = pp.business_id
     WHERE pp.product_id = $1 AND pp.is_active = TRUE
     ORDER BY pp.pricing_type, pp.min_quantity`,
    [productId]
  );
  return result.rows;
}

async function upsertPricing(productId, data, createdBy) {
  const {
    pricingType, businessId, minQuantity, maxQuantity,
    pricePerUnit, discountPct, validFrom, validUntil,
  } = data;

  return withTransaction(async (client) => {
    // Deactivate any existing active row(s) for the same scope so we never
    // end up with multiple live rows for the same (product, type, business, minQty).
    // This is what makes it a true "upsert" — one authoritative price per scope.
    await client.query(
      `UPDATE product_pricing
       SET is_active = FALSE
       WHERE product_id = $1
         AND pricing_type = $2
         AND is_active = TRUE
         AND (business_id = $3 OR (business_id IS NULL AND $3::uuid IS NULL))
         AND min_quantity = $4`,
      [productId, pricingType, businessId || null, minQuantity || 1]
    );

    // Insert the new canonical row
    const result = await client.query(
      `INSERT INTO product_pricing
         (product_id, pricing_type, business_id, min_quantity, max_quantity,
          price_per_unit, discount_pct, valid_from, valid_until, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        productId, pricingType, businessId || null,
        minQuantity || 1, maxQuantity || null,
        pricePerUnit, discountPct || 0,
        validFrom || new Date(), validUntil || null,
        createdBy,
      ]
    );
    return result.rows[0];
  });
}


/**
 * Resolve the best price for a product+business+quantity combo.
 *
 * Priority: customer_specific > promotional > tiered > standard
 * For promotional entries: if price_per_unit is 0 (i.e. "% off the standard price"),
 * we fetch the standard base price and apply the discount to it.
 */
async function resolvePrice(productId, businessId, quantity) {
  const result = await query(
    `SELECT price_per_unit, discount_pct, pricing_type FROM product_pricing
     WHERE product_id = $1
       AND is_active = TRUE
       AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       AND min_quantity <= $2
       AND (max_quantity IS NULL OR max_quantity >= $2)
       AND (business_id = $3 OR business_id IS NULL)
     ORDER BY
       CASE WHEN business_id = $3 THEN 0 ELSE 1 END,
       CASE pricing_type
         WHEN 'customer_specific' THEN 0
         WHEN 'promotional' THEN 1
         WHEN 'tiered' THEN 2
         ELSE 3
       END,
       min_quantity DESC
     LIMIT 1`,
    [productId, quantity, businessId]
  );

  if (result.rows.length === 0) return null;

  let { price_per_unit, discount_pct, pricing_type } = result.rows[0];

  // Promotional entries created via the Seasonal Schemes form store price_per_unit=0
  // to mean "apply discount_pct to the standard base price".
  if (pricing_type === 'promotional' && Number(price_per_unit) === 0) {
    const stdResult = await query(
      `SELECT price_per_unit FROM product_pricing
       WHERE product_id = $1 AND pricing_type = 'standard' AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [productId]
    );
    if (stdResult.rows.length > 0) {
      price_per_unit = stdResult.rows[0].price_per_unit;
    }
  }

  const effectivePrice = Number(price_per_unit) * (1 - Number(discount_pct) / 100);
  return { pricePerUnit: price_per_unit, discountPct: discount_pct, effectivePrice };
}

async function listAllPricing({ pricingType } = {}) {
  const where = pricingType ? `WHERE pp.pricing_type = $1 AND pp.is_active = TRUE` : `WHERE pp.is_active = TRUE`;
  const params = pricingType ? [pricingType] : [];
  const result = await query(
    `SELECT pp.*, p.name AS product_name, b.name AS business_name
     FROM product_pricing pp
     JOIN products p ON p.id = pp.product_id
     LEFT JOIN businesses b ON b.id = pp.business_id
     ${where}
     ORDER BY pp.created_at DESC`,
    params
  );
  return result.rows;
}

async function deactivatePricing(pricingId) {
  const result = await query(
    `UPDATE product_pricing SET is_active = FALSE WHERE id = $1 RETURNING *`,
    [pricingId]
  );
  return result.rows[0] || null;
}

module.exports = { listProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductPricing, upsertPricing, resolvePrice, getManufacturers, listAllPricing, deactivatePricing };
