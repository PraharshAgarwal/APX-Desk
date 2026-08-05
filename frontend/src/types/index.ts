/**
 * APX Desk — Shared TypeScript interfaces
 * Matches the backend API response shapes.
 */

// ── Pagination ──────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Auth / User ─────────────────────────────────────────────────
export interface User {
  id: string;
  businessId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// ── Business ────────────────────────────────────────────────────
export interface Business {
  id: string;
  name: string;
  type: 'manufacturer' | 'distributor' | 'retailer';
  gstin?: string;
  address?: Record<string, string>;
  phone?: string;
  email?: string;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
}

export interface BusinessBalance {
  business_id: string;
  business_name: string;
  credit_limit: number | string;
  current_balance: number | string;
  available_credit: number | string;
  total_debits: number | string;
  total_credits: number | string;
}

// ── Product ─────────────────────────────────────────────────────
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  category_name?: string;
  unit: string;
  gst_rate: number;
  manufacturer?: string;
  hsn_code?: string;
  low_stock_threshold: number;
  is_active: boolean;
  base_price?: number | string | null;
  available_qty?: number | string | null;
  updated_at?: string;
  created_at?: string;
}

export interface ProductPricing {
  id: string;
  product_id: string;
  product_name?: string;
  pricing_type: 'standard' | 'tiered' | 'customer_specific' | 'promotional';
  business_id?: string | null;
  business_name?: string | null;
  min_quantity: number;
  max_quantity?: number | null;
  price_per_unit: number | string;
  discount_pct: number | string;
  valid_from?: string;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Order ───────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number | string;
  tax_rate: number | string;
  line_total: number | string;
}

export interface Order {
  id: string;
  order_number: string;
  business_id: string;
  business_name?: string;
  placed_by?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  warehouse_id?: string;
  status: OrderStatus;
  subtotal: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  delivery_address?: Record<string, string>;
  notes?: string;
  item_count?: number;
  items?: OrderItem[];
  created_at: string;
  updated_at?: string;
}

// ── Inventory ───────────────────────────────────────────────────
export interface InventoryBatch {
  id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  warehouse_id: string;
  warehouse_name?: string;
  grn_id?: string;
  batch_number: string;
  quantity: number | string;
  reserved_qty: number | string;
  received_qty: number | string;
  cost_per_unit: number | string;
  expiry_date?: string | null;
  manufacture_date?: string | null;
  is_active: boolean;
  available_qty?: number | string;
  days_until_expiry?: number;
  low_stock_threshold?: number;
  nearest_expiry?: string;
  created_at?: string;
}

export interface StockSummary {
  product_id: string;
  product_name: string;
  sku?: string;
  warehouse_id: string;
  warehouse_name?: string;
  available_qty: number | string;
  low_stock_threshold: number | string;
  nearest_expiry?: string | null;
}

// ── Finance / Invoice ───────────────────────────────────────────
export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  business_id: string;
  subtotal: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  due_date?: string | null;
  is_void: boolean;
  generated_by?: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  business_id: string;
  type: 'debit' | 'credit';
  amount: number | string;
  reference_id?: string;
  reference_type?: string;
  description?: string;
  created_at: string;
}

// ── Warehouse / Transfer ────────────────────────────────────────
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: Record<string, string>;
  manager_id?: string;
  is_active: boolean;
}

export interface Transfer {
  id: string;
  transfer_number?: string;
  source_warehouse_id: string;
  source_warehouse_name?: string;
  dest_warehouse_id: string;
  dest_warehouse_name?: string;
  status: 'in_transit' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
}

// ── GRN ────────────────────────────────────────────────────────
export interface GRN {
  id: string;
  grn_number: string;
  warehouse_id: string;
  supplier_name: string;
  invoice_number?: string;
  status: 'draft' | 'completed';
  received_by?: string;
  completed_at?: string;
  created_at: string;
}

// ── Notification ────────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
