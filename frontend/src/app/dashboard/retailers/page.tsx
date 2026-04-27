'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { Icons, IconClipboard, IconPackage } from '@/components/ui/Icons';

type DetailTab = 'overview' | 'orders' | 'invoices' | 'ledger';

export default function RetailersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: retailersData, isLoading } = useQuery({
    queryKey: ['retailers'],
    queryFn: async () => (await api.get('/businesses')).data.data,
  });

  const retailers: any[] = Array.isArray(retailersData) ? retailersData : [];
  const filtered = retailers.filter((r: any) =>
    !search || r.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.gstin?.toLowerCase().includes(search.toLowerCase())
  );
  const selected = retailers.find((r: any) => r.business_id === selectedId);

  return (
    <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100vh - 80px)' }}>
      {/* Left Panel — Retailer List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px 12px 0 0', padding: '14px 16px', borderBottom: 'none' }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#1a1d23', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icons.Store size={15} color="#059669" /> Retailers
          </div>
          <input className="form-input" placeholder="Search by name or GST…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ fontSize: 12, padding: '7px 12px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0 0 12px 12px', borderTop: '1px solid #f3f4f6' }}>
          {isLoading
            ? <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
            : filtered.length === 0
              ? <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No retailers found</div>
              : filtered.map((r: any) => {
                const balance = Number(r.current_balance);
                const creditPct = Number(r.credit_limit) > 0
                  ? Math.min(100, (Math.max(0, balance) / Number(r.credit_limit)) * 100) : 0;
                const isAtRisk = creditPct > 80;
                const isSelected = selectedId === r.business_id;
                return (
                  <div key={r.business_id} onClick={() => setSelectedId(r.business_id)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                      background: isSelected ? '#f0fdf4' : 'transparent',
                      borderLeft: isSelected ? '3px solid #059669' : '3px solid transparent',
                      transition: 'all 0.1s',
                    }}>
                    {/* Name row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1d23' }}>{r.business_name}</div>
                      <span className={`badge ${r.is_active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {/* GST */}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{r.gstin || 'No GSTIN'}</div>
                    {/* Balance + credit bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Outstanding</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: balance > 0 ? '#dc2626' : '#059669' }}>
                        ₹{Math.abs(balance).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${creditPct}%`, background: isAtRisk ? '#ef4444' : '#10b981', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                      {r.total_orders} orders · {creditPct.toFixed(0)}% credit used
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Right Panel — Detail View */}
      {selectedId
        ? <RetailerDetail businessId={selectedId} summaryRow={selected} />
        : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600 }}>Select a retailer</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Choose from the list to see full details</div>
          </div>
        )
      }
    </div>
  );
}

