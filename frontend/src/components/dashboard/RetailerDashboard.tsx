'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import CreateOrderModal from '@/components/ui/CreateOrderModal';
import { Icons } from '@/components/ui/Icons';
import { SkeletonStatGrid } from '@/components/ui/Skeleton';
import type { Order, BusinessBalance, Product, Invoice } from '@/types';

export default function RetailerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showOrder, setShowOrder] = useState(false);
  const bizId = user?.businessId;

  const { data: ordersData }  = useQuery({ queryKey: ['my-orders'],         queryFn: async () => (await api.get('/orders?limit=10')).data });
  const { data: balanceData } = useQuery({ queryKey: ['my-balance', bizId], queryFn: async () => (await api.get(`/finance/balance/${bizId}`)).data.data, enabled: !!bizId });
  const { data: productsData }= useQuery({ queryKey: ['products-list'],      queryFn: async () => (await api.get('/products')).data.data });
  const { data: invoicesData }= useQuery({ queryKey: ['invoices'],           queryFn: async () => (await api.get('/finance/invoices')).data.data });

  const orders: Order[]   = ordersData?.data || [];
  const balance: BusinessBalance | undefined = balanceData;
  const products: Product[] = (productsData || []).slice(0, 6);
  const invoices: Invoice[] = (invoicesData || []).slice(0, 4);

  const creditUsedPct   = balance
    ? Math.min(100, (Math.abs(Number(balance.current_balance)) / Math.max(Number(balance.credit_limit), 1)) * 100)
    : 0;
  const barClass        = creditUsedPct > 80 ? 'alert' : creditUsedPct > 60 ? 'warn' : 'ok';

  const pendingOrders = orders.filter((o: any) => ['pending', 'confirmed', 'processing'].includes(o.status));
  const inTransit     = orders.filter((o: any) => o.status === 'dispatched');

  return (
    <div className="animate-in">
      {/* Welcome Banner */}
      <div className="banner banner-blue">
        <div className="banner-left">
          <div className="banner-title">Welcome back, {user?.firstName}!</div>
          <div className="banner-subtitle">
            {inTransit.length > 0
              ? `${inTransit.length} order${inTransit.length > 1 ? 's' : ''} in transit`
              : 'No active deliveries'}
          </div>
        </div>
        <div className="banner-actions">
          <button type="button" onClick={() => setShowOrder(true)} className="btn-banner-solid btn-banner-solid-blue">
            + Place Order
          </button>
        </div>
      </div>

      {/* Credit Summary */}
      {balance && (
        <div className="stats-grid-4">
          <Link href="/dashboard/finance" className="stat-card violet"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">Credit Limit</div>
            <div className="stat-value-sm">₹{Number(balance.credit_limit).toLocaleString('en-IN')}</div>
          </Link>
          <Link href="/dashboard/finance" className="stat-card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">Available Credit</div>
            <div className="stat-value-sm stat-value-green">₹{Number(balance.available_credit).toLocaleString('en-IN')}</div>
          </Link>
          <Link href="/dashboard/finance" className={`stat-card ${creditUsedPct > 80 ? 'red' : 'amber'}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">Credit Used</div>
            <div className={`stat-value-sm ${creditUsedPct > 80 ? 'stat-value-red' : ''}`}>{creditUsedPct.toFixed(0)}%</div>
            <div style={{ marginTop: 8 }}>
              <div className="credit-bar-track">
                <div className={`credit-bar-fill ${barClass}`} style={{ width: `${creditUsedPct}%` }} />
              </div>
            </div>
          </Link>
          <Link href="/dashboard/orders" className="stat-card blue"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
          >
            <div className="stat-label">My Orders</div>
            <div className="stat-value-sm">{ordersData?.meta?.total ?? 0}</div>
            <div className="stat-sub">{pendingOrders.length} active</div>
          </Link>
        </div>
      )}

      <div className="content-grid-retailer">
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
                ? <tr><td colSpan={6} className="empty-cell">No orders yet. Place your first order!</td></tr>
                : orders.slice(0, 6).map((o: any) => (
                  <tr key={o.id}>
                    <td><strong style={{ color: '#2563eb' }}>{o.order_number}</strong></td>
                    <td><span className="badge badge-stone">{o.item_count} items</span></td>
                    <td><strong>₹{Number(o.total_amount).toLocaleString('en-IN')}</strong></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {o.status === 'delivered' && (
                        <button className="btn-action btn-action-blue" onClick={() => setShowOrder(true)}>
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
        <div className="flex-col-gap">
          {/* Pending Invoices */}
          <div className="card">
            <div className="card-header">
              <span className="card-title card-title-row"><Icons.Finance size={14} color="#059669" /> Recent Invoices</span>
              <Link href="/dashboard/finance" style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>View all</Link>
            </div>
            <div className="card-section-sm">
              {invoices.length === 0
                ? <div className="text-center-muted">No invoices yet</div>
                : invoices.map((inv: any) => {
                  const isPaid = Number(inv.paid_amount) >= Number(inv.total_amount);
                  return (
                    <div key={inv.id} className="list-item">
                      <div>
                        <div className="list-item-title">{inv.invoice_number}</div>
                        <div className="list-item-sub">{inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString('en-IN')}` : 'No due date'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: inv.is_void ? '#6b7280' : isPaid ? '#059669' : '#dc2626' }}>
                          ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                        </div>
                        <span className={`badge ${inv.is_void ? 'badge-stone' : isPaid ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {inv.is_void ? 'Void' : isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick Order */}
          <div className="card">
            <div className="card-header">
              <span className="card-title card-title-row"><Icons.Orders size={14} color="#2563eb" /> Quick Shop</span>
            </div>
            <div className="card-section-sm">
              {products.slice(0, 4).map((p: any) => (
                <div key={p.id} className="list-item">
                  <div>
                    <div className="list-item-title">{p.name}</div>
                    <div className="list-item-sub">
                      {p.manufacturer && <span className="manufacturer-tag-blue">{p.manufacturer} · </span>}
                      <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{p.sku}</code>
                    </div>
                  </div>
                  <button onClick={() => setShowOrder(true)} className="btn-action btn-action-green">
                    Order
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => router.push('/dashboard/products')}
                className="btn-wide btn-action-blue" style={{ color: '#2563eb' }}>
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
