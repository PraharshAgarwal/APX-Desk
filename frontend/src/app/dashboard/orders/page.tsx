'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import CreateOrderModal from '@/components/ui/CreateOrderModal';
import Modal from '@/components/ui/Modal';
import { Icons, IconX, IconWarning } from '@/components/ui/Icons';
import { useToast } from '@/hooks/useToast';

// ── Helpers ───────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-blue',
  dispatched: 'badge-stone', delivered: 'badge-green', cancelled: 'badge-red',
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_COLORS[status] || 'badge-stone'}`} style={{ textTransform: 'capitalize' }}>{status}</span>;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => 2024 + i).concat([CURRENT_YEAR + 1]);

// ── Order Accordion Row ───────────────────────────────────────

function OrderAccordionRow({ order, expanded, onToggle, canManage, isRetailer, onManage }: {
  order: any; expanded: boolean; onToggle: () => void;
  canManage: boolean; isRetailer: boolean; onManage: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['order-detail', order.id],
    queryFn: async () => (await api.get(`/orders/${order.id}`)).data.data,
    enabled: expanded,
    staleTime: 30000,
  });

  const items: any[] = detail?.items || [];
  const history: any[] = detail?.statusHistory || [];
  const colCount = isRetailer ? 5 : 6;

  return (
    <>
      {/* Main clickable row */}
      <tr
        onClick={onToggle}
        style={{ cursor: 'pointer', background: expanded ? '#f0fdf4' : undefined, transition: 'background 0.15s' }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#f9fafb'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = ''; }}
      >
        {/* Chevron */}
        <td style={{ width: 28, paddingRight: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, borderRadius: 5,
            background: expanded ? '#dcfce7' : '#f3f4f6',
            transition: 'transform 0.2s, background 0.15s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2L6.5 5L3.5 8" stroke={expanded ? '#16a34a' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </td>
        <td>
          <strong style={{ color: '#059669' }}>{order.order_number}</strong>
          {order.warehouse_name && <div className="sub">{order.warehouse_name}</div>}
        </td>
        {!isRetailer && <td style={{ fontSize: 13 }}>{order.business_name}</td>}
        <td><span className="badge badge-stone">{order.item_count} items</span></td>
        <td><strong>₹{Number(order.total_amount).toLocaleString('en-IN')}</strong></td>
        <td><StatusBadge status={order.status} /></td>
        <td style={{ color: '#6b7280', fontSize: 12 }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
        {canManage && (
          <td onClick={e => e.stopPropagation()}>
            <button onClick={onManage}
              style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', border: '1px solid #d1fae5', padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}>
              Manage →
            </button>
          </td>
        )}
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr>
          <td colSpan={colCount + (canManage ? 3 : 2)} style={{ padding: 0, borderTop: 'none' }}>
            <div style={{
              background: '#f0fdf4', borderTop: '2px solid #bbf7d0',
              borderBottom: '2px solid #bbf7d0', padding: '14px 20px 16px 52px',
              animation: 'fadeIn 0.15s ease',
            }}>
              {isLoading ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>Loading order details…</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>

                  {/* ── Items grid ── */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Line Items
                    </div>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.6fr 1fr', gap: 10, paddingBottom: 6, borderBottom: '1px solid #bbf7d0', marginBottom: 4 }}>
                      {['Product', 'SKU', 'Qty', 'Unit Price', 'Line Total'].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                      ))}
                    </div>
                    {items.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0' }}>No items recorded.</div>
                    ) : items.map((item: any, idx: number) => (
                      <div key={idx} style={{
                        display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.6fr 1fr', gap: 10,
                        padding: '7px 0', borderBottom: idx < items.length - 1 ? '1px solid #dcfce7' : 'none',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1d23' }}>{item.product_name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.unit}</div>
                        </div>
                        <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 5px', borderRadius: 4, color: '#4b5563' }}>{item.sku || '—'}</code>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1d23' }}>
                          {Number(item.quantity).toFixed(0)}
                          {item.discount_pct > 0 && <span style={{ fontSize: 10, color: '#059669', marginLeft: 4 }}>-{item.discount_pct}%</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</div>
                        <div style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>₹{Number(item.line_total).toLocaleString('en-IN')}</div>
                      </div>
                    ))}

                    {/* Order totals */}
                    {items.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #bbf7d0', display: 'flex', gap: 20, fontSize: 12 }}>
                        <span style={{ color: '#6b7280' }}>{items.length} line{items.length !== 1 ? 's' : ''}</span>
                        <span style={{ color: '#6b7280' }}>
                          Total: <strong style={{ color: '#059669', fontSize: 14 }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</strong>
                        </span>
                        {detail?.notes && (
                          <span style={{ color: '#6b7280' }}>Notes: <em style={{ color: '#374151' }}>{detail.notes}</em></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Status history timeline ── */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Status History
                    </div>
                    {history.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#9ca3af' }}>No history available.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {history.map((h: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 10, position: 'relative' }}>
                            {/* Timeline dot + line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              <div style={{
                                width: 10, height: 10, borderRadius: '50%', marginTop: 2, flexShrink: 0,
                                background: h.to_status === 'delivered' ? '#16a34a' :
                                  h.to_status === 'cancelled' ? '#dc2626' :
                                  h.to_status === 'dispatched' ? '#6366f1' : '#059669',
                              }} />
                              {idx < history.length - 1 && (
                                <div style={{ width: 1, flex: 1, minHeight: 14, background: '#d1fae5', marginTop: 2 }} />
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                                {h.to_status}
                                {h.from_status && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>← {h.from_status}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                                {new Date(h.changed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                {h.changed_by_name && <span> · {h.changed_by_name}</span>}
                              </div>
                              {h.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontStyle: 'italic' }}>{h.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function OrdersPage() {
  const { hasAnyRole, primaryRole } = useAuthStore();
  const isRetailer = primaryRole() === 'retailer';
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, year, month],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '200' });
      if (statusFilter) p.set('status', statusFilter);
      if (year)  p.set('year', year);
      if (month) p.set('month', month);
      return (await api.get(`/orders?${p}`)).data;
    },
  });

  const toast = useToast();

  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) =>
      (await api.patch(`/orders/${orderId}/status`, { status })).data,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order-detail'] });
      setSelectedOrder(null);
      toast.success(`Order status updated to ${vars.status}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    },
  });

  const orders = data?.data || [];
  const canManage = hasAnyRole(['admin', 'sales_executive', 'warehouse_manager']);
  const STATUS_FILTERS = ['', 'pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'];
  const colCount = isRetailer ? 5 : 6;

  return (
    <div className="animate-in">
      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s || 'all'} id={`filter-${s || 'all'}`} onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: statusFilter === s ? '1px solid #059669' : '1px solid #e5e7eb',
                background: statusFilter === s ? '#ecfdf5' : '#fff',
                color: statusFilter === s ? '#059669' : '#6b7280',
                textTransform: 'capitalize',
              }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Year dropdown */}
        <select value={year} onChange={e => setYear(e.target.value)}
          style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: year ? '1px solid #059669' : '1px solid #e5e7eb', background: year ? '#ecfdf5' : '#fff', color: year ? '#059669' : '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
          <option value="">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Month dropdown */}
        <select value={month} onChange={e => setMonth(e.target.value)}
          style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: month ? '1px solid #059669' : '1px solid #e5e7eb', background: month ? '#ecfdf5' : '#fff', color: month ? '#059669' : '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>

        {/* Clear filters */}
        {(statusFilter || year || month) && (
          <button onClick={() => { setStatusFilter(''); setYear(''); setMonth(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            <IconX size={9} strokeWidth={2} /> Clear
          </button>
        )}
      </div>

      {/* ── Orders card ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {isRetailer ? 'My Orders' : 'Orders'} ({data?.meta?.total ?? orders.length})
            {(year || month) && (
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                {month ? MONTHS[parseInt(month) - 1] : ''} {year}
              </span>
            )}
          </span>
          {hasAnyRole(['admin', 'sales_executive', 'retailer']) && (
            <button className="btn-primary" id="new-order-btn" onClick={() => setShowOrderModal(true)}>+ New Order</button>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading orders…</div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th style={{ width: 28 }}></th>
              <th>Order #</th>
              {!isRetailer && <th>Business</th>}
              <th>Items</th><th>Total</th><th>Status</th><th>Date</th>
              {canManage && <th>Actions</th>}
            </tr></thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={colCount + (canManage ? 3 : 2)} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No orders found</td></tr>
              ) : orders.map((order: any) => (
                <OrderAccordionRow
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  canManage={canManage}
                  isRetailer={isRetailer}
                  onManage={() => setSelectedOrder(order)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrder && <StatusModal order={selectedOrder} onClose={() => setSelectedOrder(null)}
        onStatusChange={(s: string) => statusMutation.mutate({ orderId: selectedOrder.id, status: s })} isLoading={statusMutation.isPending} />}
      {showOrderModal && <CreateOrderModal onClose={() => setShowOrderModal(false)} />}
    </div>
  );
}

// ── Status Modal (Manage) ─────────────────────────────────────

function StatusModal({ order, onClose, onStatusChange, isLoading }: any) {
  const qc = useQueryClient();
  const toast = useToast();
  const [warehouseId, setWarehouseId] = useState('');
  const needsWarehouse = order.status === 'pending' && !order.warehouse_id;

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: async () => (await api.get('/warehouse')).data.data,
    enabled: needsWarehouse,
  });
  const warehouses: any[] = warehousesData || [];

  const assignMutation = useMutation({
    mutationFn: async () => (await api.patch(`/orders/${order.id}/warehouse`, { warehouseId })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); onClose(); toast.success('Warehouse assigned'); },
    onError: (err: unknown) => { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Assignment failed'); },
  });

  const T: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['dispatched'],
    dispatched: ['delivered'],
  };
  const next = T[order.status] || [];

  return (
    <Modal title={`Manage — ${order.order_number}`} onClose={onClose} size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {needsWarehouse ? (
            <button className="btn-primary" onClick={() => assignMutation.mutate()}
              disabled={!warehouseId || assignMutation.isPending}>
              {assignMutation.isPending ? '…' : 'Assign Warehouse'}
            </button>
          ) : next.map((s) => (
            <button key={s} id={`status-btn-${s}`}
              className={s === 'cancelled' ? 'btn-danger' : 'btn-primary'}
              onClick={() => onStatusChange(s)} disabled={isLoading}>
              {isLoading ? '…' : `→ ${s.charAt(0).toUpperCase() + s.slice(1)}`}
            </button>
          ))}
        </>
      }>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 16px' }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Current status:</span>
        <span className={`badge ${STATUS_COLORS[order.status] || 'badge-stone'}`} style={{ textTransform: 'capitalize' }}>{order.status}</span>
        {order.warehouse_id && (
          <span style={{ fontSize: 12, color: '#059669', background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 6, padding: '2px 8px' }}>
            {order.warehouse_name || 'Warehouse assigned'}
          </span>
        )}
      </div>

      {needsWarehouse && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#92400e' }}>
            <IconWarning size={14} /> No warehouse assigned — required before confirming
          </div>
          <select className="form-input" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="">Select warehouse…</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </select>
          {assignMutation.isError && <div className="field-error" style={{ marginTop: 6 }}>Failed to assign warehouse.</div>}
        </div>
      )}

      {next.length === 0 ? (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          This order has no further transitions.
        </div>
      ) : !needsWarehouse && (
        <div style={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available transitions</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {next.map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>→</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
