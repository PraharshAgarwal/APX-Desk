'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Icons, IconCheck } from '@/components/ui/Icons';
import Link from 'next/link';

function MiniBar({ pct, color }: { pct: number; color: string }) {
  const bg: Record<string, string> = { green: '#10b981', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6' };
  return (
    <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: bg[color] || bg.green, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: orders } = useQuery({ queryKey: ['orders-recent'], queryFn: async () => (await api.get('/orders?limit=8')).data });
  const { data: nearExpiry } = useQuery({ queryKey: ['near-expiry'], queryFn: async () => (await api.get('/inventory/near-expiry')).data });
  const { data: balances } = useQuery({ queryKey: ['all-balances'], queryFn: async () => (await api.get('/finance/balances')).data });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data });

  const recentOrders: any[] = orders?.data || [];
  const expiryBatches: any[] = (nearExpiry?.data || []).slice(0, 4);
  const businesses: any[] = (balances?.data || []).slice(0, 5);
  const allUsers: any[] = users?.data || [];

  const totalOrders = orders?.meta?.total ?? 0;
  const pendingOrders = recentOrders.filter((o: any) => o.status === 'pending').length;
  const processingOrders = recentOrders.filter((o: any) => o.status === 'processing').length;
  const activeUsers = allUsers.filter((u: any) => u.status === 'active').length;

  return (
    <div className="animate-in">
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', borderRadius: 14, padding: '22px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {greeting}, {user?.firstName}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>System Admin · Full access · All regions</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => router.push('/dashboard/orders')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.Orders size={14} color="#fff" /> Orders
          </button>
          <button type="button" onClick={() => router.push('/dashboard/admin')} style={{ background: '#fff', border: 'none', color: '#059669', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Add User
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Orders',        value: totalOrders,        sub: `${pendingOrders} pending`,    Icon: Icons.Orders,    color: 'green' },
          { label: 'Processing',           value: processingOrders,   sub: 'Awaiting dispatch',           Icon: Icons.Wrench,    color: 'amber' },
          { label: 'Active Users',         value: activeUsers,        sub: `${allUsers.length} total`,    Icon: Icons.Users,     color: 'blue'  },
          { label: 'Near-Expiry Batches',  value: expiryBatches.length, sub: 'Requires attention',        Icon: Icons.AlertTriangle, color: expiryBatches.length > 0 ? 'red' : 'green' },
        ].map((m) => (
          <div key={m.label} className={`stat-card ${m.color}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              <span style={{ display: 'inline-flex' }}><m.Icon size={18} /></span>
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: '#1a1d23' }}>{m.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Orders</span>
            <Link href="/dashboard/orders" style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>View all →</Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Order #</th><th>Business</th><th>Amount</th><th>Exec</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {recentOrders.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No orders yet</td></tr>
                : recentOrders.slice(0, 6).map((o: any) => (
                  <tr key={o.id}>
                    <td><strong style={{ color: '#059669' }}>{o.order_number}</strong></td>
                    <td style={{ fontSize: 13 }}>{o.business_name}</td>
                    <td><strong>₹{Number(o.total_amount).toLocaleString('en-IN')}</strong></td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{o.assigned_to_name || '—'}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Alerts Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Expiry Alerts */}
          <div className="card" style={{ border: expiryBatches.length > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
            <div className="card-header" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <span className="card-title" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Icons.AlertCircle size={14} color="#dc2626" /> Expiry Alerts</span>
              <Link href="/dashboard/inventory" style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>View all</Link>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {expiryBatches.length === 0
                ? <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>No near-expiry batches <IconCheck size={13} /></div>
                : expiryBatches.map((b: any) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.product_name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{b.batch_number} · {Number(b.quantity).toFixed(0)} bags</div>
                    </div>
                    <span className={`badge ${b.days_until_expiry <= 7 ? 'badge-red' : 'badge-amber'}`}>{b.days_until_expiry}d</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Business Credit Overview */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <span className="card-title" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Icons.CreditCard size={14} color="#059669" /> Credit Utilization</span>
              <Link href="/dashboard/finance" style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Details</Link>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {businesses.map((b: any) => {
                const used = Number(b.credit_limit) > 0 ? Math.min(100, (Math.abs(Number(b.current_balance)) / Number(b.credit_limit)) * 100) : 0;
                const color = used > 85 ? 'red' : used > 60 ? 'amber' : 'green';
                return (
                  <div key={b.business_id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1d23' }}>{b.business_name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: used > 85 ? '#dc2626' : '#059669' }}>{used.toFixed(0)}%</span>
                    </div>
                    <MiniBar pct={used} color={color} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = { pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-blue', dispatched: 'badge-stone', delivered: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${m[status] || 'badge-stone'}`}>{status}</span>;
}
