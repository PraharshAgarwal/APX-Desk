'use strict';

/**
 * orders.service.test.js
 *
 * Unit tests for the Orders state machine and credit limit enforcement.
 * All DB / service dependencies are mocked.
 *
 * Key facts from reading the real service:
 *  - resolvePrice returns { pricePerUnit, discountPct, effectivePrice }
 *  - createOrder calls: resolvePrice → checkCreditLimit → client.query (INSERT order, items, history)
 *  - changeOrderStatus runs inside withTransaction (uses mockClient.query)
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockClient = { query: jest.fn() };

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (fn) => fn(mockClient)),
}));

jest.mock('../../../utils/pagination', () => ({
  parsePagination: () => ({ limit: 20, offset: 0 }),
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../products/products.service', () => ({
  resolvePrice: jest.fn(),
}));

jest.mock('../../inventory/inventory.service', () => ({
  reserveStock: jest.fn(),
  releaseReservation: jest.fn(),
}));

jest.mock('../../finance/finance.service', () => ({
  debitBusiness: jest.fn(),
  creditBusiness: jest.fn(),
  checkCreditLimit: jest.fn(),
}));

// ── Require after mocks are in place ─────────────────────────────────────────

const { checkCreditLimit, debitBusiness } = require('../../finance/finance.service');
const { resolvePrice }                    = require('../../products/products.service');
const { reserveStock }                    = require('../../inventory/inventory.service');
const { changeOrderStatus, createOrder }  = require('../orders.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_USER   = { id: 'user-1', roles: ['admin'],   businessId: null };
const RETAILER     = { id: 'user-2', roles: ['retailer'], businessId: 'biz-1' };
const ORDER_ID     = 'order-uuid-1';
const PRODUCT_ID   = 'product-uuid-1';
const RESOLVED_PRICE = { pricePerUnit: 1000, discountPct: 0, effectivePrice: 1000 };

function mockOrder(status) {
  return {
    id: ORDER_ID,
    order_number: 'ORD-000001',
    status,
    business_id: 'biz-1',
    total_amount: '50000',
    subtotal: '50000',
    placed_by: 'user-2',
    warehouse_id: 'wh-1',
  };
}

// ── changeOrderStatus() ───────────────────────────────────────────────────────

describe('orders.service → changeOrderStatus()', () => {
  beforeEach(() => {
    mockClient.query.mockReset();
    debitBusiness.mockResolvedValue(undefined);
  });

  test('transitions pending → confirmed successfully', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [mockOrder('pending')] })       // SELECT order
      .mockResolvedValueOnce({ rows: [{ ...mockOrder('confirmed') }] }) // UPDATE status
      .mockResolvedValueOnce({ rows: [] });                            // INSERT history

    const result = await changeOrderStatus(ORDER_ID, 'confirmed', ADMIN_USER, {});
    expect(result.status).toBe('confirmed');
  });

  test('throws INVALID_TRANSITION on an illegal state change (delivered → pending)', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [mockOrder('delivered')] });
    await expect(changeOrderStatus(ORDER_ID, 'pending', ADMIN_USER, {}))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION', statusCode: 422 });
  });

  test('throws INVALID_TRANSITION when trying to re-deliver an already delivered order', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [mockOrder('delivered')] });
    await expect(changeOrderStatus(ORDER_ID, 'delivered', ADMIN_USER, {}))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws ORDER_NOT_FOUND when order does not exist', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    await expect(changeOrderStatus('non-existent-id', 'confirmed', ADMIN_USER, {}))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createOrder() — credit limit enforcement ──────────────────────────────────

describe('orders.service → createOrder() credit limit check', () => {
  const ORDER_INPUT = {
    businessId: 'biz-1',
    warehouseId: 'wh-1',
    items: [{ productId: PRODUCT_ID, quantity: 100 }],
  };

  beforeEach(() => {
    mockClient.query.mockReset();
  });

  test('throws CREDIT_LIMIT_EXCEEDED before touching the DB when credit is breached', async () => {
    // resolvePrice must succeed first so subtotal can be computed
    resolvePrice.mockResolvedValue(RESOLVED_PRICE);

    checkCreditLimit.mockResolvedValue({
      allowed: false,
      reason: 'Credit limit exceeded. Available: \u20b90.00',
    });

    // createOrder now does: resolvePrice → SELECT gst_rate → checkCreditLimit → INSERT...
    // We only need to mock the gst_rate SELECT (the INSERT is never reached)
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ gst_rate: '18' }] }); // SELECT gst_rate

    // No INSERT queries should be called because we abort before them
    await expect(createOrder(ORDER_INPUT, RETAILER))
      .rejects.toMatchObject({ code: 'CREDIT_LIMIT_EXCEEDED', statusCode: 422 });

    // Verify no INSERT into orders was attempted
    const insertCall = mockClient.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO orders')
    );
    expect(insertCall).toBeUndefined();
  });

  test('allows order creation when credit is available', async () => {
    resolvePrice.mockResolvedValue(RESOLVED_PRICE);
    checkCreditLimit.mockResolvedValue({ allowed: true, availableCredit: 500000 });
    reserveStock.mockResolvedValue([{ id: 'res-1', batch_id: 'b1', quantity: '100' }]);

    const createdOrder = {
      id: 'order-new',
      order_number: 'ORD-000001',
      status: 'pending',
      total_amount: '118000',   // 100 units * 1000 * 1.18
      tax_amount:   '18000',
      subtotal:     '100000',
      business_id: 'biz-1',
      placed_by: 'user-2',
      warehouse_id: 'wh-1',
    };

    // Order: SELECT gst_rate → INSERT orders → INSERT order_item → INSERT history
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ gst_rate: '18' }] }) // SELECT gst_rate
      .mockResolvedValueOnce({ rows: [createdOrder] })         // INSERT INTO orders
      .mockResolvedValueOnce({ rows: [] })                     // INSERT order_item
      .mockResolvedValueOnce({ rows: [] });                    // INSERT order_status_history

    const result = await createOrder(ORDER_INPUT, RETAILER);
    expect(result.order_number).toBe('ORD-000001');
    expect(result.status).toBe('pending');
    // GST should be reflected in amounts
    expect(parseFloat(result.tax_amount)).toBeCloseTo(18000, 0);
    expect(parseFloat(result.total_amount)).toBeCloseTo(118000, 0);
  });
});
