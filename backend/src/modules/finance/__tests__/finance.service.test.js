'use strict';

/**
 * finance.service.test.js
 *
 * Unit tests for the finance service — ledger operations and credit limit checks.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockClient = { query: jest.fn() };

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (fn) => fn(mockClient)),
}));
jest.mock('../../../utils/pagination', () => ({ parsePagination: () => ({ limit: 20, offset: 0 }) }));

const { query } = require('../../../config/database');
const {
  checkCreditLimit,
  getBusinessBalance,
  debitBusiness,
  creditBusiness,
  recordPayment,
} = require('../finance.service');

// ── checkCreditLimit() ────────────────────────────────────────────────────────

describe('finance.service → checkCreditLimit()', () => {
  const BIZ_ID = 'biz-uuid-1';

  test('returns { allowed: false } when business not found', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await checkCreditLimit(BIZ_ID, 10000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not found/i);
  });

  test('returns { allowed: false } when amount exceeds available credit', async () => {
    query.mockResolvedValueOnce({
      rows: [{ business_id: BIZ_ID, credit_limit: '100000', current_balance: '90000' }],
    });
    const result = await checkCreditLimit(BIZ_ID, 20000); // only 10k available
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/credit limit exceeded/i);
  });

  test('returns { allowed: true } when amount is within available credit', async () => {
    query.mockResolvedValueOnce({
      rows: [{ business_id: BIZ_ID, credit_limit: '100000', current_balance: '50000' }],
    });
    const result = await checkCreditLimit(BIZ_ID, 10000); // 50k available
    expect(result.allowed).toBe(true);
    expect(result.availableCredit).toBe(50000);
  });

  test('returns { allowed: true } for exactly zero available credit used', async () => {
    query.mockResolvedValueOnce({
      rows: [{ business_id: BIZ_ID, credit_limit: '100000', current_balance: '0' }],
    });
    const result = await checkCreditLimit(BIZ_ID, 100000); // exact limit
    expect(result.allowed).toBe(true);
  });
});

// ── debitBusiness() / creditBusiness() ────────────────────────────────────────

describe('finance.service → ledger writes', () => {
  const BIZ_ID = 'biz-uuid-1';
  const USER_ID = 'user-uuid-1';
  const ORDER_ID = 'order-uuid-1';

  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ rows: [] });
  });

  test('debitBusiness inserts a debit row into credit_ledger', async () => {
    await debitBusiness(BIZ_ID, 5000, ORDER_ID, 'order', 'Order placed', USER_ID);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("'debit'"),
      expect.arrayContaining([BIZ_ID, 5000])
    );
  });

  test('creditBusiness inserts a credit row into credit_ledger', async () => {
    await creditBusiness(BIZ_ID, 5000, 'pay-1', 'payment', 'Payment received', USER_ID);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("'credit'"),
      expect.arrayContaining([BIZ_ID, 5000])
    );
  });
});

// ── recordPayment() ───────────────────────────────────────────────────────────

describe('finance.service → recordPayment()', () => {
  const USER_ID = 'user-uuid-1';

  beforeEach(() => {
    mockClient.query.mockReset();
  });

  test('creates payment record and credits the ledger inside a transaction', async () => {
    const paymentRow = {
      id: 'pay-1',
      payment_number: 'PAY-000001',
      business_id: 'biz-1',
      amount: '10000',
    };
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ num: 'PAY-000001' }] })  // nextval
      .mockResolvedValueOnce({ rows: [paymentRow] })              // INSERT payment
      .mockResolvedValueOnce({ rows: [] });                        // INSERT credit ledger row

    const result = await recordPayment(
      { businessId: 'biz-1', amount: 10000, method: 'cash' },
      USER_ID
    );

    expect(result.payment_number).toBe('PAY-000001');
    // Verify a credit entry was written
    const creditCall = mockClient.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes("'credit'")
    );
    expect(creditCall).toBeDefined();
  });
});
