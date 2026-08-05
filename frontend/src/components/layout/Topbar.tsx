'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { GlobalSearch } from '@/components/ui/GlobalSearch';
import { Icons } from '@/components/ui/Icons';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/products': 'Products & Pricing',
  '/dashboard/inventory': 'Inventory Management',
  '/dashboard/orders': 'Orders',
  '/dashboard/orders/track': 'Track Shipment',
  '/dashboard/warehouse': 'Warehouse Operations',
  '/dashboard/warehouse/transfer': 'Inter-WH Transfer',
  '/dashboard/finance': 'Financial Ledger',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/reports': 'Reports',
  '/dashboard/retailers': 'Retailers',
  '/dashboard/settings': 'Settings',
  '/dashboard/admin': 'Administration',
  '/dashboard/admin/pricing': 'Pricing Engine',
  '/dashboard/admin/fleet': 'Fleet & Vehicles',
  '/dashboard/admin/forecast': 'Demand Forecast',
  '/dashboard/admin/whatsapp': 'WhatsApp Orders',
  '/dashboard/sales/leads': 'Leads & Onboarding',
  '/dashboard/sales/targets': 'Targets & Pipeline',
  '/dashboard/sales/schemes': 'Schemes & Promos',
  '/dashboard/sales/credit': 'Credit Scores',
};

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const title = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname === key || pathname.startsWith(key + '/'))?.[1] || 'APX Desk';

  return (
    <>
      <header style={{
        height: 56, background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Mobile hamburger */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="mobile-menu-btn"
            aria-label="Toggle sidebar"
            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 16 }}
          >
            ☰
          </button>
        )}

        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, color: '#1a1d23', flex: 1 }}>
          {title}
        </h1>

        {/* Search trigger — clicking opens the overlay */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f4f6f9', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '6px 12px', cursor: 'pointer', minWidth: 200, textAlign: 'left',
          }}
        >
          <Icons.Search size={14} color="#9ca3af" />
          <span style={{ fontSize: 13, color: '#9ca3af', flex: 1 }}>Search…</span>
          <kbd style={{ fontSize: 10, background: '#e5e7eb', padding: '1px 5px', borderRadius: 4, color: '#6b7280', whiteSpace: 'nowrap' }}>⌘K</kbd>
        </button>

        <NotificationPanel />

        <button id="settings-btn" title="Settings" type="button"
          style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icons.Settings size={16} color="#6b7280" />
        </button>
      </header>

      {/* Global search overlay rendered outside header so it covers full viewport */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
