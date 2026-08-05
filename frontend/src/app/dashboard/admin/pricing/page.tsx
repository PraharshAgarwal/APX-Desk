'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (n: number | string) => '₹' + Number(n).toLocaleString('en-IN');
const disc = (base: number, over: number) => `${((1 - over / base) * 100).toFixed(1)}%`;

const TABS = ['Product Pricing', 'Seasonal Schemes', 'Custom Overrides'] as const;
type Tab = typeof TABS[number];



const STATUS_BADGE: Record<string, string> = { Active: 'badge-green', Upcoming: 'badge-amber', Expired: 'badge-red' };

/* ── Main Component ─────────────────────────────────────────── */
export default function PricingPage() {
  const router = useRouter();
  const { hasAnyRole } = useAuthStore();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('Product Pricing');

  /* ── Product Pricing state ── */
  // localPrices: { [productId]: { price: string, gst: string } }
  const [localPrices, setLocalPrices] = useState<Record<string, { price: string; gst: string }>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  /* ── Override modal state ── */
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ productId: '', businessId: '', price: '' });

  /* ── Scheme modal state ── */
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeForm, setSchemeForm] = useState({ productId: '', name: '', extra: '', validFrom: '', validUntil: '', discountPct: '' });

  /* ── Queries ── */
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products-pricing'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100&isActive=true');
      return res.data?.data ?? [];
    },
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses-pricing'],
    queryFn: async () => (await api.get('/businesses')).data?.data ?? [],
  });

  const { data: overrides = [], isLoading: loadingOverrides } = useQuery({
    queryKey: ['pricing-overrides'],
    queryFn: async () => (await api.get('/products/pricing/all?type=customer_specific')).data?.data ?? [],
    enabled: tab === 'Custom Overrides',
  });

  const { data: schemes = [], isLoading: loadingSchemes } = useQuery({
    queryKey: ['pricing-schemes'],
    queryFn: async () => (await api.get('/products/pricing/all?type=promotional')).data?.data ?? [],
    enabled: tab === 'Seasonal Schemes',
  });

  /* ── Mutations ── */
  const savePriceMutation = useMutation({
    mutationFn: async ({ productId, price, gst }: { productId: string; price: string; gst: string }) => {
      await api.post(`/products/${productId}/pricing`, { pricingType: 'standard', pricePerUnit: parseFloat(price) });
      await api.patch(`/products/${productId}`, { gstRate: parseFloat(gst) });
    },
    onSuccess: (_, vars) => {
      setSaved(p => ({ ...p, [vars.productId]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [vars.productId]: false })), 2500);
      qc.invalidateQueries({ queryKey: ['products-pricing'] });
      toast.success('Price saved successfully');
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save price');
    },
  });

  const addOverrideMutation = useMutation({
    mutationFn: async () => {
      const { productId, businessId, price } = overrideForm;
      return api.post(`/products/${productId}/pricing`, {
        pricingType: 'customer_specific', businessId,
        pricePerUnit: parseFloat(price), minQuantity: 1,
      });
    },
    onSuccess: () => {
      setShowOverrideModal(false);
      setOverrideForm({ productId: '', businessId: '', price: '' });
      qc.invalidateQueries({ queryKey: ['pricing-overrides'] });
      toast.success('Override added');
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add override');
    },
  });

  const removeOverrideMutation = useMutation({
    mutationFn: async ({ productId, pricingId }: { productId: string; pricingId: string }) =>
      api.delete(`/products/${productId}/pricing/${pricingId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricing-overrides'] }); toast.success('Override removed'); },
    onError: () => toast.error('Failed to remove override'),
  });

  const addSchemeMutation = useMutation({
    mutationFn: async () => {
      const { productId, discountPct, validFrom, validUntil } = schemeForm;
      return api.post(`/products/${productId}/pricing`, {
        pricingType: 'promotional', pricePerUnit: 0,
        discountPct: parseFloat(discountPct),
        validFrom: validFrom || undefined, validUntil: validUntil || undefined, minQuantity: 1,
      });
    },
    onSuccess: () => {
      setShowSchemeModal(false);
      setSchemeForm({ productId: '', name: '', extra: '', validFrom: '', validUntil: '', discountPct: '' });
      qc.invalidateQueries({ queryKey: ['pricing-schemes'] });
      toast.success('Seasonal scheme added');
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add scheme');
    },
  });

  const removeSchemeMutation = useMutation({
    mutationFn: async ({ productId, pricingId }: { productId: string; pricingId: string }) =>
      api.delete(`/products/${productId}/pricing/${pricingId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-schemes'] }),
  });

  /* ── Access guard ── */
  if (!hasAnyRole(['admin'])) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div className="card-title" style={{ marginBottom: 8 }}>Admin access required</div>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Go back</button>
      </div>
    );
  }

  const prods: any[] = products as any[];
  const bizList: any[] = businesses as any[];
  const overrideList: any[] = overrides as any[];
  const schemeList: any[] = schemes as any[];

  return (
    <div className="animate-in">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t ? 600 : 400,
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab === t ? 'var(--shadow)' : 'none',
            transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>


      {/* ── TAB: Product Pricing ── */}
      {tab === 'Product Pricing' && (
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">Product Base Prices</span>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>Edit each product's standard price and GST rate, then click Save.</div>
            </div>
          </div>
          {loadingProducts ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-faint)' }}>Loading products…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>MRP (₹/bag)</th>
                  <th>Base Price</th>
                  <th>GST %</th>
                  <th>Min Sell Price</th>
                  <th>Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {prods.map((p: any, idx: number) => {
                  const currentPrice = Number(p.base_price ?? p.price ?? 0);
                  const local = localPrices[p.id];
                  const editPrice = local?.price !== undefined ? local.price : String(currentPrice);
                  const editGst   = local?.gst   !== undefined ? local.gst   : String(p.gst_rate ?? 5);
                  const newPrice  = parseFloat(editPrice) || 0;
                  const gstPct    = parseFloat(editGst)   || 0;
                  // MRP = base price + GST (what customer would see on bag)
                  const mrp       = Math.round(newPrice * (1 + gstPct / 100));
                  // Min sell price = 92% of base (8% floor margin)
                  const minSell   = Math.round(newPrice * 0.92);
                  const isDirty   = local !== undefined && (local.price !== String(currentPrice) || local.gst !== String(p.gst_rate ?? 5));
                  const isSaved   = saved[p.id];
                  const lastUpdated = p.updated_at
                    ? new Date(p.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                    : 'Not set';

                  return (
                    <tr key={p.id ?? String(idx)}>
                      {/* Product + category sub-label */}
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {(p.category_name || p.category) && (
                          <div className="sub">{p.category_name || p.category}</div>
                        )}
                      </td>

                      {/* MRP — read-only, derived from editable base + GST */}
                      <td style={{ fontWeight: 600, color: 'var(--emerald-700)' }}>
                        {mrp > 0 ? fmt(mrp) : '—'}
                      </td>

                      {/* Base Price — editable */}
                      <td>
                        <input
                          type="number" min="0" step="0.01"
                          className="form-input"
                          value={editPrice}
                          onChange={e => setLocalPrices(prev => ({ ...prev, [p.id]: { price: e.target.value, gst: editGst } }))}
                          style={{ width: 110, padding: '5px 8px' }}
                        />
                      </td>

                      {/* GST % — editable select */}
                      <td>
                        <select
                          className="form-input"
                          value={editGst}
                          onChange={e => setLocalPrices(prev => ({ ...prev, [p.id]: { price: editPrice, gst: e.target.value } }))}
                          style={{ width: 72, padding: '5px 8px' }}
                        >
                          {['0','5','12','18','28'].map(g => <option key={g} value={g}>{g}%</option>)}
                        </select>
                      </td>

                      {/* Min Sell Price — calculated floor */}
                      <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {minSell > 0 ? fmt(minSell) : '—'}
                      </td>

                      {/* Last Updated */}
                      <td style={{ fontSize: 12, color: 'var(--text-faint)' }}>{lastUpdated}</td>

                      {/* Save / Update action */}
                      <td>
                        {isSaved
                          ? <span className="badge badge-green">✓ Saved</span>
                          : <button
                              type="button"
                              className={isDirty ? 'btn-primary' : 'btn-secondary'}
                              style={{ padding: '5px 14px', fontSize: 12, opacity: savePriceMutation.isPending ? 0.6 : 1 }}
                              disabled={savePriceMutation.isPending}
                              onClick={() => savePriceMutation.mutate({ productId: p.id, price: editPrice, gst: editGst })}
                            >
                              {isDirty ? 'Save' : 'Update'}
                            </button>}
                      </td>
                    </tr>
                  );
                })}
                {prods.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>No products found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}


      {/* ── TAB: Seasonal Schemes ── */}
      {tab === 'Seasonal Schemes' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" className="btn-primary" onClick={() => setShowSchemeModal(true)}>+ Create Scheme</button>
          </div>

          {loadingSchemes && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>Loading schemes…</div>}

          {schemeList.map((s: any, i: number) => {
            const now = new Date();
            const from = s.valid_from ? new Date(s.valid_from) : null;
            const until = s.valid_until ? new Date(s.valid_until) : null;
            const status = !from ? 'Active' : now < from ? 'Upcoming' : until && now > until ? 'Expired' : 'Active';
            return (
              <div key={s.id ?? String(i)} className="card" style={{ marginBottom: 12 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">{s.product_name}</div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 13, marginTop: 6, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>🏷️ <strong style={{ color: '#059669' }}>{s.discount_pct}% off</strong></span>
                      {from && <span>📅 {from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {until?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) ?? 'ongoing'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
                    <button type="button" className="btn-danger" style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => removeSchemeMutation.mutate({ productId: s.product_id, pricingId: s.id })}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {!loadingSchemes && schemeList.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏷️</div>
              <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>No seasonal schemes yet. Click "+ Create Scheme" to add one.</div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: Custom Overrides ── */}
      {tab === 'Custom Overrides' && (
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">Per-Account Price Overrides</span>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>Set a fixed price for a specific business, overriding the standard rate.</div>
            </div>
            <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setShowOverrideModal(true)}>+ Add Override</button>
          </div>
          {loadingOverrides
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>Loading overrides…</div>
            : (
              <table className="data-table">
                <thead>
                  <tr><th>Business</th><th>Product</th><th>Override Price</th><th>Effective Discount</th><th>Min Qty</th><th>Set On</th><th></th></tr>
                </thead>
                <tbody>
                  {overrideList.map((o: any, oi: number) => {
                    const baseProd = prods.find(p => p.id === o.product_id);
                    const base = Number(baseProd?.base_price ?? baseProd?.price ?? 0);
                    return (
                      <tr key={o.id ?? String(oi)}>
                        <td style={{ fontWeight: 500 }}>{o.business_name || '—'}</td>
                        <td>{o.product_name}</td>
                        <td style={{ fontWeight: 700, color: '#059669' }}>{fmt(o.price_per_unit)}</td>
                        <td>{base > 0 ? <span className="badge badge-green">{disc(base, Number(o.price_per_unit))} off</span> : <span className="badge badge-stone">—</span>}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{o.min_quantity}+ bags</td>
                        <td style={{ fontSize: 12, color: 'var(--text-faint)' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                        <td>
                          <button type="button" className="btn-danger" style={{ padding: '4px 12px', fontSize: 12 }}
                            disabled={removeOverrideMutation.isPending}
                            onClick={() => removeOverrideMutation.mutate({ productId: o.product_id, pricingId: o.id })}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {overrideList.length === 0 && (
                    <tr key="empty"><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>No overrides yet. Add one using the button above.</td></tr>
                  )}
                </tbody>
              </table>
            )}
        </div>
      )}

      {/* ── Modal: Add Override ── */}
      {showOverrideModal && (
        <Modal
          title="Add Price Override"
          onClose={() => setShowOverrideModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowOverrideModal(false)}>Cancel</button>
              <button type="button" className="btn-primary"
                disabled={!overrideForm.businessId || !overrideForm.productId || !overrideForm.price || addOverrideMutation.isPending}
                onClick={() => addOverrideMutation.mutate()}>
                {addOverrideMutation.isPending ? 'Saving…' : 'Save Override'}
              </button>
            </>
          }
        >
          {addOverrideMutation.isError && <div className="field-error" style={{ marginBottom: 12 }}>Failed to save override. Please try again.</div>}
          <div className="field-group">
            <label className="field-label">Business / Account *</label>
            <select className="form-input" value={overrideForm.businessId} onChange={e => setOverrideForm(p => ({ ...p, businessId: e.target.value }))}>
              <option value="">Select business…</option>
              {bizList.map((b, bi) => <option key={b.id ?? String(bi)} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Product *</label>
            <select className="form-input" value={overrideForm.productId} onChange={e => setOverrideForm(p => ({ ...p, productId: e.target.value }))}>
              <option value="">Select product…</option>
              {prods.map((p, pi) => <option key={p.id ?? String(pi)} value={p.id}>{p.name} — base {p.base_price ? fmt(p.base_price) : '—'}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Override Price (₹/bag) *</label>
            <input className="form-input" type="number" min="0" value={overrideForm.price} onChange={e => setOverrideForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 655" />
            {overrideForm.productId && overrideForm.price && (() => {
              const base = Number(prods.find(p => p.id === overrideForm.productId)?.base_price ?? 0);
              const over = parseFloat(overrideForm.price);
              return base > 0 && over > 0
                ? <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>Effective discount: {disc(base, over)} off base price of {fmt(base)}</div>
                : null;
            })()}
          </div>
        </Modal>
      )}

      {/* ── Modal: Create Scheme ── */}
      {showSchemeModal && (
        <Modal
          title="Create Seasonal Scheme"
          onClose={() => setShowSchemeModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowSchemeModal(false)}>Cancel</button>
              <button type="button" className="btn-primary"
                disabled={!schemeForm.productId || !schemeForm.discountPct || addSchemeMutation.isPending}
                onClick={() => addSchemeMutation.mutate()}>
                {addSchemeMutation.isPending ? 'Saving…' : 'Create Scheme'}
              </button>
            </>
          }
        >
          <div className="field-group">
            <label className="field-label">Product *</label>
            <select className="form-input" value={schemeForm.productId} onChange={e => setSchemeForm(p => ({ ...p, productId: e.target.value }))}>
              <option value="">Select product…</option>
              {prods.map((p, pi) => <option key={p.id ?? String(pi)} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Discount % *</label>
            <input className="form-input" type="number" min="0" max="100" value={schemeForm.discountPct} onChange={e => setSchemeForm(p => ({ ...p, discountPct: e.target.value }))} placeholder="e.g. 5" />
          </div>
          <div className="grid-2">
            <div className="field-group">
              <label className="field-label">Valid From</label>
              <input className="form-input" type="date" value={schemeForm.validFrom} onChange={e => setSchemeForm(p => ({ ...p, validFrom: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Valid Until</label>
              <input className="form-input" type="date" value={schemeForm.validUntil} onChange={e => setSchemeForm(p => ({ ...p, validUntil: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
