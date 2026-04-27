'use client';
import React from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Icons, IconCheck } from '@/components/ui/Icons';

export default function WarehouseDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showGRN, setShowGRN] = useState(false);
  // dispatching form state: null = no form open; string = orderId whose form is open
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName]       = useState('');
  const [pickError, setPickError]         = useState<string | null>(null);

  const openDispatchForm = (orderId: string) => {
    setDispatchingId(orderId);
    setVehicleNumber('');
    setDriverName('');
    setPickError(null);
  };
  const closeDispatchForm = () => { setDispatchingId(null); setPickError(null); };

  // Fetch both confirmed + processing orders — both are dispatchable
  const { data: dispatchQueue } = useQuery({
    queryKey: ['orders-dispatchable'],
    queryFn: async () => {
      const [proc, conf] = await Promise.all([
        api.get('/orders?status=processing&limit=50'),
        api.get('/orders?status=confirmed&limit=50'),
      ]);
      return { data: [...(proc.data?.data || []), ...(conf.data?.data || [])] };
    },
  });
  const { data: stock } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: async () => (await api.get('/inventory/stock')).data,
  });
  const { data: nearExpiry } = useQuery({
    queryKey: ['near-expiry'],
    queryFn: async () => (await api.get('/inventory/near-expiry')).data,
  });
  const { data: grns } = useQuery({
    queryKey: ['grns'],
    queryFn: async () => (await api.get('/warehouse/grn')).data,
  });
  const { data: adjustments } = useQuery({
    queryKey: ['adjustments'],
    queryFn: async () => (await api.get('/inventory/adjustments')).data,
  });

  // Dispatch with vehicle + driver — skip separate pick step (service handles it)
  const pickMutation = useMutation({
    mutationFn: async ({ orderId, vehicleNumber, driverName }: { orderId: string; vehicleNumber: string; driverName: string }) =>
      api.post(`/warehouse/dispatch/${orderId}`, { vehicleNumber, driverName }),
    onSuccess: () => {
      setPickError(null);
      closeDispatchForm();
      qc.invalidateQueries({ queryKey: ['orders-dispatchable'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Dispatch failed';
      setPickError(msg);
    },
  });

  const dispatchList: any[]  = dispatchQueue?.data || [];
  const confirmedList: any[] = [];
  const stockItems: any[]    = stock?.data || [];
  const expiryBatches: any[] = nearExpiry?.data || [];
  const grnList: any[] = (grns?.data || []).slice(0, 4);
  const adjList: any[] = (adjustments?.data || []).slice(0, 4);

  // Aggregate by product_id to get total available across all warehouses
  const stockByProduct = stockItems.reduce((acc: Record<string, any>, s: any) => {
    if (!acc[s.product_id]) {
      acc[s.product_id] = { ...s, available_qty: Number(s.available_qty) };
    } else {
      acc[s.product_id].available_qty += Number(s.available_qty);
      // Use earliest expiry
      if (s.nearest_expiry && (!acc[s.product_id].nearest_expiry || s.nearest_expiry < acc[s.product_id].nearest_expiry)) {
        acc[s.product_id].nearest_expiry = s.nearest_expiry;
      }
    }
    return acc;
  }, {});
  const aggregatedStock: any[] = Object.values(stockByProduct);
  const criticalExpiry = expiryBatches.filter((b: any) => b.days_until_expiry <= 7);
  const lowStock = aggregatedStock.filter((s: any) => Number(s.available_qty) < 100);

  return (
    <div className="animate-in">
      {/* Ops Banner */}
      <div style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', borderRadius: 14, padding: '20px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Ops Dashboard — {user?.firstName}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {dispatchList.length > 0
              ? `${dispatchList.length} order${dispatchList.length > 1 ? 's' : ''} ready to dispatch`
              : confirmedList.length > 0 ? `${confirmedList.length} confirmed, waiting processing` : 'All clear — no pending dispatches'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => router.push('/dashboard/warehouse')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.Clipboard size={14} color="#fff" /> GRN
          </button>
          <button type="button" onClick={() => router.push('/dashboard/inventory')} style={{ background: '#fff', border: 'none', color: '#b45309', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            View Inventory
          </button>
        </div>
      </div>

      {/* Operational Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card amber">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Dispatch Queue</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: dispatchList.length > 0 ? '#b45309' : '#1a1d23' }}>{dispatchList.length}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Ready to pick & ship</div>
        </div>
        <div className="stat-card blue">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Confirmed Orders</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>{confirmedList.length}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Awaiting processing</div>
        </div>
        <div className={`stat-card ${criticalExpiry.length > 0 ? 'red' : 'green'}`}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Critical Expiry</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: criticalExpiry.length > 0 ? '#dc2626' : '#059669' }}>{criticalExpiry.length}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Batches expiring ≤7 days</div>
        </div>
        <div className={`stat-card ${lowStock.length > 0 ? 'red' : 'green'}`}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Low Stock SKUs</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: lowStock.length > 0 ? '#dc2626' : '#059669' }}>{lowStock.length}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Below reorder point</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Dispatch Queue */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Truck size={16} color="#d97706" /> Dispatch Queue</span>
            <Link href="/dashboard/warehouse"><span style={{ fontSize: 12, color: '#d97706', fontWeight: 600, cursor: 'pointer' }}>Full dispatch →</span></Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Order #</th><th>Business</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>
              {dispatchList.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>Queue is clear <IconCheck size={13} /></span>
                  </td></tr>
                : dispatchList.slice(0, 5).map((o: any) => (
                  <React.Fragment key={o.id}>
                    <tr>
                      <td><strong style={{ color: '#d97706' }}>{o.order_number}</strong></td>
                      <td style={{ fontSize: 13 }}>{o.business_name}</td>
                      <td>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                      <td>
                        {dispatchingId !== o.id
                          ? <button type="button" onClick={() => openDispatchForm(o.id)}
                              style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#d97706', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
                              Pick &amp; Ship
                            </button>
                          : <button type="button" onClick={closeDispatchForm}
                              style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
                              Cancel
                            </button>}
                      </td>
                    </tr>
                    {dispatchingId === o.id && (
                      <tr key={`${o.id}-form`}>
                        <td colSpan={4} style={{ padding: '10px 14px 14px', background: '#fffbeb', borderTop: 'none', borderBottom: '2px solid #fde68a' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Dispatch details for {o.order_number}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Vehicle No. <span style={{ color: '#dc2626' }}>*</span></label>
                              <input
                                value={vehicleNumber}
                                onChange={e => setVehicleNumber(e.target.value)}
                                placeholder="MH 12 AB 1234"
                                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: '1px solid #d97706', outline: 'none', width: 150 }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Driver Name <span style={{ color: '#dc2626' }}>*</span></label>
                              <input
                                value={driverName}
                                onChange={e => setDriverName(e.target.value)}
                                placeholder="Driver name"
                                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: '1px solid #d97706', outline: 'none', width: 150 }}
                              />
                            </div>
                            <button type="button"
                              onClick={() => pickMutation.mutate({ orderId: o.id, vehicleNumber, driverName })}
                              disabled={!vehicleNumber.trim() || !driverName.trim() || pickMutation.isPending}
                              style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: vehicleNumber.trim() && driverName.trim() ? '#d97706' : '#d1d5db', border: 'none', padding: '6px 16px', borderRadius: 7, cursor: vehicleNumber.trim() && driverName.trim() ? 'pointer' : 'not-allowed', height: 32 }}>
                              {pickMutation.isPending ? 'Dispatching…' : 'Confirm Dispatch'}
                            </button>
                          </div>
                          {pickError && <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{pickError}</div>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>

        {/* Stock Levels */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Package size={16} color="#059669" /> Live Stock Levels</span>
            <Link href="/dashboard/inventory"><span style={{ fontSize: 12, color: '#059669', fontWeight: 600, cursor: 'pointer' }}>Full inventory →</span></Link>
          </div>
          <div style={{ padding: '8px 16px' }}>
            {aggregatedStock.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No stock data</div>
              : aggregatedStock.map((s: any) => {
                const qty = Number(s.available_qty || 0);
                const maxQty = 1000;
                const pct = Math.min(100, (qty / maxQty) * 100);
                const isLow = qty < 100;
                return (
                  <div key={s.product_id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.product_name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isLow ? '#dc2626' : '#059669' }}>
                        {qty.toFixed(0)} bags
                        {isLow && <span style={{ marginLeft: 6, fontSize: 10, background: '#fef2f2', color: '#dc2626', padding: '1px 5px', borderRadius: 10, border: '1px solid #fecaca' }}>LOW</span>}
                      </span>
                    </div>
                    <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isLow ? '#ef4444' : '#10b981', borderRadius: 4 }} />
                    </div>
                    {s.nearest_expiry && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        Next expiry: {new Date(s.nearest_expiry).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Alerts + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Expiry Alerts */}
        <div className="card" style={{ border: expiryBatches.length > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.AlertTriangle size={16} color="#dc2626" /> Alerts</span>
            <Link href="/dashboard/inventory?nearExpiry=true"><span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>See all</span></Link>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {expiryBatches.length === 0 && lowStock.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>All good — no alerts <IconCheck size={13} /></div>
              : <>
                {expiryBatches.slice(0, 3).map((b: any) => (
                  <div key={b.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f9fafb', alignItems: 'flex-start' }}>
                    <span style={{ display: 'inline-flex', marginTop: 2, flexShrink: 0 }}>
                      {b.days_until_expiry <= 7
                        ? <Icons.AlertCircle size={16} color="#ef4444" />
                        : <Icons.Clock size={16} color="#f59e0b" />}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{b.product_name} — Expiry Warning</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Batch {b.batch_number} expires in {b.days_until_expiry} days. {Number(b.quantity).toFixed(0)} bags remaining.</div>
                    </div>
                  </div>
                ))}
                {lowStock.slice(0, 2).map((s: any) => (
                  <div key={s.product_id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f9fafb', alignItems: 'flex-start' }}>
                    <span style={{ display: 'inline-flex', marginTop: 2, flexShrink: 0 }}><Icons.AlertCircle size={16} color="#ef4444" /></span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.product_name} — Low Stock</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Only {Number(s.available_qty).toFixed(0)} bags available. Below reorder point.</div>
                    </div>
                  </div>
                ))}
              </>}
          </div>
        </div>

        {/* Recent GRNs + Adjustments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Clipboard size={16} color="#059669" /> Recent Activity</span>
            <Link href="/dashboard/warehouse"><span style={{ fontSize: 12, color: '#059669', fontWeight: 600, cursor: 'pointer' }}>Warehouse →</span></Link>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {grnList.map((g: any) => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{g.grn_number} <span style={{ fontWeight: 400, color: '#6b7280' }}>— GRN</span></div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{g.supplier_name || 'No supplier'} · {new Date(g.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <span className={`badge ${g.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>{g.status}</span>
              </div>
            ))}
            {adjList.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.product_name || 'Adjustment'} <span style={{ fontWeight: 400, color: '#6b7280' }}>— Adj</span></div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.reason} · {Number(a.quantity_delta) > 0 ? '+' : ''}{Number(a.quantity_delta).toFixed(0)} bags</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: Number(a.quantity_delta) < 0 ? '#dc2626' : '#059669' }}>
                  {Number(a.quantity_delta) > 0 ? '+' : ''}{Number(a.quantity_delta).toFixed(0)}
                </span>
              </div>
            ))}
            {grnList.length === 0 && adjList.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
