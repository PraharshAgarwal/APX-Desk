'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import CreateOrderModal from '@/components/ui/CreateOrderModal';
import { Icons } from '@/components/ui/Icons';
import { SkeletonStatGrid } from '@/components/ui/Skeleton';
import type { Order, BusinessBalance, Product } from '@/types';

export default function SalesDashboard() {
  const { user } = useAuthStore();
  const [showOrder, setShowOrder] = useState(false);

  const { data: ordersData }   = useQuery({ queryKey: ['orders-all'],     queryFn: async () => (await api.get('/orders')).data });
  const { data: balancesData } = useQuery({ queryKey: ['all-balances'],   queryFn: async () => (await api.get('/finance/balances')).data.data });
  const { data: productsData } = useQuery({ queryKey: ['products-list'],  queryFn: async () => (await api.get('/products')).data.data });

  const orders: Order[]           = ordersData?.data || [];
  const accounts: BusinessBalance[] = balancesData || [];
  const products: Product[]         = productsData || [];

  const totalRevenue    = orders.filter(o => o.status !== 'cancelled').reduce((sum: number, o) => sum + Number(o.total_amount), 0);
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const pendingOrders   = orders.filter(o => o.status === 'pending').length;
  const activeAccounts  = accounts.filter(a => Number(a.current_balance) !== 0 || Number(a.total_debits) > 0).length;

  // Simulated target (₹20L per month)
  const TARGET        = 2000000;
  const pct           = Math.min(100, (totalRevenue / TARGET) * 100);
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="animate-in">
      {/* Sales Banner */}
      <div className="banner banner-violet">
        <div className="banner-left">
          <div className="banner-title">Let's close it strong, {user?.firstName}!</div>
          <div className="banner-subtitle">
            Sales Executive · {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="banner-actions">
          <button type="button" onClick={() => setShowOrder(true)} className="btn-banner-solid btn-banner-solid-violet">
            + Place Order
          </button>
        </div>
      </div>

      {/* Stats + Target Ring */}
      <div className="content-grid-sales">
        {/* Target Ring */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="stat-label" style={{ marginBottom: 12 }}>Monthly Target</div>
          <svg viewBox="0 0 120 120" width={120} height={120}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="12" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#8b5cf6" strokeWidth="12"
              strokeDasharray={`${circumference * pct / 100} ${circumference * (1 - pct / 100)}`}
              strokeDashoffset={circumference * 0.25}
              strokeLinecap="round" />
            <text x="60" y="55" textAnchor="middle" fontFamily="var(--font-head)" fontSize="18" fontWeight="800" fill="#1a1d23">{pct.toFixed(0)}%</text>
            <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#6b7280">achieved</text>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginTop: 8 }}>₹{(totalRevenue / 100000).toFixed(1)}L</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>of ₹{(TARGET / 100000).toFixed(0)}L target</div>
        </div>

        {/* Key Metrics — all cards link to filtered views */}
        <div className="stats-grid-2">
          <Link href="/dashboard/orders" className="stat-card violet"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">MTD Revenue</div>
            <div className="stat-value-sm">₹{(totalRevenue / 100000).toFixed(1)}L</div>
            <div className="stat-sub-violet">↑ {pct.toFixed(0)}% of target</div>
          </Link>
          <Link href="/dashboard/retailers" className="stat-card blue"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">Active Accounts</div>
            <div className="stat-value-sm">{activeAccounts}</div>
            <div className="stat-sub">{accounts.length - activeAccounts} dormant</div>
          </Link>
          <Link href="/dashboard/orders" className="stat-card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">Orders (MTD)</div>
            <div className="stat-value-sm">{ordersData?.meta?.total ?? 0}</div>
            <div className="stat-sub-green">{deliveredOrders} delivered</div>
          </Link>
          <Link href="/dashboard/orders?status=pending" className="stat-card amber"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">Pending Orders</div>
            <div className={`stat-value-sm ${pendingOrders > 0 ? 'stat-value-amber' : ''}`}>{pendingOrders}</div>
            <div className="stat-sub">Need attention</div>
          </Link>
        </div>
      </div>

      <div className="content-grid-2">
        {/* My Accounts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title card-title-row"><Icons.Store size={16} color="#7c3aed" /> My Accounts</span>
            <Link href="/dashboard/finance"><span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>Finance →</span></Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Business</th><th>Outstanding</th><th>Credit Used</th><th>Action</th></tr></thead>
            <tbody>
              {accounts.length === 0
                ? <tr><td colSpan={4} className="empty-cell">No accounts assigned</td></tr>
                : accounts.slice(0, 6).map((a) => {
                  const used    = Number(a.credit_limit) > 0
                    ? Math.min(100, (Math.abs(Number(a.current_balance)) / Number(a.credit_limit)) * 100)
                    : 0;
                  const isAtRisk = used > 85;
                  const barClass = isAtRisk ? 'alert' : used > 60 ? 'warn' : 'ok';
                  return (
                    <tr key={a.business_id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.business_name}</div>
                        {isAtRisk && <span className="risk-tag"><Icons.AlertTriangle size={10} color="#dc2626" /> At risk</span>}
                      </td>
                      <td style={{ fontWeight: 700, color: Number(a.current_balance) < 0 ? '#dc2626' : '#059669' }}>
                        ₹{Math.abs(Number(a.current_balance)).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <div className="credit-bar-row">
                          <div className="credit-bar-track">
                            <div className={`credit-bar-fill ${barClass}`} style={{ width: `${used}%` }} />
                          </div>
                          <span className={`credit-bar-pct ${isAtRisk ? 'alert' : 'ok'}`}>{used.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        <button type="button" onClick={() => setShowOrder(true)} className="btn-action btn-action-violet">
                          Order
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Right column: Recent Orders + Quick Catalog */}
        <div className="flex-col-gap">
          {/* Recent Orders */}
          <div className="card">
            <div className="card-header">
              <span className="card-title card-title-row"><Icons.Orders size={16} color="#7c3aed" /> Recent Orders</span>
              <Link href="/dashboard/orders"><span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>All orders →</span></Link>
            </div>
            <table className="data-table">
              <thead><tr><th>Order #</th><th>Business</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {orders.length === 0
                  ? <tr><td colSpan={4} className="empty-cell">No orders yet</td></tr>
                  : orders.slice(0, 4).map((o: any) => (
                    <tr key={o.id}>
                      <td><strong style={{ color: '#7c3aed', fontSize: 12 }}>{o.order_number}</strong></td>
                      <td style={{ fontSize: 12 }}>{o.business_name}</td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Quick Catalog */}
          <div className="card">
            <div className="card-header">
              <span className="card-title card-title-row"><Icons.Products size={16} color="#059669" /> Product Catalog</span>
              <Link href="/dashboard/products"><span style={{ fontSize: 12, color: '#059669', fontWeight: 600, cursor: 'pointer' }}>All products →</span></Link>
            </div>
            <div className="card-section-sm">
              {products.slice(0, 4).map((p: any) => (
                <div key={p.id} className="list-item">
                  <div>
                    <div className="list-item-title">{p.name}</div>
                    <div className="list-item-sub">
                      {p.manufacturer && <span className="manufacturer-tag">{p.manufacturer} · </span>}
                      {p.sku} · GST {p.gst_rate}%
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowOrder(true)} className="btn-action btn-action-violet">
                    Place Order
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showOrder && <CreateOrderModal onClose={() => setShowOrder(false)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = { pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-blue', dispatched: 'badge-stone', delivered: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${m[status] || 'badge-stone'}`}>{status}</span>;
}