/* ── Retailer Detail Panel ─────────────────────────────── */
function RetailerDetail({ businessId, summaryRow }: { businessId: string; summaryRow: any }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [showCreditModal, setShowCreditModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['retailer-detail', businessId],
    queryFn: async () => (await api.get(`/businesses/${businessId}`)).data.data,
  });

  if (isLoading) return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
      Loading details…
    </div>
  );

  const { profile, balance, orders, invoices, ledger } = data || {};
  if (!profile) return null;

  const creditPct = balance && Number(balance.credit_limit) > 0
    ? Math.min(100, (Math.max(0, Number(balance.current_balance)) / Number(balance.credit_limit)) * 100) : 0;
  const addr = profile.address || {};

  const TABS: { key: DetailTab; label: React.ReactNode }[] = [
    { key: 'overview',  label: <><IconClipboard size={13} /> Overview</>  },
    { key: 'orders',   label: <><IconPackage size={13} /> Orders</>    },
    { key: 'invoices', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 5h5M4.5 8h5M4.5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> Invoices</span> },
    { key: 'ledger',   label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12" stroke="currentColor" strokeWidth="1.3"/><path d="M4 9.5h2M8 9.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> Ledger</span> },
  ];

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fffe 0%, #f0fdf4 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: '#fff' }}>
              {profile.name?.charAt(0) || 'R'}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: '#1a1d23' }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {profile.type} · {profile.gstin || 'No GSTIN'} · {addr.city || '—'}, {addr.state || '—'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCreditModal(true)}
              style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ede9fe', padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>
              Edit Credit Limit
            </button>
            <span className={`badge ${profile.is_active ? 'badge-green' : 'badge-red'}`}>{profile.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Quick stats row */}
        {balance && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
            {[
              { label: 'Credit Limit', value: `₹${Number(balance.credit_limit).toLocaleString('en-IN')}`, color: '#1a1d23' },
              { label: 'Outstanding', value: `₹${Number(balance.current_balance).toLocaleString('en-IN')}`, color: Number(balance.current_balance) > 0 ? '#dc2626' : '#059669' },
              { label: 'Total Debits', value: `₹${Number(balance.total_debits).toLocaleString('en-IN')}`, color: '#dc2626' },
              { label: 'Total Credits', value: `₹${Number(balance.total_credits).toLocaleString('en-IN')}`, color: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
        {/* Credit bar */}
        {balance && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
              <span>Credit utilization</span>
              <span style={{ fontWeight: 700, color: creditPct > 80 ? '#dc2626' : '#059669' }}>{creditPct.toFixed(0)}%</span>
            </div>
            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${creditPct}%`, background: creditPct > 80 ? '#ef4444' : creditPct > 60 ? '#f59e0b' : '#10b981', borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', padding: '0 16px', background: '#fafbfc' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none',
            color: tab === t.key ? '#059669' : '#6b7280',
            borderBottom: tab === t.key ? '2px solid #059669' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {tab === 'overview' && <OverviewTab profile={profile} balance={balance} summaryRow={summaryRow} />}
        {tab === 'orders' && <OrdersTab orders={orders || []} />}
        {tab === 'invoices' && <InvoicesTab invoices={invoices || []} />}
        {tab === 'ledger' && <LedgerTab ledger={ledger || []} />}
      </div>

      {showCreditModal && (
        <CreditModal
          businessId={businessId}
          currentLimit={Number(balance?.credit_limit || 0)}
          onClose={() => { setShowCreditModal(false); qc.invalidateQueries({ queryKey: ['retailer-detail', businessId] }); qc.invalidateQueries({ queryKey: ['retailers'] }); }}
        />
      )}
    </div>
  );
}

/* ── Overview Tab ──────────────────────────────────────── */
function OverviewTab({ profile, balance, summaryRow }: any) {
  const addr = profile.address || {};
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Business Profile */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 12 }}>Business Profile</div>
        {[
          ['Business Name', profile.name],
          ['Type', profile.type],
          ['GSTIN', profile.gstin || '—'],
          ['Phone', profile.phone || '—'],
          ['Email', profile.email || '—'],
          ['City', `${addr.city || '—'}, ${addr.state || '—'}`],
          ['PIN Code', addr.pin || '—'],
          ['Street', addr.street || '—'],
          ['Since', new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })],
        ].map(([label, value]) => (
          <div key={label as string} style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
            <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 120 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d23' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Account Rep + Order Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Contact person (primary user) */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 12 }}>Primary Contact</div>
          {[
            ['Name', `${profile.first_name || '—'} ${profile.last_name || ''}`.trim()],
            ['Email', profile.user_email || '—'],
            ['Phone', profile.user_phone || '—'],
          ].map(([label, value]) => (
            <div key={label as string} style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
              <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 120 }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d23' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Order stats */}
        {summaryRow && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 12 }}>Order Summary</div>
            {[
              ['Total Orders', summaryRow.total_orders],
              ['Pending Orders', summaryRow.pending_orders],
              ['Delivered Orders', summaryRow.delivered_orders],
            ].map(([label, value]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Orders Tab ────────────────────────────────────────── */
function OrdersTab({ orders }: { orders: any[] }) {
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>Order #</th><th>Status</th><th>Items</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          {orders.length === 0
            ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No orders yet</td></tr>
            : orders.map((o: any) => (
              <tr key={o.id}>
                <td><strong style={{ color: '#059669' }}>{o.order_number}</strong></td>
                <td><StatusBadge status={o.status} /></td>
                <td><span className="badge badge-stone">{o.item_count} items</span></td>
                <td><strong>₹{Number(o.total_amount).toLocaleString('en-IN')}</strong></td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Invoices Tab ──────────────────────────────────────── */
function InvoicesTab({ invoices }: { invoices: any[] }) {
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>Invoice #</th><th>Total</th><th>Paid</th><th>Due Date</th><th>Status</th></tr></thead>
        <tbody>
          {invoices.length === 0
            ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No invoices yet</td></tr>
            : invoices.map((inv: any) => {
              const isPaid = Number(inv.paid_amount) >= Number(inv.total_amount);
              return (
                <tr key={inv.id}>
                  <td><strong style={{ color: '#059669', fontSize: 12 }}>{inv.invoice_number}</strong></td>
                  <td><strong>₹{Number(inv.total_amount).toLocaleString('en-IN')}</strong></td>
                  <td style={{ color: isPaid ? '#059669' : '#dc2626', fontWeight: 600 }}>₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <span className={`badge ${inv.is_void ? 'badge-stone' : isPaid ? 'badge-green' : 'badge-red'}`}>
                      {inv.is_void ? 'Void' : isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Ledger Tab ────────────────────────────────────────── */
function LedgerTab({ ledger }: { ledger: any[] }) {
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>
          {ledger.length === 0
            ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No transactions</td></tr>
            : ledger.map((e: any) => (
              <tr key={e.id}>
                <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{ fontSize: 13 }}>{e.description}</td>
                <td><span className={`badge ${e.type === 'credit' ? 'badge-green' : 'badge-red'}`}>{e.type}</span></td>
                <td><strong style={{ color: e.type === 'credit' ? '#059669' : '#dc2626' }}>
                  {e.type === 'credit' ? '+' : '−'}₹{Number(e.amount).toLocaleString('en-IN')}
                </strong></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Credit Limit Modal ────────────────────────────────── */
function CreditModal({ businessId, currentLimit, onClose }: { businessId: string; currentLimit: number; onClose: () => void }) {
  const [limit, setLimit] = useState(String(currentLimit));
  const mutation = useMutation({
    mutationFn: async () => api.patch(`/finance/credit-limits/${businessId}`, { creditLimit: Number(limit) }),
    onSuccess: () => onClose(),
  });
  return (
    <Modal title="Edit Credit Limit" onClose={onClose} size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Update'}
          </button>
        </>
      }>
      <div className="field-group">
        <label className="field-label">New Credit Limit (₹)</label>
        <input className="form-input" type="number" min={0} value={limit}
          onChange={e => setLimit(e.target.value)} autoFocus />
        <div className="field-hint">Current limit: ₹{currentLimit.toLocaleString('en-IN')}</div>
      </div>
      {mutation.isError && <div className="field-error">Update failed. Please try again.</div>}
    </Modal>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = { pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-blue', dispatched: 'badge-stone', delivered: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${m[status] || 'badge-stone'}`}>{status}</span>;
}
