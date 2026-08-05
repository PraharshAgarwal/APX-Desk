'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Modal from '@/components/ui/Modal';
import { Icons } from '@/components/ui/Icons';
import { useToast } from '@/hooks/useToast';

// Brand color palette — maps manufacturer → accent color
const BRAND_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'IFFCO':              { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#2563eb' },
  'Oswal Fertilizers':  { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce', badge: '#9333ea' },
  'Dayal Fertilizers':  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', badge: '#ea580c' },
  'Jordan Potash':      { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badge: '#16a34a' },
  'BioMax Organics':    { bg: '#fefce8', border: '#fef08a', text: '#854d0e', badge: '#ca8a04' },
  'Generic':            { bg: '#f9fafb', border: '#e5e7eb', text: '#374151', badge: '#6b7280' },
};

function brandColor(mfr: string) {
  return BRAND_COLORS[mfr] || BRAND_COLORS['Generic'];
}

export default function ProductsPage() {
  const { hasAnyRole } = useAuthStore();
  const qc = useQueryClient();
  const [activeBrand, setActiveBrand] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<any>(null);

  const isAdmin = hasAnyRole(['admin', 'sales_executive']);

  // Fetch products (optionally filtered by manufacturer)
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', activeBrand, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeBrand !== 'All') params.set('manufacturer', activeBrand);
      if (search) params.set('search', search);
      return (await api.get(`/products?${params}`)).data;
    },
  });

  // Fetch distinct manufacturers for brand tabs
  const { data: mfrData } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      try {
        return (await api.get('/products/manufacturers')).data.data;
      } catch { return []; }
    },
  });

  const products: any[] = productsData?.data || [];
  const manufacturers: any[] = mfrData || [];

  // Group products by manufacturer for card-grid view
  const grouped = products.reduce((acc: Record<string, any[]>, p: any) => {
    const brand = p.manufacturer || 'Generic';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(p);
    return acc;
  }, {});

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, background: '#f4f6f9', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
          {/* All tab */}
          <BrandTab label="All" count={manufacturers.reduce((s: number, m: any) => s + Number(m.product_count), 0)}
            active={activeBrand === 'All'} color={BRAND_COLORS['Generic']} onClick={() => setActiveBrand('All')} />
          {/* Per-brand tabs */}
          {manufacturers.map((m: any) => (
            <BrandTab key={m.manufacturer} label={m.manufacturer} count={Number(m.product_count)}
              active={activeBrand === m.manufacturer} color={brandColor(m.manufacturer)}
              onClick={() => setActiveBrand(m.manufacturer)} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="Search products…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
          {isAdmin && (
            <button className="btn-primary" id="add-product-btn" onClick={() => setShowCreateModal(true)}>
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* Brand Header — when a brand is selected */}
      {activeBrand !== 'All' && (
        <div style={{
          background: brandColor(activeBrand).bg, border: `1px solid ${brandColor(activeBrand).border}`,
          borderRadius: 12, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: brandColor(activeBrand).badge, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: '#fff',
          }}>
            {activeBrand.charAt(0)}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, color: brandColor(activeBrand).text }}>
              {activeBrand}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {products.length} product{products.length !== 1 ? 's' : ''} in catalog
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading products…</div>
      ) : activeBrand === 'All' ? (
        /* Grouped view — one section per brand */
        <div>
          {Object.entries(grouped).length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>No products found</div>
          ) : Object.entries(grouped).map(([brand, prods]) => (
            <BrandSection key={brand} brand={brand} products={prods} isAdmin={isAdmin}
              onPricing={setPricingProduct} />
          ))}
        </div>
      ) : (
        /* Single brand — card grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {products.length === 0
            ? <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', color: '#9ca3af' }}>No products</div>
            : products.map((p: any) => (
              <ProductCard key={p.id} product={p} isAdmin={isAdmin} onPricing={setPricingProduct} />
            ))}
        </div>
      )}

      {showCreateModal && <CreateProductModal onClose={() => { setShowCreateModal(false); qc.invalidateQueries({ queryKey: ['products'] }); }} />}
      {pricingProduct && <PricingModal product={pricingProduct} onClose={() => setPricingProduct(null)} />}
    </div>
  );
}

/* ── Brand Tab ─────────────────────────────────────── */
function BrandTab({ label, count, active, color, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      background: active ? color.bg : 'transparent',
      color: active ? color.text : '#6b7280',
      border: active ? `1px solid ${color.border}` : '1px solid transparent',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      <span style={{
        background: active ? color.badge : '#e5e7eb', color: active ? '#fff' : '#6b7280',
        borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700,
      }}>{count}</span>
    </button>
  );
}

/* ── Brand Section (All view) ──────────────────────── */
function BrandSection({ brand, products, isAdmin, onPricing }: any) {
  const c = brandColor(brand);
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: c.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 800, color: '#fff' }}>
          {brand.charAt(0)}
        </div>
        <div>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: c.text }}>{brand}</span>
          <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>{products.length} product{products.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ flex: 1, height: 1, background: c.border, marginLeft: 4 }} />
      </div>
      {/* Product Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {products.map((p: any) => (
          <ProductCard key={p.id} product={p} isAdmin={isAdmin} onPricing={onPricing} />
        ))}
      </div>
    </div>
  );
}

/* ── Product Card ──────────────────────────────────── */
function ProductCard({ product: p, isAdmin, onPricing }: any) {
  const c = brandColor(p.manufacturer || 'Generic');
  const qty = Number(p.available_qty || 0);
  const isLow = qty > 0 && qty < 100;
  const isOut = qty === 0;

  return (
    <div style={{
      background: '#fff', border: `1px solid ${isOut ? '#fecaca' : isLow ? '#fed7aa' : '#e5e7eb'}`,
      borderRadius: 12, padding: '16px 18px', transition: 'box-shadow 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)')}>

      {/* Top row: Brand badge + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {p.manufacturer || 'Generic'}
        </span>
        <span className={`badge ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 10 }}>
          {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
        </span>
      </div>

      {/* Product name + SKU */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#1a1d23', marginBottom: 4, lineHeight: 1.3 }}>
        {p.name}
      </div>
      <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, color: '#4b5563', display: 'inline-block', marginBottom: 10 }}>
        {p.sku}
      </code>

      {/* Category */}
      {p.category_name && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icons.Tag size={10} color="#9ca3af" /> {p.category_name}
        </div>
      )}

      {/* Price + Stock row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: '#059669' }}>
            {p.base_price ? `₹${Number(p.base_price).toLocaleString('en-IN')}` : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>per {p.unit} · GST {p.gst_rate}%</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: isOut ? '#dc2626' : '#1a1d23' }}>
            {qty.toFixed(0)}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.unit}s available</div>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button onClick={() => onPricing(p)} style={{ flex: 1, fontSize: 11, fontWeight: 600, color: c.text, background: c.bg, border: `1px solid ${c.border}`, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icons.Finance size={11} color={c.text} /> Pricing
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Create Product Modal ──────────────────────────── */
function CreateProductModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get('/products')).data.data });
  const MANUFACTURERS = ['IFFCO', 'Oswal Fertilizers', 'Dayal Fertilizers', 'Jordan Potash', 'BioMax Organics', 'National Fertilizers Ltd', 'Chambal Fertilizers', 'Coromandel International', 'Other'];

  const [form, setForm] = useState({ sku: '', name: '', description: '', manufacturer: '', unit: 'bag', gstRate: 0, lowStockThreshold: 100, hsnCode: '' });
  const [basePrice, setBasePrice] = useState('');

  const toast = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const p = await api.post('/products', form);
      if (basePrice) {
        await api.post(`/products/${p.data.data.id}/pricing`, { pricingType: 'standard', pricePerUnit: Number(basePrice) });
      }
      return p;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['manufacturers'] });
      toast.success('Product added successfully');
      onClose();
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add product');
    },
  });

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Modal title="Add New Product" onClose={onClose} size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mutation.mutate()}
            disabled={!form.sku || !form.name || !form.manufacturer || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Add Product'}
          </button>
        </>
      }>
      <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>SKU *</label>
              <input className="form-input" value={form.sku} onChange={e => f('sku', e.target.value)} placeholder="UREA-46" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Unit *</label>
              <select className="form-input" value={form.unit} onChange={e => f('unit', e.target.value)}>
                {['bag', 'kg', 'litre', 'bottle', 'drum'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Product Name *</label>
            <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Urea (46% N)" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Manufacturer / Brand *</label>
            <select className="form-input" value={form.manufacturer} onChange={e => f('manufacturer', e.target.value)}>
              <option value="">Select manufacturer…</option>
              {MANUFACTURERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Base Price (₹)</label>
              <input className="form-input" type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="1350" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>GST Rate (%)</label>
              <select className="form-input" value={form.gstRate} onChange={e => f('gstRate', Number(e.target.value))}>
                {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Reorder Point</label>
              <input className="form-input" type="number" value={form.lowStockThreshold} onChange={e => f('lowStockThreshold', Number(e.target.value))} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Description</label>
            <textarea className="form-input" value={form.description} onChange={e => f('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} placeholder="Product details…" />
          </div>

        {mutation.isError && <div className="field-error" style={{ marginTop: 8 }}>Save failed. SKU may already exist.</div>}
      </div>
    </Modal>
  );
}

/* ── Pricing Modal ─────────────────────────────────── */
function PricingModal({ product, onClose }: { product: any; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const c = brandColor(product.manufacturer || 'Generic');
  const { data } = useQuery({ queryKey: ['pricing', product.id], queryFn: async () => (await api.get(`/products/${product.id}/pricing`)).data.data });
  const [form, setForm] = useState({ pricingType: 'standard', pricePerUnit: '', discountPct: 0, minQuantity: 1 });

  const mutation = useMutation({
    mutationFn: async () => api.post(`/products/${product.id}/pricing`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing', product.id] });
      toast.success('Pricing tier saved');
      setForm({ pricingType: 'standard', pricePerUnit: '', discountPct: 0, minQuantity: 1 });
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save pricing');
    },
  });

  const pricingList: any[] = data || [];
  const TYPE_LABELS: Record<string, string> = { standard: 'Standard', tiered: 'Volume / Tiered', customer_specific: 'Customer-specific', promotional: 'Promotion' };

  return (
    <Modal title={`Pricing — ${product.name}`} onClose={onClose} size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={() => mutation.mutate()} disabled={!form.pricePerUnit || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save Tier'}
          </button>
        </>
      }>
      <div style={{ fontSize: 11, color: c.text, fontWeight: 600, marginBottom: 14, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: '4px 10px', display: 'inline-block' }}>
        {product.manufacturer || 'Generic'} · {product.sku}
      </div>
          {/* Existing pricing tiers */}
          {pricingList.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>Current Pricing</div>
              {pricingList.map((pp: any) => (
                <div
                  key={pp.id}
                  title="Click to fill form below"
                  onClick={() => setForm(f => ({
                    ...f,
                    pricePerUnit: String(pp.price_per_unit),
                    pricingType:  pp.pricing_type,
                    discountPct:  Number(pp.discount_pct ?? 0),
                    minQuantity:  Number(pp.min_quantity ?? 1),
                  }))}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    background: '#f8f9fb', borderRadius: 8,
                    padding: '8px 12px', marginBottom: 6, alignItems: 'center',
                    cursor: 'pointer', border: '1px solid transparent',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = '#ecfdf5';
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#6ee7b7';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = '#f8f9fb';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1d23' }}>{TYPE_LABELS[pp.pricing_type] || pp.pricing_type}</span>
                    {pp.min_quantity > 1 && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>Min {pp.min_quantity} {product.unit}s</span>}
                    {pp.business_name && <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 8 }}>→ {pp.business_name}</span>}
                    <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8, fontStyle: 'italic' }}>↓ fill</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#059669' }}>₹{Number(pp.price_per_unit).toLocaleString('en-IN')}</div>
                    {pp.discount_pct > 0 && <div style={{ fontSize: 11, color: '#059669' }}>−{pp.discount_pct}% off</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add pricing tier */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>Add Pricing Tier</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Type</label>
              <select className="form-input" value={form.pricingType} onChange={e => setForm(f => ({ ...f, pricingType: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Price per {product.unit} (₹)</label>
              <input className="form-input" type="number" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))} placeholder="1350" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Min Qty</label>
              <input className="form-input" type="number" min={1} value={form.minQuantity} onChange={e => setForm(f => ({ ...f, minQuantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>Discount %</label>
              <input className="form-input" type="number" min={0} max={100} value={form.discountPct} onChange={e => setForm(f => ({ ...f, discountPct: Number(e.target.value) }))} />
            </div>
          </div>

    </Modal>
  );
}
