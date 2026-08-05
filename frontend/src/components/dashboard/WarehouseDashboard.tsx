'use client';
import React from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Icons, IconCheck } from '@/components/ui/Icons';
import QueryError from '@/components/ui/QueryError';
import { SkeletonStatGrid, SkeletonTable } from '@/components/ui/Skeleton';
import type { Order, StockSummary, InventoryBatch, GRN } from '@/types';
import { useToast } from '@/hooks/useToast';

export default function WarehouseDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName]       = useState('');
  const [pickError, setPickError]         = useState<string | null>(null);
  const toast = useToast();

  const openDispatchForm = (orderId: string) => {
    setDispatchingId(orderId);
    setVehicleNumber('');
    setDriverName('');
    setPickError(null);
  };
  const closeDispatchForm = () => { setDispatchingId(null); setPickError(null); };

  const { data: dispatchQueue, isError: dispatchErr, refetch: refetchDispatch } = useQuery({
    queryKey: ['orders-dispatchable'],
    queryFn: async () => {
      const [proc, conf] = await Promise.all([
        api.get('/orders?status=processing&limit=50'),
        api.get('/orders?status=confirmed&limit=50'),
      ]);
      return { data: [...(proc.data?.data || []), ...(conf.data?.data || [])] };
    },
  });
  const { data: stock, isError: stockErr, refetch: refetchStock } = useQuery({ queryKey: ['stock-summary'],  queryFn: async () => (await api.get('/inventory/stock')).data });
  const { data: nearExpiry }  = useQuery({ queryKey: ['near-expiry'],    queryFn: async () => (await api.get('/inventory/near-expiry')).data });
  const { data: grns }        = useQuery({ queryKey: ['grns'],           queryFn: async () => (await api.get('/warehouse/grn')).data });
  const { data: adjustments } = useQuery({ queryKey: ['adjustments'],   queryFn: async () => (await api.get('/inventory/adjustments')).data });

  const pickMutation = useMutation({
    mutationFn: async ({ orderId, vehicleNumber, driverName }: { orderId: string; vehicleNumber: string; driverName: string }) =>
      api.post(`/warehouse/dispatch/${orderId}`, { vehicleNumber, driverName }),
    onSuccess: () => {
      setPickError(null);
      closeDispatchForm();
      qc.invalidateQueries({ queryKey: ['orders-dispatchable'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      toast.success('Order dispatched successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || err instanceof Error ? (err as Error).message : 'Dispatch failed';
      setPickError(typeof msg === 'string' ? msg : 'Dispatch failed');
      toast.error(typeof msg === 'string' ? msg : 'Dispatch failed');
    },
  });

  const dispatchList: Order[]         = dispatchQueue?.data || [];
  const confirmedList: Order[]         = [];
  const stockItems: StockSummary[]     = stock?.data || [];
  const expiryBatches: InventoryBatch[] = nearExpiry?.data || [];
  const grnList: GRN[]                 = (grns?.data || []).slice(0, 4);
  const adjList: Record<string,unknown>[] = (adjustments?.data || []).slice(0, 4);

  // Aggregate stock by product across all warehouses
  const stockByProduct = stockItems.reduce((acc: Record<string, any>, s: any) => {
    if (!acc[s.product_id]) {
      acc[s.product_id] = { ...s, available_qty: Number(s.available_qty) };
    } else {
      acc[s.product_id].available_qty += Number(s.available_qty);
      if (s.nearest_expiry && (!acc[s.product_id].nearest_expiry || s.nearest_expiry < acc[s.product_id].nearest_expiry)) {
        acc[s.product_id].nearest_expiry = s.nearest_expiry;
      }
    }
    return acc;
  }, {});
  const aggregatedStock: any[] = Object.values(stockByProduct);
  const criticalExpiry = expiryBatches.filter((b: any) => b.days_until_expiry <= 7);
  const lowStock       = aggregatedStock.filter((s: any) => Number(s.available_qty) < Number(s.low_stock_threshold || 100));

  return (
    <div className="animate-in">
      {/* Ops Banner */}
      <div className="banner banner-amber">
        <div className="banner-left">
          <div className="banner-title">Ops Dashboard — {user?.firstName}</div>
          <div className="banner-subtitle">
            {dispatchList.length > 0
              ? `${dispatchList.length} order${dispatchList.length > 1 ? 's' : ''} ready to dispatch`
              : confirmedList.length > 0 ? `${confirmedList.length} confirmed, waiting processing` : 'All clear — no pending dispatches'}
          </div>
        </div>
        <div className="banner-actions">
          <button type="button" onClick={() => router.push('/dashboard/warehouse')} className="btn-banner-ghost">
            <Icons.Clipboard size={14} color="#fff" /> GRN
          </button>
          <button type="button" onClick={() => router.push('/dashboard/inventory')} className="btn-banner-solid btn-banner-solid-amber">
            View Inventory
          </button>
        </div>
      </div>

      {/* Operational Stats */}
      <div className="stats-grid-4">
        <Link href="/dashboard/orders?status=processing" className="stat-card amber"
          style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
        >
          <div className="stat-label">Dispatch Queue</div>
          <div className={`stat-value ${dispatchList.length > 0 ? 'stat-value-amber' : ''}`}>{dispatchList.length}</div>
          <div className="stat-sub">Ready to pick &amp; ship</div>
        </Link>
        <Link href="/dashboard/orders?status=confirmed" className="stat-card blue"
          style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
        >
          <div className="stat-label">Confirmed Orders</div>
          <div className="stat-value">{confirmedList.length}</div>
          <div className="stat-sub">Awaiting processing</div>
        </Link>
        <Link href="/dashboard/inventory?filter=expiring" className={`stat-card ${criticalExpiry.length > 0 ? 'red' : 'green'}`}
          style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
        >
          <div className="stat-label">Critical Expiry</div>
          <div className={`stat-value ${criticalExpiry.length > 0 ? 'stat-value-red' : 'stat-value-green'}`}>{criticalExpiry.length}</div>
          <div className="stat-sub">Batches expiring ≤7 days</div>
        </Link>
        <Link href="/dashboard/inventory?filter=low" className={`stat-card ${lowStock.length > 0 ? 'red' : 'green'}`}
          style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
        >
          <div className="stat-label">Low Stock SKUs</div>
          <div className={`stat-value ${lowStock.length > 0 ? 'stat-value-red' : 'stat-value-green'}`}>{lowStock.length}</div>
          <div className="stat-sub">Below reorder point</div>
        </Link>
      </div>

      <div className="content-grid-2">
        {/* Dispatch Queue */}
        <div className="card">
          <div className="card-header">
            <span className="card-title card-title-row"><Icons.Truck size={16} color="#d97706" /> Dispatch Queue</span>
            <Link href="/dashboard/warehouse"><span style={{ fontSize: 12, color: '#d97706', fontWeight: 600, cursor: 'pointer' }}>Full dispatch →</span></Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Order #</th><th>Business</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>
              {dispatchErr
                ? <tr><td colSpan={4}><QueryError error={dispatchErr} onRetry={refetchDispatch} compact /></td></tr>
                : dispatchList.length === 0
                ? <tr><td colSpan={4} className="empty-cell">
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
                          ? <button type="button" onClick={() => openDispatchForm(o.id)} className="btn-action btn-action-amber">
                              Pick &amp; Ship
                            </button>
                          : <button type="button" onClick={closeDispatchForm} className="btn-action btn-action-cancel">
                              Cancel
                            </button>}
                      </td>
                    </tr>
                    {dispatchingId === o.id && (
                      <tr key={`${o.id}-form`}>
                        <td colSpan={4} className="dispatch-form">
                          <div className="dispatch-form-title">Dispatch details for {o.order_number}</div>
                          <div className="dispatch-form-fields">
                            <div className="dispatch-field">
                              <label className="dispatch-label">Vehicle No. <span style={{ color: '#dc2626' }}>*</span></label>
                              <input
                                className="dispatch-input"
                                value={vehicleNumber}
                                onChange={e => setVehicleNumber(e.target.value)}
                                placeholder="MH 12 AB 1234"
                              />
                            </div>
                            <div className="dispatch-field">
                              <label className="dispatch-label">Driver Name <span style={{ color: '#dc2626' }}>*</span></label>
                              <input
                                className="dispatch-input"
                                value={driverName}
                                onChange={e => setDriverName(e.target.value)}
                                placeholder="Driver name"
                              />
                            </div>
                            <button type="button"
                              onClick={() => pickMutation.mutate({ orderId: o.id, vehicleNumber, driverName })}
                              disabled={!vehicleNumber.trim() || !driverName.trim() || pickMutation.isPending}
                              className="btn-action btn-action-amber"
                              style={{ height: 32, opacity: (!vehicleNumber.trim() || !driverName.trim()) ? 0.5 : 1 }}>
                              {pickMutation.isPending ? 'Dispatching…' : 'Confirm Dispatch'}
                            </button>
                          </div>
                          {pickError && <div className="dispatch-error">{pickError}</div>}
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
            <span className="card-title card-title-row"><Icons.Package size={16} color="#059669" /> Live Stock Levels</span>
            <Link href="/dashboard/inventory"><span style={{ fontSize: 12, color: '#059669', fontWeight: 600, cursor: 'pointer' }}>Full inventory →</span></Link>
          </div>
          <div className="card-section">
            {stockErr
              ? <QueryError error={stockErr} onRetry={refetchStock} />
              : aggregatedStock.length === 0
              ? <div className="text-center-muted">No stock data</div>
              : aggregatedStock.map((s: any) => {
                  const qty       = Number(s.available_qty || 0);
                  const threshold = Number(s.low_stock_threshold || 100);
                  // Bar fills relative to 2× the reorder threshold so half-bar = healthy
                  const maxQty    = Math.max(threshold * 2, qty);
                  const pct       = Math.min(100, (qty / maxQty) * 100);
                  const isLow     = qty < threshold;
                return (
                  <div key={s.product_id} className="stock-item">
                    <div className="stock-header">
                      <span className="stock-name">{s.product_name}</span>
                      <span className={`stock-qty ${isLow ? 'low' : 'ok'}`}>
                        {qty.toFixed(0)} bags
                        {isLow && <span className="low-tag">LOW</span>}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${isLow ? 'red' : 'green'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {s.nearest_expiry && (
                      <div className="stock-expiry">Next expiry: {new Date(s.nearest_expiry).toLocaleDateString('en-IN')}</div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Alerts + Recent Activity */}
      <div className="content-grid-2">
        {/* Expiry Alerts */}
        <div className="card" style={{ border: expiryBatches.length > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
          <div className="card-header">
            <span className="card-title card-title-row"><Icons.AlertTriangle size={16} color="#dc2626" /> Alerts</span>
            <Link href="/dashboard/inventory?nearExpiry=true"><span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>See all</span></Link>
          </div>
          <div className="card-section-sm">
            {expiryBatches.length === 0 && lowStock.length === 0
              ? <div className="text-center-muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  All good — no alerts <IconCheck size={13} />
                </div>
              : <>
                {expiryBatches.slice(0, 3).map((b: any) => (
                  <div key={b.id} className="alert-item">
                    <span className="alert-icon">
                      {b.days_until_expiry <= 7
                        ? <Icons.AlertCircle size={16} color="#ef4444" />
                        : <Icons.Clock size={16} color="#f59e0b" />}
                    </span>
                    <div>
                      <div className="alert-title">{b.product_name} — Expiry Warning</div>
                      <div className="alert-body">Batch {b.batch_number} expires in {b.days_until_expiry} days. {Number(b.quantity).toFixed(0)} bags remaining.</div>
                    </div>
                  </div>
                ))}
                {lowStock.slice(0, 2).map((s: any) => (
                  <div key={s.product_id} className="alert-item">
                    <span className="alert-icon"><Icons.AlertCircle size={16} color="#ef4444" /></span>
                    <div>
                      <div className="alert-title">{s.product_name} — Low Stock</div>
                      <div className="alert-body">Only {Number(s.available_qty).toFixed(0)} bags available. Below reorder point.</div>
                    </div>
                  </div>
                ))}
              </>}
          </div>
        </div>

        {/* Recent GRNs + Adjustments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title card-title-row"><Icons.Clipboard size={16} color="#059669" /> Recent Activity</span>
            <Link href="/dashboard/warehouse"><span style={{ fontSize: 12, color: '#059669', fontWeight: 600, cursor: 'pointer' }}>Warehouse →</span></Link>
          </div>
          <div className="card-section-sm">
            {grnList.map((g: any) => (
              <div key={g.id} className="activity-item">
                <div>
                  <div className="activity-title">{g.grn_number} <span style={{ fontWeight: 400, color: '#6b7280' }}>— GRN</span></div>
                  <div className="activity-sub">{g.supplier_name || 'No supplier'} · {new Date(g.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                <span className={`badge ${g.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>{g.status}</span>
              </div>
            ))}
            {adjList.map((a: any) => (
              <div key={a.id} className="activity-item">
                <div>
                  <div className="activity-title">{a.product_name || 'Adjustment'} <span style={{ fontWeight: 400, color: '#6b7280' }}>— Adj</span></div>
                  <div className="activity-sub">{a.reason} · {Number(a.quantity_delta) > 0 ? '+' : ''}{Number(a.quantity_delta).toFixed(0)} bags</div>
                </div>
                <span className={Number(a.quantity_delta) < 0 ? 'delta-negative' : 'delta-positive'}>
                  {Number(a.quantity_delta) > 0 ? '+' : ''}{Number(a.quantity_delta).toFixed(0)}
                </span>
              </div>
            ))}
            {grnList.length === 0 && adjList.length === 0 && (
              <div className="text-center-muted">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
