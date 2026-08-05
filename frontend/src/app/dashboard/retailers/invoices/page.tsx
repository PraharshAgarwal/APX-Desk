'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { createPortal } from 'react-dom';

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

// ── GST Invoice Modal ──────────────────────────────────────────
function GSTInvoiceModal({ order, onClose }: { order: any; onClose: () => void }) {
  const sub = Number(order.total_amount || 0);
  const gst = Math.round(sub * 0.05);
  const total = sub + gst;
  const items: any[] = order.items || [];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Tax Invoice</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Original for Recipient</div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Seller / Buyer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>SELLER</div>
              <div>APX Desk Distribution Pvt. Ltd.</div>
              <div style={{ color: 'var(--text-muted)' }}>#42, Industrial Area, Mysuru — 570 016</div>
              <div style={{ color: 'var(--text-muted)' }}>GSTIN: 29AABCA1234K1Z5</div>
              <div style={{ color: 'var(--text-muted)' }}>State: Karnataka (29)</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>BUYER</div>
              <div style={{ fontWeight: 500 }}>{order.business_name || '—'}</div>
              <div style={{ color: 'var(--text-muted)' }}>GSTIN: 29AABCK1234K1Z5</div>
              <div style={{ color: 'var(--text-muted)' }}>State: Karnataka (29)</div>
            </div>
          </div>

          {/* Invoice meta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12 }}>
            <div><div style={{ color: 'var(--text-faint)' }}>Invoice No.</div><div style={{ fontWeight: 700, marginTop: 2 }}>INV-2025-{order.id?.slice(-4) || '0001'}</div></div>
            <div><div style={{ color: 'var(--text-faint)' }}>Invoice Date</div><div style={{ fontWeight: 600, marginTop: 2 }}>{new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
            <div><div style={{ color: 'var(--text-faint)' }}>Order Ref</div><div style={{ fontWeight: 600, marginTop: 2 }}>{order.order_number || '—'}</div></div>
          </div>

          {/* Line items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Item', 'Qty (bags)', 'Rate (₹)', 'Amount (₹)'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Item' ? 'left' : 'right', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((item: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)' }}>{item.product_name}</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'right' }}>{fmt(Number(item.unit_price))}</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'right', fontWeight: 600 }}>{fmt(Number(item.unit_price) * item.quantity)}</td>
                </tr>
              )) : (
                <tr>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)' }}>Order {order.order_number}</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'right', fontWeight: 600 }}>{fmt(sub)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              {[
                ['Taxable Amount', '', fmt(sub), false],
                ['CGST @ 2.5%', '', fmt(Math.round(gst / 2)), false],
                ['SGST @ 2.5%', '', fmt(Math.round(gst / 2)), false],
                ['TOTAL', '', fmt(total), true],
              ].map(([label, , val, bold]) => (
                <tr key={label as string}>
                  <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--border)', fontWeight: bold ? 700 : 400, color: bold ? 'var(--text)' : 'var(--text-muted)' }}>{label}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--border)', fontWeight: bold ? 800 : 600, color: bold ? 'var(--emerald-700)' : 'var(--text)', fontSize: bold ? 14 : 12 }}>{val as string}</td>
                </tr>
              ))}
            </tfoot>
          </table>

          <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.6 }}>
            Payment Terms: 15 days credit · This is a computer-generated invoice and does not require a physical signature.
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-secondary">⬇ Download PDF</button>
          <button type="button" className="btn-primary">Send to Business</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Invoices Page ──────────────────────────────────────────────
export default function RetailerInvoicesPage() {
  const [selected, setSelected] = useState<any>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['retailer-invoices'],
    queryFn: async () => {
      const res = await api.get('/orders?status=delivered&limit=50');
      return res.data?.data ?? [];
    },
  });
  const orders: any[] = ordersData || [];

  const totalBilled   = orders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const totalGST      = Math.round(totalBilled * 0.05);
  const thisMonth     = orders.filter((o: any) => new Date(o.created_at).getMonth() === new Date().getMonth()).length;

  return (
    <div className="animate-in">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Invoices',   val: orders.length,        sub: 'All delivered orders', cls: '' },
          { label: 'Total Billed',     val: fmt(totalBilled),     sub: 'Exc. GST',             cls: '' },
          { label: 'GST Paid',         val: fmt(totalGST),        sub: 'CGST + SGST @ 5%',    cls: 'amber' },
          { label: 'This Month',       val: thisMonth,            sub: 'Invoices generated',   cls: '' },
        ].map(s => (
          <div key={s.label} className={`stat-card${s.cls ? ' '+s.cls : ''}`}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800 }}>{s.val}</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Invoice table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Invoice History</span>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-faint)' }}>Loading invoices…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Invoice #</th><th>Order</th><th>Date</th><th>Amount (excl. GST)</th><th>GST (5%)</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o: any, i: number) => {
                const sub = Number(o.total_amount);
                const gst = Math.round(sub * 0.05);
                return (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>INV-2025-{String(i + 1).padStart(4, '0')}</td>
                    <td style={{ fontWeight: 500 }}>{o.order_number}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>{fmt(sub)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmt(gst)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--emerald-700)' }}>{fmt(sub + gst)}</td>
                    <td><span className="badge badge-green">Paid</span></td>
                    <td>
                      <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setSelected(o)}>
                        View Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>No delivered orders found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && <GSTInvoiceModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
