'use client';

import { usePathname } from 'next/navigation';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { Icons } from '@/components/ui/Icons';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/products': 'Products & Pricing',
  '/dashboard/inventory': 'Inventory Management',
  '/dashboard/orders': 'Orders',
  '/dashboard/warehouse': 'Warehouse Operations',
  '/dashboard/finance': 'Financial Ledger',
  '/dashboard/admin': 'Administration',
};

export default function Topbar() {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || (key !== '/dashboard' && pathname.startsWith(key))
  )?.[1] || 'FDMS';

  return (
    <header style={{
      height: 56, background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, color: '#1a1d23', flex: 1 }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f4f6f9', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px' }}>
        <Icons.Search size={14} color="#9ca3af" />
        <input id="topbar-search" placeholder="Search…"
          style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#1a1d23', width: 180 }} />
      </div>

      <NotificationPanel />

      <button id="settings-btn" title="Settings"
        style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Icons.Settings size={16} color="#6b7280" />
      </button>
    </header>
  );
}
