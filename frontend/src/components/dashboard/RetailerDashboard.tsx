'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import CreateOrderModal from '@/components/ui/CreateOrderModal';
import { Icons } from '@/components/ui/Icons';

export default function RetailerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showOrder, setShowOrder] = useState(false);
  const bizId = user?.businessId;

  const { data: ordersData } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => (await api.get('/orders?limit=10')).data,
  });
  const { data: balanceData } = useQuery({
    queryKey: ['my-balance', bizId],
    queryFn: async () => (await api.get(`/finance/balance/${bizId}`)).data.data,
    enabled: !!bizId,
  });
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await api.get('/products')).data.data,
  });
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/finance/invoices')).data.data,
  });

  const orders: any[] = ordersData?.data || [];
  const balance = balanceData;
  const products: any[] = (productsData || []).slice(0, 6);
  const invoices: any[] = (invoicesData || []).slice(0, 4);

  const creditUsedPct = balance
    ? Math.min(100, (Math.abs(Number(balance.current_balance)) / Math.max(Number(balance.credit_limit), 1)) * 100)
    : 0;

  const pendingOrders = orders.filter((o: any) => ['pending', 'confirmed', 'processing'].includes(o.status));
  const inTransit = orders.filter((o: any) => o.status === 'dispatched');

  return (
    <div className="animate-in">
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: 14, padding: '20px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Welcome back, {user?.firstName}!
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {inTransit.length > 0 ? `${inTransit.length} order${inTransit.length > 1 ? 's' : ''} in transit` : 'No active deliveries'}
          </div>
        </div>
        <button type="button" onClick={() => setShowOrder(true)}
          style={{ background: '#fff', border: 'none', color: '#2563eb', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Place Order
        </button>
      </div>

      {/* Credit Summary */}
      {balance && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <div className="stat-card violet">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Credit Limit</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#1a1d23' }}>₹{Number(balance.credit_limit).toLocaleString('en-IN')}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Available Credit</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#059669' }}>₹{Number(balance.available_credit).toLocaleString('en-IN')}</div>
          </div>
          <div className={`stat-card ${creditUsedPct > 80 ? 'red' : 'amber'}`}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Credit Used</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: creditUsedPct > 80 ? '#dc2626' : '#1a1d23' }}>
              {creditUsedPct.toFixed(0)}%
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${creditUsedPct}%`, background: creditUsedPct > 80 ? '#ef4444' : '#f59e0b', borderRadius: 3 }} />
              </div>
            </div>
          </div>
          <div className="stat-card blue">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>My Orders</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#1a1d23' }}>{ordersData?.meta?.total ?? 0}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{pendingOrders.length} active</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
        {/* My Orders */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Orders</span>
            <Link href="/dashboard/orders" style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>All orders →</Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Order #</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {orders.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No orders yet. Place your first order!</td></tr>
                : orders.slice(0, 6).map((o: any) => (
                  <tr key={o.id}>
                    <td><strong style={{ color: '#2563eb' }}>{o.order_number}</strong></td>
                    <td><span className="badge badge-stone">{o.item_count} items</span></td>
                    <td><strong>₹{Number(o.total_amount).toLocaleString('en-IN')}</strong></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {o.status === 'delivered' && (
                        <button style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}
                          onClick={() => setShowOrder(true)}>
                          Reorder
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Right: Invoices + Quick Browse */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pending Invoices */}
          <div className="card">
            <div className="card-header"><span className="card-title" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Icons.Finance size={14} color="#059669" /> Recent Invoices</span>
              <Link href="/dashboard/finance" style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>View all</Link>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {invoices.length === 0
                ? <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0' }}>No invoices yet</div>
                : invoices.map((inv: any) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1d23' }}>{inv.invoice_number}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString('en-IN')}` : 'No due date'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: inv.is_void ? '#6b7280' : Number(inv.paid_amount) >= Number(inv.total_amount) ? '#059669' : '#dc2626' }}>
                        ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                      </div>
                      <span className={`badge ${inv.is_void ? 'badge-stone' : Number(inv.paid_amount) >= Number(inv.total_amount) ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                        {inv.is_void ? 'Void' : Number(inv.paid_amount) >= Number(inv.total_amount) ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Order */}
          <div className="card">
            <div className="card-header"><span className="card-title" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Icons.Orders size={14} color="#2563eb" /> Quick Shop</span></div>
            <div style={{ padding: '8px 12px' }}>
              {products.slice(0, 4).map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {p.manufacturer && <span style={{ color: '#2563eb', fontWeight: 600 }}>{p.manufacturer} · </span>}
                      <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{p.sku}</code>
                    </div>
                  </div>
                  <button onClick={() => setShowOrder(true)}
                    style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ecfdf5', border: '1px solid #d1fae5', padding: '4px 8px', borderRadius: 5, cursor: 'pointer' }}>
                    Order
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => router.push('/dashboard/products')} style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 7, cursor: 'pointer' }}>
                Browse full catalog →
              </button>
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
