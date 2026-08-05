'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Icons } from '@/components/ui/Icons';

type NavItem = { icon: React.ReactNode; label: string; href: string };
type NavSection = { section: string; items: NavItem[] };

const ADMIN_NAV: NavSection[] = [
  {
    section: 'OVERVIEW',
    items: [
      { icon: <Icons.Dashboard size={16} />, label: 'Dashboard',       href: '/dashboard' },
      { icon: <Icons.Analytics size={16} />, label: 'Analytics',       href: '/dashboard/analytics' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { icon: <Icons.Orders size={16} />,    label: 'Orders',          href: '/dashboard/orders' },
      { icon: <Icons.Store size={16} />,     label: 'Retailers',       href: '/dashboard/retailers' },
      { icon: <Icons.Products size={16} />,  label: 'Products',        href: '/dashboard/products' },
      { icon: <Icons.Inventory size={16} />, label: 'Inventory',       href: '/dashboard/inventory' },
      { icon: <Icons.Warehouse size={16} />, label: 'Warehouse',       href: '/dashboard/warehouse' },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      { icon: <Icons.Finance size={16} />,   label: 'Billing & Finance', href: '/dashboard/finance' },
      { icon: <Icons.Reports size={16} />,   label: 'Reports',           href: '/dashboard/reports' },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { icon: <Icons.Analytics size={16} />, label: 'Pricing Engine',  href: '/dashboard/admin/pricing' },
      { icon: <Icons.Warehouse size={16} />, label: 'Fleet & Vehicles', href: '/dashboard/admin/fleet' },
      { icon: <Icons.Reports size={16} />,   label: 'Demand Forecast',  href: '/dashboard/admin/forecast' },
      { icon: <Icons.Orders size={16} />,    label: 'WhatsApp Orders',  href: '/dashboard/admin/whatsapp' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { icon: <Icons.Admin size={16} />,    label: 'Users & Roles',    href: '/dashboard/admin' },
      { icon: <Icons.Settings size={16} />, label: 'Settings',         href: '/dashboard/settings' },
    ],
  },
];

const FLAT_NAV: Record<string, NavItem[]> = {
  retailer: [
    { icon: <Icons.Dashboard size={16} />, label: 'Dashboard',      href: '/dashboard' },
    { icon: <Icons.Products size={16} />,  label: 'Place Order',    href: '/dashboard/sales/place-order' },
    { icon: <Icons.Orders size={16} />,    label: 'My Orders',      href: '/dashboard/orders' },
    { icon: <Icons.Warehouse size={16} />, label: 'Track Shipment', href: '/dashboard/orders/track' },
    { icon: <Icons.Finance size={16} />,   label: 'Invoices',       href: '/dashboard/retailers/invoices' },
    { icon: <Icons.Finance size={16} />,   label: 'Account',        href: '/dashboard/retailers/account' },
    { icon: <Icons.Admin size={16} />,     label: 'Business Profile', href: '/dashboard/retailers/profile' },
  ],
  warehouse_manager: [
    { icon: <Icons.Dashboard size={16} />, label: 'Dashboard',      href: '/dashboard' },
    { icon: <Icons.Inventory size={16} />, label: 'Inventory',      href: '/dashboard/inventory' },
    { icon: <Icons.Orders size={16} />,    label: 'Orders',         href: '/dashboard/orders' },
    { icon: <Icons.Warehouse size={16} />, label: 'Warehouse Ops',  href: '/dashboard/warehouse' },
    { icon: <Icons.Products size={16} />,  label: 'Inter-WH Transfer', href: '/dashboard/warehouse/transfer' },
  ],
  sales_executive: [
    { icon: <Icons.Dashboard size={16} />, label: 'Dashboard',    href: '/dashboard' },
    { icon: <Icons.Products size={16} />,  label: 'Products',     href: '/dashboard/products' },
    { icon: <Icons.Orders size={16} />,    label: 'Orders',       href: '/dashboard/orders' },
    { icon: <Icons.Store size={16} />,     label: 'Retailers',    href: '/dashboard/retailers' },
    { icon: <Icons.Orders size={16} />,    label: 'Place Order',  href: '/dashboard/sales/place-order' },
    { icon: <Icons.Analytics size={16} />, label: 'Leads',        href: '/dashboard/sales/leads' },
    { icon: <Icons.Reports size={16} />,   label: 'Targets',      href: '/dashboard/sales/targets' },
    { icon: <Icons.Finance size={16} />,   label: 'Schemes',      href: '/dashboard/sales/schemes' },
    { icon: <Icons.Analytics size={16} />, label: 'Credit Scores',href: '/dashboard/sales/credit' },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', retailer: 'Retailer',
  warehouse_manager: 'WH Manager', sales_executive: 'Sales Exec',
};

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, primaryRole, logout } = useAuthStore();
  const role = primaryRole() || 'retailer';
  const isAdmin = role === 'admin';

  const handleLogout = () => { logout(); router.replace('/login'); };
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U';
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 34, height: 34, background: '#059669', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icons.Package size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: '#1a1d23' }}>APX Desk</div>
          <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Distribution Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {isAdmin ? (
          ADMIN_NAV.map((group) => (
            <div key={group.section} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 10px 4px' }}>
                {group.section}
              </div>
              {group.items.map(item => (
                <Link key={item.href} href={item.href}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                  <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 10px 4px' }}>Menu</div>
            {(FLAT_NAV[role] || FLAT_NAV.retailer).map(item => (
              <Link key={item.href} href={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </div>

      {/* User Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#059669', fontFamily: 'var(--font-head)', flexShrink: 0, border: '1px solid #d1fae5' }}>
            {initials}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{ROLE_LABELS[role]}</div>
          </div>
          <button id="logout-btn" onClick={handleLogout} title="Logout"
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.LogOut size={14} color="#dc2626" />
          </button>
        </div>
      </div>
    </nav>
  );
}
