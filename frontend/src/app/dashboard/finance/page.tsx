'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Modal from '@/components/ui/Modal';
import DatePicker from '@/components/ui/DatePicker';

type Tab = 'ledger' | 'invoices' | 'payments';

export default function FinancePage() {
  const { user, hasAnyRole } = useAuthStore();
  const qc = useQueryClient();
  const [selectedBusiness, setSelectedBusiness] = useState(user?.businessId || '');
  const [tab, setTab] = useState<Tab>('ledger');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const isAdminSales = hasAnyRole(['admin', 'sales_executive']);

  const { data: balances } = useQuery({
    queryKey: ['all-balances'],
    queryFn: async () => {
      const res = await api.get('/finance/balances');
      // Handle both { data: [] } and { data: { data: [], meta: {} } } shapes
      const d = res.data?.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
    enabled: isAdminSales,
  });
  const { data: myBalance } = useQuery({
    queryKey: ['my-balance', selectedBusiness],
    queryFn: async () => (await api.get(`/finance/balance/${selectedBusiness}`)).data.data,
    enabled: !!selectedBusiness,
  });
  const { data: ledgerData } = useQuery({
    queryKey: ['ledger', selectedBusiness],
    queryFn: async () => {
      const res = await api.get(`/finance/ledger/${selectedBusiness}`);
      const d = res.data?.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
    enabled: !!selectedBusiness && tab === 'ledger',
  });
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices', selectedBusiness],
    queryFn: async () => {
      const res = await api.get('/finance/invoices');
      const d = res.data?.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
    enabled: tab === 'invoices',
  });
  const { data: paymentsData } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await api.get('/finance/payments');
      const d = res.data?.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
    enabled: tab === 'payments',
  });

  const balance = myBalance;
  const ledger: any[] = Array.isArray(ledgerData) ? ledgerData : [];
  const allBalances: any[] = Array.isArray(balances) ? balances : [];
  const invoices: any[] = Array.isArray(invoicesData) ? invoicesData : [];
  const payments: any[] = Array.isArray(paymentsData) ? paymentsData : [];


  return (
    <div className="animate-in">
      {/* Balance Overview Cards */}
      {balance && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="stat-card violet">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Credit Limit</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#1a1d23' }}>₹{Number(balance.credit_limit).toLocaleString('en-IN')}</div>
            {isAdminSales && (
              <button onClick={() => setShowCreditModal(true)}
                style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ede9fe', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}>
                Edit limit
              </button>
            )}
          </div>
          <div className="stat-card red">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Debits</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#dc2626' }}>₹{Number(balance.total_debits).toLocaleString('en-IN')}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Credits</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#059669' }}>₹{Number(balance.total_credits).toLocaleString('en-IN')}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Net Balance</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: Number(balance.current_balance) < 0 ? '#dc2626' : '#059669' }}>
              ₹{Number(balance.current_balance).toLocaleString('en-IN')}
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="progress-bar">
                <div className="progress-fill green" style={{ width: `${Math.min(100, (Number(balance.total_credits) / Math.max(Number(balance.credit_limit), 1)) * 100)}%` }} />
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>₹{Number(balance.available_credit).toLocaleString('en-IN')} available</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isAdminSales ? '260px 1fr' : '1fr', gap: 16 }}>
        {/* Business Selector */}
        {isAdminSales && (
          <div className="card">
            <div className="card-header"><span className="card-title">Businesses</span></div>
            <div style={{ padding: 8 }}>
              {allBalances.map((b: any) => (
                <div key={b.business_id} id={`biz-${b.business_id}`} onClick={() => setSelectedBusiness(b.business_id)}
                  style={{
                    padding: 12, borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    background: selectedBusiness === b.business_id ? '#ecfdf5' : 'transparent',
                    border: selectedBusiness === b.business_id ? '1px solid #d1fae5' : '1px solid transparent',
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1d23' }}>{b.business_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Balance</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: Number(b.current_balance) < 0 ? '#dc2626' : '#059669' }}>
                      ₹{Number(b.current_balance).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ marginTop: 6 }}>
                    <div className="progress-fill green" style={{ width: `${Math.min(100, (Number(b.total_credits) / Math.max(Number(b.credit_limit), 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right Content */}
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: '#f4f6f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {(['ledger', 'invoices', 'payments'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#059669' : '#6b7280',
                border: tab === t ? '1px solid #e5e7eb' : '1px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
              }}>{t === 'ledger' ? 'Ledger' : t === 'invoices' ? 'Invoices' : 'Payments'}</button>
            ))}
          </div>

          {/* Ledger */}
          {tab === 'ledger' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Transaction Ledger</span>
                {isAdminSales && <button className="btn-primary" id="record-payment-btn" onClick={() => setShowPaymentModal(true)}>+ Record Payment</button>}
              </div>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No transactions</td></tr>
                  ) : ledger.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(e.created_at).toLocaleDateString('en-IN')}</td>
                      <td>{e.description}</td>
                      <td><span className={`badge ${e.type === 'credit' ? 'badge-green' : 'badge-red'}`}>{e.type}</span></td>
                      <td><strong style={{ color: e.type === 'credit' ? '#059669' : '#dc2626' }}>{e.type === 'credit' ? '+' : '-'}₹{Number(e.amount).toLocaleString('en-IN')}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invoices */}
          {tab === 'invoices' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Invoices</span></div>
              <table className="data-table">
                <thead><tr><th>Invoice #</th><th>Business</th><th>Total</th><th>Paid</th><th>Due Date</th><th>Status</th></tr></thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No invoices yet</td></tr>
                  ) : invoices.map((inv: any) => (
                    <tr key={inv.id}>
                      <td><strong style={{ color: '#059669' }}>{inv.invoice_number}</strong></td>
                      <td>{inv.business_name}</td>
                      <td><strong>₹{Number(inv.total_amount).toLocaleString('en-IN')}</strong></td>
                      <td style={{ color: '#6b7280' }}>₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <span className={`badge ${inv.is_void ? 'badge-red' : Number(inv.paid_amount) >= Number(inv.total_amount) ? 'badge-green' : 'badge-amber'}`}>
                          {inv.is_void ? 'Void' : Number(inv.paid_amount) >= Number(inv.total_amount) ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments */}
          {tab === 'payments' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Payment Records</span>
                {isAdminSales && <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>+ Record Payment</button>}
              </div>
              <table className="data-table">
                <thead><tr><th>Payment #</th><th>Business</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No payments recorded</td></tr>
                  ) : payments.map((p: any) => (
                    <tr key={p.id}>
                      <td><strong>{p.payment_number}</strong></td>
                      <td>{p.business_name}</td>
                      <td><strong style={{ color: '#059669' }}>₹{Number(p.amount).toLocaleString('en-IN')}</strong></td>
                      <td><span className="badge badge-blue">{p.method}</span></td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          businesses={allBalances}
          defaultBusiness={selectedBusiness}
          onClose={() => { setShowPaymentModal(false); qc.invalidateQueries({ queryKey: ['ledger', selectedBusiness] }); qc.invalidateQueries({ queryKey: ['all-balances'] }); qc.invalidateQueries({ queryKey: ['my-balance', selectedBusiness] }); }}
        />
      )}
      {showCreditModal && selectedBusiness && (
        <CreditLimitModal
          businessId={selectedBusiness}
          currentLimit={balance?.credit_limit || 0}
          onClose={() => { setShowCreditModal(false); qc.invalidateQueries({ queryKey: ['my-balance', selectedBusiness] }); qc.invalidateQueries({ queryKey: ['all-balances'] }); }}
        />
      )}
    </div>
  );
}

function PaymentModal({ businesses, defaultBusiness, onClose }: { businesses: any[]; defaultBusiness: string; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ businessId: defaultBusiness, amount: '', method: 'bank_transfer', reference: '', notes: '', paymentDate: today });
  const METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'credit'];
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/finance/payments', { ...form, amount: Number(form.amount) })).data,
    onSuccess: () => onClose(),
  });

  return (
    <Modal title="Record Payment" onClose={onClose} size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mutation.mutate()}
            disabled={!form.businessId || !form.amount || mutation.isPending}>
            {mutation.isPending ? 'Recording…' : 'Record Payment'}
          </button>
        </>
      }>
      <div className="field-group">
        <label className="field-label">Business</label>
        <select className="form-input" value={form.businessId} onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))}>
          <option value="">Select…</option>
          {businesses.map((b: any) => <option key={b.business_id} value={b.business_id}>{b.business_name}</option>)}
        </select>
      </div>
      <div className="grid-2">
        <div className="field-group">
          <label className="field-label">Amount (₹)</label>
          <input className="form-input" type="number" min={0.01} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" />
        </div>
        <div className="field-group">
          <label className="field-label">Method</label>
          <select className="form-input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
            {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="field-group">
          <label className="field-label">Payment Date</label>
          <DatePicker value={form.paymentDate} onChange={v => setForm(f => ({ ...f, paymentDate: v }))} placeholder="Select payment date" max={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="field-group">
          <label className="field-label">Reference (UTR / Cheque No.)</label>
          <input className="form-input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="UTR123456789" />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Notes</label>
        <textarea className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes…" style={{ resize: 'vertical' }} />
      </div>
      {mutation.isError && <div className="field-error">{(mutation.error as any)?.response?.data?.error?.message || 'Failed to record payment. Check all required fields.'}</div>}
    </Modal>
  );
}

function CreditLimitModal({ businessId, currentLimit, onClose }: { businessId: string; currentLimit: number; onClose: () => void }) {
  const [limit, setLimit] = useState(String(currentLimit));
  const mutation = useMutation({
    mutationFn: async () => api.patch(`/finance/credit-limits/${businessId}`, { creditLimit: Number(limit) }),
    onSuccess: () => onClose(),
  });
  return (
    <Modal title="Update Credit Limit" onClose={onClose} size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Update Limit'}
          </button>
        </>
      }>
      <div className="field-group">
        <label className="field-label">Credit Limit (₹)</label>
        <input className="form-input" type="number" min={0} value={limit} onChange={e => setLimit(e.target.value)} />
      </div>
      {mutation.isError && <div className="field-error">Update failed.</div>}
    </Modal>
  );
}
