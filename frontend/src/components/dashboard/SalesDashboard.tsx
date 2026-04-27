'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import CreateOrderModal from '@/components/ui/CreateOrderModal';
import { Icons } from '@/components/ui/Icons';

export default function SalesDashboard() {
  const { user } = useAuthStore();
  const [showOrder, setShowOrder] = useState(false);

  const { data: ordersData } = useQuery({
    queryKey: ['orders-all'],
    queryFn: async () => (await api.get('/orders')).data,
  });
  const { data: balancesData } = useQuery({
    queryKey: ['all-balances'],
    queryFn: async () => (await api.get('/finance/balances')).data.data,
  });
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await api.get('/products')).data.data,
  });

  const orders: any[] = ordersData?.data || [];
  const accounts: any[] = balancesData || [];
  const products: any[] = productsData || [];

  const totalRevenue = orders.filter((o: any) => o.status !== 'cancelled').reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered').length;
  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
  const activeAccounts = accounts.filter((a: any) => Number(a.current_balance) !== 0 || Number(a.total_debits) > 0).length;

  // Simulated target (₹20L per month)
  const TARGET = 2000000;
  const pct = Math.min(100, (totalRevenue / TARGET) * 100);
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="animate-in">
      {/* Sales Banner */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', borderRadius: 14, padding: '20px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Let's close it strong, {user?.firstName}!
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Sales Executive · {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button type="button" onClick={() => setShowOrder(true)}
          style={{ background: '#fff', border: 'none', color: '#7c3aed', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Place Order
        </button>
      </div>

      {/* Stats + Target Ring */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, marginBottom: 24 }}>
        {/* Target Ring */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Monthly Target</div>
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

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <div className="stat-card violet">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>MTD Revenue</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: '#1a1d23' }}>₹{(totalRevenue / 100000).toFixed(1)}L</div>
            <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 4, fontWeight: 600 }}>↑ {pct.toFixed(0)}% of target</div>
          </div>
          <div className="stat-card blue">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Active Accounts</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: '#1a1d23' }}>{activeAccounts}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{accounts.length - activeAccounts} dormant</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Orders (MTD)</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: '#1a1d23' }}>{ordersData?.meta?.total ?? 0}</div>
            <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>{deliveredOrders} delivered</div>
          </div>
          <div className="stat-card amber">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pending Orders</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: pendingOrders > 0 ? '#b45309' : '#1a1d23' }}>{pendingOrders}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Need attention</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* My Accounts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Store size={16} color="#7c3aed" /> My Accounts</span>
            <Link href="/dashboard/finance"><span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>Finance →</span></Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Business</th><th>Outstanding</th><th>Credit Used</th><th>Action</th></tr></thead>
            <tbody>
              {accounts.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No accounts assigned</td></tr>
                : accounts.slice(0, 6).map((a: any) => {
                  const used = Number(a.credit_limit) > 0
                    ? Math.min(100, (Math.abs(Number(a.current_balance)) / Number(a.credit_limit)) * 100)
                    : 0;
                  const isAtRisk = used > 85;
                  return (
                    <tr key={a.business_id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.business_name}</div>
                        {isAtRisk && <span style={{ fontSize: 10, background: '#fef2f2', color: '#dc2626', padding: '1px 5px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icons.AlertTriangle size={10} color="#dc2626" /> At risk</span>}
                      </td>
                      <td style={{ fontWeight: 700, color: Number(a.current_balance) < 0 ? '#dc2626' : '#059669' }}>
                        ₹{Math.abs(Number(a.current_balance)).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${used}%`, background: isAtRisk ? '#ef4444' : '#8b5cf6', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: isAtRisk ? '#dc2626' : '#6b7280', minWidth: 28 }}>{used.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        <button type="button" onClick={() => setShowOrder(true)}
                          style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ede9fe', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent Orders */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Orders size={16} color="#7c3aed" /> Recent Orders</span>
              <Link href="/dashboard/orders"><span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>All orders →</span></Link>
            </div>
            <table className="data-table">
              <thead><tr><th>Order #</th><th>Business</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {orders.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>No orders yet</td></tr>
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
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Products size={16} color="#059669" /> Product Catalog</span>
              <Link href="/dashboard/products"><span style={{ fontSize: 12, color: '#059669', fontWeight: 600, cursor: 'pointer' }}>All products →</span></Link>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {products.slice(0, 4).map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {p.manufacturer && <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.manufacturer} · </span>}
                      {p.sku} · GST {p.gst_rate}%
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowOrder(true)}
                    style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ede9fe', padding: '4px 8px', borderRadius: 5, cursor: 'pointer' }}>
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
