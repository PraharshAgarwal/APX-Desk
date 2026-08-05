'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Icons } from '@/components/ui/Icons';

interface Result {
  icon: React.ReactNode;
  label: string;
  desc: string;
  href: string;
  category: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── Shared icon helper ──────────────────────────────────────────
const I = (C: React.ComponentType<{ size?: number; color?: string }>, color = '#6b7280') =>
  <C size={15} color={color} />;

// ── Role-scoped quick actions ───────────────────────────────────
const QUICK_ACTIONS: Record<string, Result[]> = {
  admin: [
    { icon: I(Icons.Clipboard),    label: 'Orders',           desc: 'View and manage all orders',          href: '/dashboard/orders',             category: 'Navigation' },
    { icon: I(Icons.Leaf, '#059669'), label: 'Products',      desc: 'Product catalogue & pricing',         href: '/dashboard/products',           category: 'Navigation' },
    { icon: I(Icons.Inventory),    label: 'Inventory',        desc: 'Batch & stock management',            href: '/dashboard/inventory',          category: 'Navigation' },
    { icon: I(Icons.Truck),        label: 'Warehouse Ops',    desc: 'Dispatch, GRN, adjustments',          href: '/dashboard/warehouse',          category: 'Navigation' },
    { icon: I(Icons.Analytics),    label: 'Analytics',        desc: 'Sales & performance analytics',       href: '/dashboard/analytics',          category: 'Navigation' },
    { icon: I(Icons.Finance),      label: 'Finance',          desc: 'Billing, payments & ledger',          href: '/dashboard/finance',            category: 'Navigation' },
    { icon: I(Icons.Tag),          label: 'Pricing Engine',   desc: 'Tiers, schemes & overrides',          href: '/dashboard/admin/pricing',      category: 'Admin' },
    { icon: I(Icons.Truck),        label: 'Fleet & Vehicles', desc: 'Driver and vehicle management',       href: '/dashboard/admin/fleet',        category: 'Admin' },
    { icon: I(Icons.TrendingUp),   label: 'Demand Forecast',  desc: '3-month stock projections',           href: '/dashboard/admin/forecast',     category: 'Admin' },
    { icon: I(Icons.Bell),         label: 'WhatsApp Orders',  desc: 'Incoming WA messages & bot',          href: '/dashboard/admin/whatsapp',     category: 'Admin' },
    { icon: I(Icons.Reports),      label: 'Reports',          desc: 'Exportable business reports',         href: '/dashboard/reports',            category: 'Admin' },
    { icon: I(Icons.Users),        label: 'Retailers',        desc: 'Retailer accounts & credit',          href: '/dashboard/retailers',          category: 'Navigation' },
  ],
  retailer: [
    { icon: I(Icons.Clipboard),    label: 'My Orders',        desc: 'View your order history',             href: '/dashboard/orders',             category: 'Navigation' },
    { icon: I(Icons.Leaf, '#059669'), label: 'Products',      desc: 'Browse product catalogue',            href: '/dashboard/products',           category: 'Navigation' },
    { icon: I(Icons.Truck),        label: 'Track Shipment',   desc: 'Track your delivery in real-time',    href: '/dashboard/orders/track',       category: 'Navigation' },
    { icon: I(Icons.Reports),      label: 'Invoices',         desc: 'GST invoices for your orders',        href: '/dashboard/retailers/invoices', category: 'Navigation' },
    { icon: I(Icons.CreditCard),   label: 'Account & Credit', desc: 'Credit limit and payment history',    href: '/dashboard/retailers/account',  category: 'Navigation' },
    { icon: I(Icons.Building),     label: 'Business Profile', desc: 'Manage your business details',        href: '/dashboard/retailers/profile',  category: 'Navigation' },
  ],
  warehouse_manager: [
    { icon: I(Icons.Clipboard),    label: 'Orders',           desc: 'Pending and dispatched orders',       href: '/dashboard/orders',             category: 'Navigation' },
    { icon: I(Icons.Inventory),    label: 'Inventory',        desc: 'Batch & stock management',            href: '/dashboard/inventory',          category: 'Navigation' },
    { icon: I(Icons.Truck),        label: 'Warehouse Ops',    desc: 'GRN, dispatch, adjustments',          href: '/dashboard/warehouse',          category: 'Navigation' },
    { icon: I(Icons.ChevronRight), label: 'Inter-WH Transfer',desc: 'Move stock between warehouses',      href: '/dashboard/warehouse/transfer', category: 'Navigation' },
  ],
  sales_executive: [
    { icon: I(Icons.Clipboard),    label: 'Orders',           desc: 'All orders in your territory',        href: '/dashboard/orders',             category: 'Navigation' },
    { icon: I(Icons.Leaf, '#059669'), label: 'Products',      desc: 'Product catalogue & pricing',         href: '/dashboard/products',           category: 'Navigation' },
    { icon: I(Icons.Users),        label: 'Retailers',        desc: 'Retailer accounts & leads',           href: '/dashboard/retailers',          category: 'Navigation' },
    { icon: I(Icons.Plus),         label: 'Place Order',      desc: 'Order on behalf of a retailer',       href: '/dashboard/sales/place-order',  category: 'Sales' },
    { icon: I(Icons.Target),       label: 'Leads',            desc: 'Lead pipeline & onboarding',          href: '/dashboard/sales/leads',        category: 'Sales' },
    { icon: I(Icons.TrendingUp),   label: 'Targets',          desc: 'MTD/YTD achievement & commission',    href: '/dashboard/sales/targets',      category: 'Sales' },
    { icon: I(Icons.Tag),          label: 'Schemes',          desc: 'Active schemes & promotions',         href: '/dashboard/sales/schemes',      category: 'Sales' },
    { icon: I(Icons.Scale),        label: 'Credit Scores',    desc: 'Retailer credit & risk assessment',   href: '/dashboard/sales/credit',       category: 'Sales' },
  ],
};

export function GlobalSearch({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const { primaryRole } = useAuthStore();

  const role = primaryRole() ?? 'retailer';
  const quickActions = QUICK_ACTIONS[role] ?? QUICK_ACTIONS.retailer;
  const isAdmin = role === 'admin';
  const isSales = role === 'sales_executive';
  const isWarehouse = role === 'warehouse_manager';
  const isRetailer = role === 'retailer';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      const list = query.trim() && results.length > 0 ? results : quickActions;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, list.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); go(list[activeIdx]?.href); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, query, results, quickActions, activeIdx]);

  useEffect(() => { if (!isOpen) { setQuery(''); setResults([]); setActiveIdx(0); } }, [isOpen]);
  useEffect(() => { setActiveIdx(0); }, [query]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const hits: Result[] = [];

      const ord = await api.get(`/orders?search=${encodeURIComponent(q)}&limit=5`).catch(() => null);
      (ord?.data?.data ?? []).forEach((o: any) => {
        hits.push({
          icon: I(Icons.Clipboard),
          label: o.order_number,
          desc: `${o.business_name || '—'} · ₹${Number(o.total_amount).toLocaleString('en-IN')} · ${o.status}`,
          href: '/dashboard/orders',
          category: 'Orders',
        });
      });

      const prod = await api.get(`/products?search=${encodeURIComponent(q)}&limit=5`).catch(() => null);
      (prod?.data?.data ?? []).forEach((p: any) => {
        hits.push({
          icon: I(Icons.Leaf, '#059669'),
          label: p.name,
          desc: `${p.category || 'Product'} · ₹${Number(p.price || 0).toLocaleString('en-IN')}/bag`,
          href: '/dashboard/products',
          category: 'Products',
        });
      });

      if (isAdmin || isSales) {
        const biz = await api.get(`/businesses?search=${encodeURIComponent(q)}&limit=5`).catch(() => null);
        (biz?.data?.data ?? []).forEach((b: any) => {
          hits.push({
            icon: I(Icons.Store),
            label: b.name,
            desc: `${b.city || ''} · ${b.is_active ? 'Active' : 'Inactive'}`,
            href: '/dashboard/retailers',
            category: 'Retailers',
          });
        });
      }

      if (isAdmin || isWarehouse) {
        const inv = await api.get(`/inventory?search=${encodeURIComponent(q)}&limit=5`).catch(() => null);
        (inv?.data?.data ?? []).forEach((i: any) => {
          hits.push({
            icon: I(Icons.Inventory),
            label: i.product_name || i.name,
            desc: `${i.warehouse_name || 'Inventory'} · ${i.quantity || '—'} bags`,
            href: '/dashboard/inventory',
            category: 'Inventory',
          });
        });
      }

      setResults(hits.slice(0, 10));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isSales, isWarehouse]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const go = (href?: string) => {
    if (!href) return;
    onClose();
    router.push(href);
  };

  const displayList = query.trim() && results.length > 0 ? results : quickActions;
  const hasResults  = query.trim() && results.length > 0;
  const noResults   = query.trim() && !loading && results.length === 0;

  const grouped = !hasResults
    ? quickActions.reduce((acc: Record<string, Result[]>, r) => {
        (acc[r.category] ??= []).push(r);
        return acc;
      }, {})
    : null;

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,20,30,0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 9000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 72,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 620, background: '#fff', borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          overflow: 'hidden', animation: 'scaleIn 0.15s ease',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <Icons.Search size={18} color="#9ca3af" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isRetailer ? 'Search your orders and products…' : isWarehouse ? 'Search orders and inventory…' : 'Search orders, products, retailers…'}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: 'var(--font-body)', color: '#1a1d23', background: 'none' }}
          />
          {loading
            ? <span style={{ fontSize: 12, color: '#9ca3af' }}>Searching…</span>
            : <kbd style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: '#6b7280' }}>ESC</kbd>}
        </div>

        {/* Results body */}
        <div style={{ maxHeight: 440, overflowY: 'auto' }}>
          {noResults && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af' }}>
              No results for &ldquo;<strong style={{ color: '#374151' }}>{query}</strong>&rdquo;
            </div>
          )}

          {hasResults && (
            <>
              {['Orders','Products','Retailers','Inventory'].map(cat => {
                const items = results.filter(r => r.category === cat);
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat}</div>
                    {items.map((r, i) => {
                      const globalIdx = displayList.indexOf(r);
                      return <SearchRow key={i} r={r} active={globalIdx === activeIdx} onHover={() => setActiveIdx(globalIdx)} onClick={() => go(r.href)} />;
                    })}
                  </div>
                );
              })}
            </>
          )}

          {!hasResults && !noResults && grouped && (
            <>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat}</div>
                  {items.map((r, i) => {
                    const globalIdx = quickActions.indexOf(r);
                    return <SearchRow key={i} r={r} active={globalIdx === activeIdx} onHover={() => setActiveIdx(globalIdx)} onClick={() => go(r.href)} />;
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 16, fontSize: 11, color: '#9ca3af', alignItems: 'center' }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>ESC close</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'var(--font-head)' }}>⌘K</span>
            anywhere
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SearchRow({ r, active, onHover, onClick }: { r: Result; active: boolean; onHover: () => void; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '9px 20px', border: 'none',
        background: active ? '#f0fdf4' : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      <span style={{
        width: 34, height: 34,
        background: active ? '#dcfce7' : '#f3f4f6',
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'background 0.1s',
        color: active ? '#059669' : '#6b7280',
      }}>
        {r.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</div>
      </div>
      <Icons.ChevronRight size={12} color={active ? '#059669' : '#d1d5db'} />
    </button>
  );
}
