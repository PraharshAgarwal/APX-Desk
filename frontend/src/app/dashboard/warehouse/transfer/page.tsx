'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import QueryError from '@/components/ui/QueryError';

// ── Status badge ───────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: '#eff6ff', color: '#2563eb', label: 'Pending' },
  in_transit:  { bg: '#fffbeb', color: '#d97706', label: 'In Transit' },
  completed:   { bg: '#ecfdf5', color: '#059669', label: 'Completed' },
  cancelled:   { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function TransferPage() {
  const qc = useQueryClient();

  const [fromWH, setFromWH]   = useState('');
  const [toWH, setToWH]       = useState('');
  const [notes, setNotes]     = useState('');
  const [items, setItems]     = useState([{ batchId: '', quantity: '' }]);
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Queries ────────────────────────────────────────────────
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn:  async () => (await api.get('/warehouse')).data,
  });

  const {
    data: transfersData,
    isError: transfersErr,
    refetch: refetchTransfers,
  } = useQuery({
    queryKey: ['transfers'],
    queryFn:  async () => (await api.get('/warehouse/transfer')).data,
  });

  const { data: stockData } = useQuery({
    queryKey: ['stock-in-wh', fromWH],
    queryFn:  async () => (await api.get(`/inventory/stock?warehouseId=${fromWH}`)).data,
    enabled: !!fromWH,
  });

  const warehouses: any[] = warehousesData?.data || [];
  const transfers:  any[] = transfersData?.data  || [];
  const batches:    any[] = stockData?.data       || [];

  // ── Mutations ──────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/warehouse/transfer', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['stock-in-wh'] });
      setFormMsg({ type: 'ok', text: 'Transfer initiated — stock is now in transit.' });
      setFromWH(''); setToWH(''); setNotes('');
      setItems([{ batchId: '', quantity: '' }]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || 'Failed to create transfer';
      setFormMsg({ type: 'err', text: msg });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'complete' | 'cancel' }) =>
      api.patch(`/warehouse/transfer/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['stock-in-wh'] });
    },
  });

  useEffect(() => {
    if (!formMsg) return;
    const t = setTimeout(() => setFormMsg(null), 5000);
    return () => clearTimeout(t);
  }, [formMsg]);

  const setItem = (idx: number, field: string, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  const addItem    = () => setItems(prev => [...prev, { batchId: '', quantity: '' }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromWH === toWH) {
      setFormMsg({ type: 'err', text: 'Source and destination cannot be the same warehouse.' });
      return;
    }
    createMutation.mutate({
      fromWarehouseId: fromWH,
      toWarehouseId:   toWH,
      notes:           notes || undefined,
      items: items.map(it => ({ batchId: it.batchId, quantity: parseFloat(it.quantity) })),
    });
  };

  const fmt     = (n: any) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="page-root animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inter-Warehouse Transfer</h1>
          <p className="page-subtitle">Move stock between warehouses with full traceability</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Create form ───────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Initiate Transfer</span>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '0 16px 16px' }}>

            <div className="form-group">
              <label className="form-label">From Warehouse</label>
              <select
                id="transfer-from-wh"
                className="form-input"
                value={fromWH}
                onChange={e => { setFromWH(e.target.value); setItems([{ batchId: '', quantity: '' }]); }}
                required
              >
                <option value="">Select source warehouse…</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">To Warehouse</label>
              <select
                id="transfer-to-wh"
                className="form-input"
                value={toWH}
                onChange={e => setToWH(e.target.value)}
                required
              >
                <option value="">Select destination warehouse…</option>
                {warehouses.filter((w: any) => w.id !== fromWH).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Items to Transfer</label>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <select
                    className="form-input"
                    style={{ flex: 1, fontSize: 12 }}
                    value={item.batchId}
                    onChange={e => setItem(idx, 'batchId', e.target.value)}
                    required
                    disabled={!fromWH}
                  >
                    <option value="">Select batch…</option>
                    {batches.map((b: any) => (
                      <option key={b.batch_id || b.id} value={b.batch_id || b.id}>
                        {b.product_name} — {b.batch_number} (avail: {fmt(b.available_qty)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: 80, fontSize: 12 }}
                    placeholder="Qty"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={e => setItem(idx, 'quantity', e.target.value)}
                    required
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      style={{
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6,
                        padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 12, flexShrink: 0,
                      }}
                    >✕</button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                style={{
                  background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 6,
                  padding: '4px 12px', cursor: 'pointer', fontSize: 12,
                  color: 'var(--text-secondary)', marginTop: 2,
                }}
              >+ Add product</button>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                id="transfer-notes"
                className="form-input"
                rows={2}
                style={{ resize: 'vertical', minHeight: 56 }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Reason — seasonal rebalancing, redistribution, etc."
              />
            </div>

            {formMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13,
                background: formMsg.type === 'ok' ? '#ecfdf5' : '#fef2f2',
                color:      formMsg.type === 'ok' ? '#059669' : '#dc2626',
                border:     `1px solid ${formMsg.type === 'ok' ? '#d1fae5' : '#fecaca'}`,
              }}>{formMsg.text}</div>
            )}

            <button
              id="submit-transfer-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Initiate Transfer →'}
            </button>
          </form>
        </div>

        {/* ── Transfer history ──────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Transfer History</span>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{transfers.length} records</span>
          </div>

          {transfersErr ? (
            <div style={{ padding: 16 }}>
              <QueryError error={transfersErr} onRetry={refetchTransfers} compact />
            </div>
          ) : transfers.length === 0 ? (
            <div className="empty-cell" style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>
              No transfers yet. Use the form to move stock between warehouses.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transfer #</th>
                    <th>From → To</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t: any) => {
                    const itemList: any[] = t.items || [];
                    return (
                      <tr key={t.id}>
                        <td>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 12,
                            fontWeight: 700, color: '#059669',
                          }}>{t.transfer_number}</span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>{t.from_warehouse_name}</div>
                          <div style={{ color: 'var(--text-faint)', marginTop: 2 }}>↳ {t.to_warehouse_name}</div>
                        </td>
                        <td>
                          {itemList.slice(0, 2).map((it: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {it.product_name}: <strong>{fmt(it.quantity)}</strong>
                            </div>
                          ))}
                          {itemList.length > 2 && (
                            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                              +{itemList.length - 2} more
                            </div>
                          )}
                        </td>
                        <td><StatusBadge status={t.status} /></td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {fmtDate(t.created_at)}
                        </td>
                        <td>
                          {t.status === 'in_transit' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                id={`complete-transfer-${t.id}`}
                                className="btn btn-primary"
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                disabled={actionMutation.isPending}
                                onClick={() => actionMutation.mutate({ id: t.id, action: 'complete' })}
                              >Receive ✓</button>
                              <button
                                id={`cancel-transfer-${t.id}`}
                                style={{
                                  fontSize: 11, padding: '3px 10px', borderRadius: 6,
                                  background: '#fef2f2', border: '1px solid #fecaca',
                                  cursor: 'pointer', color: '#dc2626',
                                }}
                                disabled={actionMutation.isPending}
                                onClick={() => actionMutation.mutate({ id: t.id, action: 'cancel' })}
                              >Cancel</button>
                            </div>
                          )}
                          {t.status === 'completed' && (
                            <span style={{ fontSize: 11, color: '#059669' }}>
                              ✓ {fmtDate(t.completed_at)}
                            </span>
                          )}
                          {t.status === 'cancelled' && (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>Cancelled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
