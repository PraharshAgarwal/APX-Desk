'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Icons, IconCheck } from '@/components/ui/Icons';
import QueryError from '@/components/ui/QueryError';
import Link from 'next/link';
import { SkeletonStatGrid, SkeletonTable } from '@/components/ui/Skeleton';
import type { Order, InventoryBatch, BusinessBalance, User } from '@/types';

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="credit-bar-track" style={{ marginTop: 6 }}>
      <div
        className={`credit-bar-fill ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = { pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-blue', dispatched: 'badge-stone', delivered: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${m[status] || 'badge-stone'}`}>{status}</span>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: orders, isLoading: loadingOrders, isError: ordersError, refetch: refetchOrders } =
    useQuery({ queryKey: ['orders-recent'], queryFn: async () => (await api.get('/orders?limit=8')).data });
  const { data: nearExpiry } = useQuery({ queryKey: ['near-expiry'], queryFn: async () => (await api.get('/inventory/near-expiry')).data });
  const { data: balances }   = useQuery({ queryKey: ['all-balances'], queryFn: async () => (await api.get('/finance/balances')).data });
  const { data: users, isLoading: loadingUsers, isError: usersError, refetch: refetchUsers } =
    useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/users?limit=20')).data });

  const recentOrders: Order[]          = orders?.data || [];
  const expiryBatches: InventoryBatch[] = (nearExpiry?.data || []).slice(0, 4);
  const businesses: BusinessBalance[]   = (balances?.data || []).slice(0, 5);
  const allUsers: User[]               = users?.data || [];

  const totalOrders      = orders?.meta?.total ?? 0;
  const pendingOrders    = recentOrders.filter(o => o.status === 'pending').length;
  const processingOrders = recentOrders.filter(o => o.status === 'processing').length;
  const totalUsers       = users?.meta?.total ?? allUsers.length;
  const activeUsers      = allUsers.filter(u => u.status === 'active').length;

  const isLoading = loadingOrders || loadingUsers;

  return (
    <div className="animate-in">
      {/* Welcome Banner */}
      <div className="banner banner-green">
        <div className="banner-left">
          <div className="banner-title">{greeting}, {user?.firstName}</div>
          <div className="banner-subtitle">System Admin · Full access · All regions</div>
        </div>
        <div className="banner-actions">
          <button type="button" onClick={() => router.push('/dashboard/orders')} className="btn-banner-ghost">
            <Icons.Orders size={14} color="#fff" /> Orders
          </button>
          <button type="button" onClick={() => router.push('/dashboard/admin')} className="btn-banner-solid btn-banner-solid-green">
            + Add User
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {isLoading ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <div className="stats-grid-4">
          {[
            { label: 'Total Orders',       value: totalOrders,           sub: `${pendingOrders} pending`,   Icon: Icons.Orders,        color: 'green' as const,                                                           href: '/dashboard/orders' },
            { label: 'Processing',          value: processingOrders,      sub: 'Awaiting dispatch',          Icon: Icons.Wrench,        color: 'amber' as const,                                                           href: '/dashboard/orders?status=processing' },
            { label: 'Total Users',         value: totalUsers,            sub: `${activeUsers} active`,      Icon: Icons.Users,         color: 'blue'  as const,                                                           href: '/dashboard/admin' },
            { label: 'Near-Expiry Batches', value: expiryBatches.length,  sub: 'Requires attention',         Icon: Icons.AlertTriangle, color: (expiryBatches.length > 0 ? 'red' : 'green') as 'red' | 'green',           href: '/dashboard/inventory?filter=expiring' },
          ].map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className={`stat-card ${m.color}`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
            >
              <div className="stat-header">
                <span className="stat-label">{m.label}</span>
                <span style={{ display: 'inline-flex' }}><m.Icon size={18} /></span>
              </div>
              <div className="stat-value">{m.value}</div>
              <div className="stat-sub">{m.sub}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="content-grid-main-aside">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Orders</span>
            <Link href="/dashboard/orders" style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>View all →</Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Order #</th><th>Business</th><th>Amount</th><th>Exec</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {ordersError && (
                <tr><td colSpan={6}><QueryError error={ordersError} onRetry={refetchOrders} compact /></td></tr>
              )}
              {loadingOrders && !ordersError && <SkeletonTable rows={5} cols={6} />}
              {!loadingOrders && !ordersError && recentOrders.length === 0
                ? <tr><td colSpan={6} className="empty-cell">No orders yet</td></tr>
                : !loadingOrders && recentOrders.slice(0, 6).map((o) => (
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
        <div className="flex-col-gap">
          {/* Expiry Alerts */}
          <div className="card" style={{ border: expiryBatches.length > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
            <div className="card-header" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <span className="card-title card-title-row" style={{ fontSize: 13 }}>
                <Icons.AlertCircle size={14} color="#dc2626" /> Expiry Alerts
              </span>
              <Link href="/dashboard/inventory" style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>View all</Link>
            </div>
            <div className="card-section-sm">
              {expiryBatches.length === 0
                ? <div className="text-center-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    No near-expiry batches <IconCheck size={13} />
                  </div>
                : expiryBatches.map((b) => (
                  <div key={b.id} className="activity-item">
                    <div>
                      <div className="activity-title">{b.product_name}</div>
                      <div className="activity-sub">{b.batch_number} · {Number(b.quantity).toFixed(0)} bags</div>
                    </div>
                    <span className={`badge ${(b.days_until_expiry ?? 0) <= 7 ? 'badge-red' : 'badge-amber'}`}>{b.days_until_expiry}d</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Business Credit Overview */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <span className="card-title card-title-row" style={{ fontSize: 13 }}>
                <Icons.CreditCard size={14} color="#059669" /> Credit Utilization
              </span>
              <Link href="/dashboard/finance" style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Details</Link>
            </div>
            <div className="card-section-sm">
              {businesses.map((b) => {
                const used  = Number(b.credit_limit) > 0 ? Math.min(100, (Math.abs(Number(b.current_balance)) / Number(b.credit_limit)) * 100) : 0;
                const color = used > 85 ? 'alert' : used > 60 ? 'warn' : 'ok';
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
