'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Modal from '@/components/ui/Modal';
import { Icons, IconX } from '@/components/ui/Icons';
import DatePicker from '@/components/ui/DatePicker';

type Tab = 'grn' | 'dispatches';

const DD: React.CSSProperties = {
  padding: '6px 28px 6px 10px', borderRadius: 8, fontSize: 13,
  border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
  appearance: 'none', color: '#374151', minWidth: 150,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
};

export default function WarehousePage() {
  const [tab, setTab] = useState<Tab>('grn');
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState<string | null>(null);
  const [expandedGRN, setExpandedGRN] = useState<string | null>(null);
  const [expandedDispatch, setExpandedDispatch] = useState<string | null>(null);

  // GRN filters
  const [grnWarehouse, setGrnWarehouse] = useState('');
  const [grnStatus, setGrnStatus]       = useState('');
  const [grnFrom, setGrnFrom]           = useState('');
  const [grnTo, setGrnTo]               = useState('');

  // Dispatch filters
  const [dispStatus, setDispStatus] = useState('');

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get('/warehouse')).data });
  const { data: grns, refetch: refetchGRN } = useQuery({
    queryKey: ['grns', grnWarehouse, grnStatus, grnFrom, grnTo],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '200' });
      if (grnWarehouse) p.set('warehouseId', grnWarehouse);
      if (grnStatus)    p.set('status', grnStatus);
      if (grnFrom)      p.set('dateFrom', grnFrom);
      if (grnTo)        p.set('dateTo', grnTo);
      return (await api.get(`/warehouse/grn?${p}`)).data;
    },
  });
  const { data: dispatches } = useQuery({
    queryKey: ['dispatches', dispStatus],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '200' });
      if (dispStatus) p.set('status', dispStatus);
      return (await api.get(`/warehouse/dispatches?${p}`)).data;
    },
  });
  const { data: pendingOrders } = useQuery({
    queryKey: ['orders-confirmed'],
    queryFn: async () => (await api.get('/orders?status=confirmed')).data,
    enabled: tab === 'dispatches',
  });

  const warehouseList: any[] = warehouses?.data || [];
  const grnList: any[] = grns?.data || [];
  const dispatchList: any[] = dispatches?.data || [];

  const qc = useQueryClient();
  const deliverMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/warehouse/dispatches/${id}/deliver`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispatches'] }),
  });

  return (
    <div className="animate-in">
      {/* Warehouse Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {warehouseList.map((wh: any) => (
          <div key={wh.id} className="stat-card amber" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>{wh.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Code: <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{wh.code}</code>
                </div>
              </div>
              <span className="badge badge-green">Active</span>
            </div>
            {wh.manager_name && <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>Manager: <strong style={{ color: '#1a1d23' }}>{wh.manager_name}</strong></div>}
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f4f6f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['grn', 'dispatches'] as Tab[]).map(t => (
          <button type="button" key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#059669' : '#6b7280',
            border: tab === t ? '1px solid #e5e7eb' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
          }}>{t === 'grn' ? 'Goods Receipt (GRN)' : 'Dispatches'}</button>
        ))}
      </div>

      {/* GRN Tab */}
      {tab === 'grn' && (
        <div>
          {/* GRN Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Filter:</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Warehouse</label>
              <select value={grnWarehouse} onChange={e => setGrnWarehouse(e.target.value)} style={DD}>
                <option value="">All warehouses</option>
                {warehouseList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Status</label>
              <select value={grnStatus} onChange={e => setGrnStatus(e.target.value)} style={DD}>
                <option value="">Any status</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>From</label>
              <DatePicker value={grnFrom} onChange={setGrnFrom} placeholder="From date" style={{ fontSize: 12 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>To</label>
              <DatePicker value={grnTo} onChange={setGrnTo} placeholder="To date" min={grnFrom||undefined} style={{ fontSize: 12 }} />
            </div>

            {(grnWarehouse || grnStatus || grnFrom || grnTo) && (
              <button type="button" onClick={() => { setGrnWarehouse(''); setGrnStatus(''); setGrnFrom(''); setGrnTo(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}><IconX size={9} strokeWidth={2} /> Clear</button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{grnList.length} GRN{grnList.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Goods Receipt Notes</span>
              <button type="button" className="btn-primary" id="create-grn-btn" onClick={() => setShowGRNModal(true)}>+ Create GRN</button>
            </div>
            <table className="data-table">
              <thead><tr>
                <th style={{ width: 32 }}></th>
                <th>GRN #</th><th>Warehouse</th><th>Supplier</th><th>Received By</th><th>Status</th><th>Date</th>
              </tr></thead>
              <tbody>
                {grnList.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Icons.Clipboard size={32} color="#d1d5db" />
                      <span>No GRNs match your filters</span>
                    </div>
                  </td></tr>
                ) : grnList.map((grn: any) => (
                  <GRNAccordionRow
                    key={grn.id}
                    grn={grn}
                    expanded={expandedGRN === grn.id}
                    onToggle={() => setExpandedGRN(expandedGRN === grn.id ? null : grn.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatches Tab */}
      {tab === 'dispatches' && (
        <div>
          {/* Dispatch Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Filter:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Status</label>
              <select value={dispStatus} onChange={e => setDispStatus(e.target.value)} style={DD}>
                <option value="">Any status</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            {dispStatus && (
              <button type="button" onClick={() => setDispStatus('')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}><IconX size={9} strokeWidth={2} /> Clear</button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{dispatchList.length} dispatch{dispatchList.length !== 1 ? 'es' : ''}</span>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Dispatches</span>
              <button type="button" className="btn-primary" id="dispatch-order-btn" onClick={() => setShowDispatchModal('pick')}>+ Dispatch Order</button>
            </div>
            <table className="data-table">
              <thead><tr>
                <th style={{ width: 32 }}></th>
                <th>Dispatch #</th><th>Order #</th><th>Business</th><th>Vehicle</th><th>Driver</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {dispatchList.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Icons.Truck size={32} color="#d1d5db" />
                      <span>No dispatches match your filters</span>
                    </div>
                  </td></tr>
                ) : dispatchList.map((d: any) => (
                  <DispatchAccordionRow
                    key={d.id}
                    dispatch={d}
                    expanded={expandedDispatch === d.id}
                    onToggle={() => setExpandedDispatch(expandedDispatch === d.id ? null : d.id)}
                    onDeliver={() => deliverMutation.mutate(d.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGRNModal && <GRNModal warehouses={warehouseList} onClose={() => { setShowGRNModal(false); refetchGRN(); }} />}
      {showDispatchModal && (
        <DispatchModal
          orders={pendingOrders?.data || []}
          onClose={() => setShowDispatchModal(null)}
          onSuccess={() => { setShowDispatchModal(null); qc.invalidateQueries({ queryKey: ['dispatches'] }); }}
        />
      )}
    </div>
  );
}

/* ── GRN Accordion Row ──────────────────────────────── */
function GRNAccordionRow({ grn, expanded, onToggle }: { grn: any; expanded: boolean; onToggle: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['grn-detail', grn.id],
    queryFn: async () => (await api.get(`/warehouse/grn/${grn.id}`)).data.data,
    enabled: expanded,
    staleTime: 60000,
  });

  const items: any[] = detail?.batches || [];

  return (
    <>
      {/* Main row */}
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          background: expanded ? '#f0fdf4' : undefined,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#f9fafb'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = ''; }}
      >
        <td style={{ width: 32, paddingRight: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6,
            background: expanded ? '#dcfce7' : '#f3f4f6',
            transition: 'background 0.15s, transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            <Icons.ChevronRight size={12} color={expanded ? '#059669' : '#9ca3af'} />
          </span>
        </td>
        <td><strong style={{ color: '#059669' }}>{grn.grn_number}</strong></td>
        <td>{grn.warehouse_name || '—'}</td>
        <td style={{ color: '#6b7280' }}>{grn.supplier_name || '—'}</td>
        <td style={{ fontSize: 12, color: '#6b7280' }}>{grn.received_by_name || '—'}</td>
        <td><span className={`badge ${grn.status === 'completed' ? 'badge-green' : grn.status === 'draft' ? 'badge-amber' : 'badge-red'}`}>{grn.status}</span></td>
        <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(grn.received_at || grn.created_at).toLocaleDateString('en-IN')}</td>
      </tr>

      {/* Expandable detail row */}
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0, borderTop: 'none' }}>
            <div style={{
              background: '#f8fffe', borderTop: '2px solid #d1fae5',
              borderBottom: '2px solid #d1fae5', padding: '14px 20px 16px 52px',
              animation: 'fadeIn 0.15s ease',
            }}>
              {isLoading ? (
                <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Clock size={14} color="#9ca3af" /> Loading items…
                </div>
              ) : items.length === 0 ? (
                <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: 13 }}>No items recorded in this GRN.</div>
              ) : (
                <>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr 1fr', gap: 12, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #d1fae5' }}>
                    {['Product', 'Manufacturer', 'SKU / Batch', 'Qty', 'Mfg Date', 'Expiry'].map(h => (
                      <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>
                  {/* Item rows */}
                  {items.map((item: any, idx: number) => (
                    <div key={idx} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr 1fr', gap: 12,
                      padding: '8px 0', borderBottom: idx < items.length - 1 ? '1px solid #ecfdf5' : 'none',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1d23' }}>{item.product_name || item.name || '—'}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{item.manufacturer || '—'}</div>
                      <div>
                        <code style={{ fontSize: 11, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, color: '#4b5563', display: 'block', marginBottom: 2 }}>
                          {item.sku || '—'}
                        </code>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Batch: <strong style={{ color: '#374151' }}>{item.batch_number || '—'}</strong></span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>
                        {Number(item.received_qty || item.quantity || 0).toFixed(0)}
                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400, marginLeft: 3 }}>{item.unit || ''}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {item.manufacture_date ? new Date(item.manufacture_date).toLocaleDateString('en-IN') : '—'}
                      </div>
                      <div>
                        {item.expiry_date ? (
                          (() => {
                            const daysLeft = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / 86400000);
                            return (
                              <span style={{ fontSize: 12, fontWeight: 600, color: daysLeft < 90 ? '#dc2626' : daysLeft < 180 ? '#d97706' : '#059669' }}>
                                {new Date(item.expiry_date).toLocaleDateString('en-IN')}
                                <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>({daysLeft}d)</span>
                              </span>
                            );
                          })()
                        ) : '—'}
                      </div>
                    </div>
                  ))}
                  {/* Footer summary */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #d1fae5', display: 'flex', gap: 20, fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}>
                      <strong style={{ color: '#1a1d23' }}>{items.length}</strong> product line{items.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      Total units: <strong style={{ color: '#059669' }}>
                        {items.reduce((s: number, i: any) => s + Number(i.received_qty || i.quantity || 0), 0).toFixed(0)}
                      </strong>
                    </span>
                    {grn.invoice_number && (
                      <span style={{ color: '#6b7280' }}>Invoice: <strong style={{ color: '#1a1d23' }}>{grn.invoice_number}</strong></span>
                    )}
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Dispatch Accordion Row ─────────────────────────── */
function DispatchAccordionRow({ dispatch: d, expanded, onToggle, onDeliver }: { dispatch: any; expanded: boolean; onToggle: () => void; onDeliver: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['dispatch-detail', d.id],
    queryFn: async () => (await api.get(`/warehouse/dispatches/${d.id}`)).data.data,
    enabled: expanded,
    staleTime: 60000,
  });

  const items: any[] = detail?.items || [];

  return (
    <>
      {/* Main row */}
      <tr
        onClick={onToggle}
        style={{ cursor: 'pointer', background: expanded ? '#eff6ff' : undefined, transition: 'background 0.15s' }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#f9fafb'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = ''; }}
      >
        <td style={{ width: 32, paddingRight: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6,
            background: expanded ? '#dbeafe' : '#f3f4f6',
            transition: 'background 0.15s, transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            <Icons.ChevronRight size={12} color={expanded ? '#2563eb' : '#9ca3af'} />
          </span>
        </td>
        <td><strong>{d.dispatch_number}</strong></td>
        <td style={{ color: '#059669' }}>{d.order_number}</td>
        <td style={{ fontSize: 13 }}>{d.business_name || '—'}</td>
        <td style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{d.vehicle_number || '—'}</td>
        <td style={{ color: '#6b7280' }}>{d.driver_name || '—'}</td>
        <td>
          <span className={`badge ${d.status === 'delivered' ? 'badge-green' : d.status === 'in_transit' ? 'badge-blue' : 'badge-amber'}`}>
            {d.status?.replace('_', ' ')}
          </span>
        </td>
        <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
        <td onClick={e => e.stopPropagation()}>
          {d.status === 'in_transit' && (
            <button type="button" onClick={onDeliver}
              style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', border: '1px solid #d1fae5', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
              Mark Delivered
            </button>
          )}
        </td>
      </tr>

      {/* Expandable detail row */}
      {expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0, borderTop: 'none' }}>
            <div style={{
              background: '#f0f7ff', borderTop: '2px solid #bfdbfe',
              borderBottom: '2px solid #bfdbfe', padding: '14px 20px 16px 52px',
              animation: 'fadeIn 0.15s ease',
            }}>
              {/* Logistics metadata bar */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Vehicle', value: d.vehicle_number },
                  { label: 'Driver', value: d.driver_name },
                  { label: 'Phone', value: d.driver_phone },
                  { label: 'LR No.', value: d.lr_number },
                  { label: 'Dispatched', value: d.dispatched_at ? new Date(d.dispatched_at).toLocaleDateString('en-IN') : null },
                  { label: 'Delivered', value: d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-IN') : null },
                ].filter(m => m.value).map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', marginTop: 2 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {isLoading ? (
                <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Clock size={14} color="#9ca3af" /> Loading items…
                </div>
              ) : items.length === 0 ? (
                <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: 13 }}>No items found for this dispatch.</div>
              ) : (
                <>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr', gap: 12, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #bfdbfe' }}>
                    {['Product', 'Manufacturer', 'SKU / Batch', 'Qty', 'Expiry'].map(h => (
                      <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>
                  {/* Item rows */}
                  {items.map((item: any, idx: number) => (
                    <div key={idx} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr', gap: 12,
                      padding: '8px 0', borderBottom: idx < items.length - 1 ? '1px solid #dbeafe' : 'none',
                      alignItems: 'center',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1d23' }}>{item.product_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>{item.manufacturer || '—'}</div>
                      <div>
                        <code style={{ fontSize: 11, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, color: '#4b5563', display: 'block', marginBottom: 2 }}>{item.sku || '—'}</code>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Batch: <strong style={{ color: '#374151' }}>{item.batch_number || '—'}</strong></span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>
                        {Number(item.quantity || 0).toFixed(0)}
                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400, marginLeft: 3 }}>{item.unit || ''}</span>
                      </div>
                      <div>
                        {item.expiry_date ? (
                          (() => {
                            const daysLeft = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / 86400000);
                            return (
                              <span style={{ fontSize: 12, fontWeight: 600, color: daysLeft < 90 ? '#dc2626' : daysLeft < 180 ? '#d97706' : '#059669' }}>
                                {new Date(item.expiry_date).toLocaleDateString('en-IN')}
                                <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>({daysLeft}d)</span>
                              </span>
                            );
                          })()
                        ) : '—'}
                      </div>
                    </div>
                  ))}
                  {/* Footer */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #bfdbfe', display: 'flex', gap: 20, fontSize: 12 }}>
                    <span style={{ color: '#6b7280' }}><strong style={{ color: '#1a1d23' }}>{items.length}</strong> product line{items.length !== 1 ? 's' : ''}</span>
                    <span style={{ color: '#6b7280' }}>Total qty: <strong style={{ color: '#2563eb' }}>{items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0).toFixed(0)}</strong></span>
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── GRN Creation Modal ─────────────────────────── */
function GRNModal({ warehouses, onClose }: { warehouses: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([{ productId: '', manufacturer: '', batchNumber: '', receivedQty: 1, expiryDate: '', manufactureDate: '' }]);

  const { data: productsData } = useQuery({ queryKey: ['products-list'], queryFn: async () => (await api.get('/products')).data.data });
  const products: any[] = productsData || [];

  // Group products by manufacturer for optgroup
  const productsByMfr = products.reduce((acc: Record<string, any[]>, p: any) => {
    const mfr = p.manufacturer || 'Generic';
    if (!acc[mfr]) acc[mfr] = [];
    acc[mfr].push(p);
    return acc;
  }, {});

  const getManufacturer = (productId: string) => products.find(p => p.id === productId)?.manufacturer || '';

  const handleProductChange = (i: number, productId: string) => {
    const mfr = getManufacturer(productId);
    updateRow(i, 'productId', productId);
    setItems(prev => prev.map((r, idx) => idx === i ? { ...r, productId, manufacturer: mfr } : r));
  };

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/warehouse/grn', {
      warehouseId, supplierName, invoiceNumber,
      items: items.map(i => ({ productId: i.productId, batchNumber: i.batchNumber, receivedQty: Number(i.receivedQty), expiryDate: i.expiryDate || undefined, manufactureDate: i.manufactureDate || undefined })),
    })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grns'] }); onClose(); },
  });

  const addRow = () => setItems([...items, { productId: '', manufacturer: '', batchNumber: '', receivedQty: 1, expiryDate: '', manufactureDate: '' }]);
  const removeRow = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: string, value: string | number) => setItems(items.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  return (
    <Modal title="Create Goods Receipt Note" onClose={onClose} size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => mutation.mutate()}
            disabled={!warehouseId || items.some(i => !i.productId || !i.batchNumber) || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Create GRN'}
          </button>
        </>
      }>
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="field-group">
          <label className="field-label">Warehouse</label>
          <select className="form-input" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Supplier Name</label>
          <input className="form-input" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier name…" />
        </div>
        <div className="field-group">
          <label className="field-label">Invoice Number</label>
          <input className="form-input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-…" />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label className="field-label" style={{ margin: 0 }}>Items Received</label>
          <button type="button" className="btn-secondary" onClick={addRow} style={{ fontSize: 12, padding: '4px 12px' }}>+ Add Row</button>
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <div>
              {i === 0 && <label className="field-label">Product</label>}
              <select className="form-input" value={item.productId} onChange={e => handleProductChange(i, e.target.value)}>
                <option value="">Select…</option>
                {Object.entries(productsByMfr).sort(([a], [b]) => a.localeCompare(b)).map(([mfr, mfrProds]) => (
                  <optgroup key={mfr} label={mfr}>
                    {(mfrProds as any[]).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              {i === 0 && <label className="field-label">Manufacturer</label>}
              <input className="form-input" value={item.manufacturer} readOnly
                placeholder="Auto-filled"
                style={{ background: '#f8f9fb', color: item.manufacturer ? '#059669' : '#9ca3af', fontWeight: item.manufacturer ? 600 : 400, cursor: 'default' }} />
            </div>
            <div>
              {i === 0 && <label className="field-label">Batch #</label>}
              <input className="form-input" value={item.batchNumber} onChange={e => updateRow(i, 'batchNumber', e.target.value)} placeholder="BATCH-001" />
            </div>
            <div>
              {i === 0 && <label className="field-label">Qty</label>}
              <input className="form-input" type="number" min={1} value={item.receivedQty} onChange={e => updateRow(i, 'receivedQty', e.target.value)} />
            </div>
            <div>
              {i === 0 && <label className="field-label">Mfg Date</label>}
              <DatePicker value={item.manufactureDate} onChange={v => updateRow(i, 'manufactureDate', v)} placeholder="Mfg date" />
            </div>
            <div>
              {i === 0 && <label className="field-label">Expiry</label>}
              <DatePicker value={item.expiryDate} onChange={v => updateRow(i, 'expiryDate', v)} placeholder="Expiry date" min={item.manufactureDate||undefined} />
            </div>
            <button type="button" onClick={() => removeRow(i)} disabled={items.length === 1} className="modal-close" style={{ alignSelf: 'flex-end', marginBottom: i === 0 ? 20 : 0 }}><IconX size={10} strokeWidth={1.8} /></button>
          </div>
        ))}
      </div>
      {mutation.isError && <div className="field-error" style={{ marginTop: 12 }}>Failed to create GRN. Check all fields.</div>}
    </Modal>
  );
}

/* ── Dispatch Modal ──────────────────────────────── */
function DispatchModal({ orders, onClose, onSuccess }: { orders: any[]; onClose: () => void; onSuccess: () => void }) {
  const [orderId, setOrderId]           = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName]     = useState('');
  const [driverPhone, setDriverPhone]   = useState('');
  const [attempted, setAttempted]       = useState(false);

  const vehicleOk = vehicleNumber.trim().length > 0;
  const driverOk  = driverName.trim().length > 0;
  const canSubmit = !!orderId && vehicleOk && driverOk;

  const combinedMutation = useMutation({
    mutationFn: async () => (await api.post(`/warehouse/dispatch/${orderId}`, { vehicleNumber: vehicleNumber.trim(), driverName: driverName.trim(), driverPhone: driverPhone.trim() || undefined })).data,
    onSuccess: () => onSuccess(),
    onError: () => {},
  });

  const handleSubmit = () => {
    setAttempted(true);
    if (!canSubmit) return;
    combinedMutation.mutate();
  };

  return (
    <Modal title="Dispatch Order" onClose={onClose} size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSubmit}
            disabled={combinedMutation.isPending}>
            {combinedMutation.isPending ? 'Dispatching…' : 'Pick & Dispatch'}
          </button>
        </>
      }>
      <div className="field-group">
        <label className="field-label">Select Order <span style={{ fontSize: 11, color: '#059669', fontWeight: 400 }}>(Confirmed — ready to dispatch)</span></label>
        <select className="form-input" value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">Select order to dispatch…</option>
          {orders.map((o: any) => <option key={o.id} value={o.id}>{o.order_number} — {o.business_name}</option>)}
        </select>
        {attempted && !orderId && <div className="field-error">Please select an order.</div>}
        {orders.length === 0 && <div className="field-hint">No confirmed orders ready to dispatch. Confirm an order first from the Orders page.</div>}
      </div>
      <div className="field-group">
        <label className="field-label">
          Vehicle Number <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          className="form-input"
          value={vehicleNumber}
          onChange={e => setVehicleNumber(e.target.value)}
          placeholder="MH 12 AB 1234"
          style={attempted && !vehicleOk ? { borderColor: '#ef4444' } : {}}
        />
        {attempted && !vehicleOk && <div className="field-error">Vehicle number is required.</div>}
      </div>
      <div className="grid-2">
        <div className="field-group">
          <label className="field-label">
            Driver Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            className="form-input"
            value={driverName}
            onChange={e => setDriverName(e.target.value)}
            placeholder="Driver name"
            style={attempted && !driverOk ? { borderColor: '#ef4444' } : {}}
          />
          {attempted && !driverOk && <div className="field-error">Driver name is required.</div>}
        </div>
        <div className="field-group">
          <label className="field-label">Driver Phone <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
          <input className="form-input" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="+91 …" />
        </div>
      </div>
      {combinedMutation.isError && <div className="field-error">Dispatch failed. Ensure the order has inventory reserved and a warehouse assigned.</div>}
    </Modal>
  );
}
