'use client';

import { useAuthStore } from '@/store/authStore';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import RetailerDashboard from '@/components/dashboard/RetailerDashboard';
import WarehouseDashboard from '@/components/dashboard/WarehouseDashboard';
import SalesDashboard from '@/components/dashboard/SalesDashboard';

export default function DashboardPage() {
  const { primaryRole } = useAuthStore();
  const role = primaryRole();

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'retailer') return <RetailerDashboard />;
  if (role === 'warehouse_manager') return <WarehouseDashboard />;
  if (role === 'sales_executive') return <SalesDashboard />;

  return <AdminDashboard />;
}
