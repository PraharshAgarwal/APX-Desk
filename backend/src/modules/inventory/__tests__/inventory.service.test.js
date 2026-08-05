'use strict';

/**
 * inventory.service.test.js
 *
 * Unit tests for FEFO reservation logic and stock adjustment validation.
 * DB is mocked — no real PostgreSQL needed.
 *
 * Key findings from reading the actual service:
 *  - reserveStock(orderId, items[], existingClient?) — items is [{productId, warehouseId, quantity}]
 *  - adjustBatch(batchId, {reason, quantityDelta, notes}, adjustedBy)
 *  - The service calls client.query internally via withTransaction
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

// mockClient is the pg transaction client passed into withTransaction callbacks
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

const { reserveStock, adjustBatch } = require('../inventory.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBatch({ id, qty, reserved = 0, expiry = '2026-12-01' }) {
  return {
    id,
    quantity: qty.toString(),
    reserved_qty: reserved.toString(),
    available: (qty - reserved).toString(),  // virtual column returned by SQL
    expiry_date: expiry,
    batch_number: `BATCH-${id}`,
    product_id: 'product-uuid-1',
    warehouse_id: 'wh-uuid-1',
  };
}

const ORDER_ID   = 'order-uuid-1';
const PRODUCT_ID = 'product-uuid-1';
const WH_ID      = 'wh-uuid-1';
const ITEMS      = [{ productId: PRODUCT_ID, warehouseId: WH_ID, quantity: 100 }];

// ── reserveStock() ────────────────────────────────────────────────────────────

describe('inventory.service → reserveStock()', () => {
  beforeEach(() => {
    mockClient.query.mockReset();
  });

  test('throws INSUFFICIENT_STOCK when no batches are available', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // no batches returned
    await expect(reserveStock(ORDER_ID, ITEMS))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  test('throws INSUFFICIENT_STOCK when available qty < requested', async () => {
    // One batch with only 50 available (need 100)
    mockClient.query.mockResolvedValueOnce({
      rows: [makeBatch({ id: 'b1', qty: 50, reserved: 0 })],
    });
    await expect(reserveStock(ORDER_ID, ITEMS))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  test('reserves from the earliest-expiry batch first (FEFO)', async () => {
    // Query returns batches already in FEFO order (ORDER BY expiry_date ASC)
    // b2 expires sooner — service should consume it first
    const earlyBatch = makeBatch({ id: 'b2', qty: 200, expiry: '2026-06-01' });
    const lateBatch  = makeBatch({ id: 'b1', qty: 200, expiry: '2026-12-01' });

    mockClient.query
      .mockResolvedValueOnce({ rows: [earlyBatch, lateBatch] }) // SELECT FOR UPDATE SKIP LOCKED
      .mockResolvedValueOnce({ rows: [] })                        // UPDATE reserved_qty on b2
      .mockResolvedValueOnce({ rows: [{ id: 'res-1', batch_id: 'b2', quantity: '100' }] }); // INSERT reservation

    await reserveStock(ORDER_ID, ITEMS);

    // The first UPDATE (call index 1) should use b2's id
    const updateArgs = mockClient.query.mock.calls[1][1]; // second arg is params array
    expect(updateArgs).toContain('b2');
  });

  test('splits reservation across multiple batches when stock spans batches', async () => {
    // Each batch has 60 available; requesting 100 → needs both batches
    const b1 = makeBatch({ id: 'b1', qty: 60, expiry: '2026-06-01' });
    const b2 = makeBatch({ id: 'b2', qty: 60, expiry: '2026-08-01' });

    mockClient.query
      .mockResolvedValueOnce({ rows: [b1, b2] })                            // SELECT batches
      .mockResolvedValueOnce({ rows: [] })                                   // UPDATE b1
      .mockResolvedValueOnce({ rows: [{ id: 'r1', batch_id: 'b1', quantity: '60' }] }) // INSERT b1 reservation
      .mockResolvedValueOnce({ rows: [] })                                   // UPDATE b2
      .mockResolvedValueOnce({ rows: [{ id: 'r2', batch_id: 'b2', quantity: '40' }] }); // INSERT b2 reservation

    const reservations = await reserveStock(ORDER_ID, ITEMS);
    expect(reservations).toHaveLength(2);
  });
});

// ── adjustBatch() ─────────────────────────────────────────────────────────────

describe('inventory.service → adjustBatch()', () => {
  const BATCH_ID  = 'batch-uuid-1';
  const USER_ID   = 'user-uuid-1';

  const existingBatch = {
    id: BATCH_ID,
    quantity: '100',
    reserved_qty: '0',
    product_id: PRODUCT_ID,
    warehouse_id: WH_ID,
  };

  beforeEach(() => {
    mockClient.query.mockReset();
  });

  test('throws 404 when batch does not exist', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // no batch
    await expect(adjustBatch(BATCH_ID, { reason: 'damage', quantityDelta: -10 }, USER_ID))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws NEGATIVE_STOCK when adjustment would make qty go below zero', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ ...existingBatch, quantity: '5' }] });
    await expect(adjustBatch(BATCH_ID, { reason: 'damage', quantityDelta: -50 }, USER_ID))
      .rejects.toMatchObject({ code: 'NEGATIVE_STOCK' });
  });

  test('applies a valid positive adjustment and inserts audit row', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [existingBatch] })                       // SELECT batch
      .mockResolvedValueOnce({ rows: [] })                                     // UPDATE quantity
      .mockResolvedValueOnce({ rows: [{ id: 'adj-1', quantity_after: '150' }] }); // INSERT adjustment

    // adjustBatch returns the adjustment row
    await adjustBatch(BATCH_ID, { reason: 'correction', quantityDelta: 50 }, USER_ID);

    // Verify the UPDATE was called with correct new quantity (100 + 50 = 150)
    const updateArgs = mockClient.query.mock.calls[1][1];
    expect(updateArgs[0]).toBe(150); // quantityAfter
  });

  test('applies a valid negative adjustment', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [existingBatch] })          // SELECT batch
      .mockResolvedValueOnce({ rows: [] })                        // UPDATE quantity
      .mockResolvedValueOnce({ rows: [{ id: 'adj-2' }] });        // INSERT adjustment

    await adjustBatch(BATCH_ID, { reason: 'damage', quantityDelta: -30 }, USER_ID);

    const updateArgs = mockClient.query.mock.calls[1][1];
    expect(updateArgs[0]).toBe(70); // 100 - 30 = 70
  });
});
