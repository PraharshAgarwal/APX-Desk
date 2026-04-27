'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Icons } from '@/components/ui/Icons';

function StatBox({ label, value, sub, color = '#059669' }: any) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: ordersData } = useQuery({
    queryKey: ['analytics-orders'],
    queryFn: async () => {
      const res = await api.get('/orders?limit=200');
      const d = res.data?.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
  });
  const { data: balancesData } = useQuery({
    queryKey: ['analytics-balances'],
    queryFn: async () => {
      const res = await api.get('/finance/balances');
      const d = res.data?.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
  });
  const { data: productsData } = useQuery({
    queryKey: ['analytics-products'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100');
      const d = res.data?.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
  });
  const { data: retailersData } = useQuery({
    queryKey: ['analytics-retailers'],
    queryFn: async () => (await api.get('/businesses')).data.data,
  });

  const orders: any[] = Array.isArray(ordersData) ? ordersData : [];
  const balances: any[] = Array.isArray(balancesData) ? balancesData : [];
  const products: any[] = Array.isArray(productsData) ? productsData : [];
  const retailers: any[] = Array.isArray(retailersData) ? retailersData : [];

  // Derived stats
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalOutstanding = balances.reduce((s: number, b: any) => s + Math.max(0, Number(b.current_balance)), 0);
  const activeRetailers = retailers.filter(r => r.is_active).length;

  // Orders by status
  const byStatus = orders.reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  // Top retailers by outstanding
  const topRetailers = [...retailers].sort((a, b) => Number(b.current_balance) - Number(a.current_balance)).slice(0, 5);

  // Monthly order trend (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-IN', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
  });
  const monthlyData = months.map(m => ({
    label: m.label,
    count: orders.filter(o => {
      const d = new Date(o.created_at);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length,
    revenue: orders.filter(o => {
      const d = new Date(o.created_at);
      return d.getFullYear() === m.year && d.getMonth() === m.month && o.status === 'delivered';
    }).reduce((s: number, o: any) => s + Number(o.total_amount), 0),
  }));
  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b', confirmed: '#3b82f6', processing: '#8b5cf6',
    dispatched: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444',
  };

  return (
    <div className="animate-in">
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatBox label="Revenue (Delivered)" value={`₹${(totalRevenue / 100000).toFixed(1)}L`} sub={`${orders.filter(o => o.status === 'delivered').length} delivered orders`} color="#059669" />
        <StatBox label="Outstanding Balance" value={`₹${(totalOutstanding / 100000).toFixed(1)}L`} sub="Across all retailers" color="#dc2626" />
        <StatBox label="Pending Orders" value={pendingOrders} sub="Awaiting confirmation" color="#f59e0b" />
        <StatBox label="Active Retailers" value={activeRetailers} sub={`of ${retailers.length} total`} color="#2563eb" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Monthly Order Trend */}
        <div className="card">
          <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Analytics size={16} color="#059669" /> Order Volume — Last 6 Months</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, paddingBottom: 8 }}>
              {monthlyData.map(m => (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563' }}>{m.count}</div>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    background: 'linear-gradient(to top, #059669, #34d399)',
                    height: `${Math.max(8, (m.count / maxCount) * 110)}px`,
                    transition: 'height 0.3s',
                  }} />
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="card">
          <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Dashboard size={16} color="#2563eb" /> Orders by Status</span></div>
          <div className="card-body">
            {Object.entries(byStatus).map(([status, count]) => {
              const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
              return (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', textTransform: 'capitalize' }}>{status}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: STATUS_COLORS[status] || '#6b7280', borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No orders yet</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top Retailers by Outstanding */}
        <div className="card">
          <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Store size={16} color="#7c3aed" /> Top Retailers by Outstanding</span></div>
          <table className="data-table">
            <thead><tr><th>Retailer</th><th>Outstanding</th><th>Credit Used</th></tr></thead>
            <tbody>
              {topRetailers.length === 0
                ? <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No data</td></tr>
                : topRetailers.map(r => {
                  const pct = Number(r.credit_limit) > 0 ? Math.min(100, (Number(r.current_balance) / Number(r.credit_limit)) * 100) : 0;
                  return (
                    <tr key={r.business_id}>
                      <td style={{ fontWeight: 600 }}>{r.business_name}</td>
                      <td style={{ color: Number(r.current_balance) > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                        ₹{Number(r.current_balance).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#10b981', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#6b7280', minWidth: 32 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Products: low stock */}
        <div className="card">
          <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.AlertTriangle size={16} color="#dc2626" /> Low / Out-of-Stock Products</span></div>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Brand</th><th>Available</th><th>Status</th></tr></thead>
            <tbody>
              {products.filter(p => Number(p.available_qty) < 100).length === 0
                ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>All products well-stocked</td></tr>
                : products.filter(p => Number(p.available_qty) < 100).slice(0, 6).map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{p.manufacturer || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{Number(p.available_qty).toFixed(0)} {p.unit}s</td>
                    <td>
                      <span className={`badge ${Number(p.available_qty) === 0 ? 'badge-red' : 'badge-amber'}`}>
                        {Number(p.available_qty) === 0 ? 'Out' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
