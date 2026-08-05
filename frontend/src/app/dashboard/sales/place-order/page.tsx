'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface CartItem { productId: string; name: string; sku: string; category: string; manufacturer: string; price: number; unit: string; qty: number; }

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const GST = 0.05;

export default function PlaceOrderPage() {
  const qc = useQueryClient();
  const { user, primaryRole } = useAuthStore();
  const isRetailer = primaryRole() === 'retailer';

  const [bizId, setBizId] = useState(isRetailer ? (user?.businessId || '') : '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState('');

  const { data: prodsData, isLoading } = useQuery({
    queryKey: ['products-catalog'],
    queryFn: async () => (await api.get('/products?limit=200')).data?.data ?? [],
  });
  const { data: bizsData = [] } = useQuery({
    queryKey: ['businesses-order'],
    queryFn: async () => (await api.get('/businesses')).data?.data ?? [],
    enabled: !isRetailer,
  });

  const prods: any[] = prodsData ?? [];
  const bizs: any[] = bizsData as any[];
  const cats = [...new Set(prods.map((p: any) => p.category).filter(Boolean))];
  const brands = [...new Set(prods.map((p: any) => p.manufacturer).filter(Boolean))].sort();

  const filtered = prods.filter((p: any) => {
    const q = search.toLowerCase();
    return (!q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      && (!catFilter || p.category === catFilter)
      && (!brandFilter || p.manufacturer === brandFilter);
  });

  // Group filtered products by brand
  const byBrand: Record<string, any[]> = {};
  filtered.forEach((p: any) => {
    const brand = p.manufacturer || 'Other / Generic';
    if (!byBrand[brand]) byBrand[brand] = [];
    byBrand[brand].push(p);
  });
  const brandGroups = Object.entries(byBrand).sort(([a], [b]) => a.localeCompare(b));

  const getQty = (id: string) => qtys[id] ?? 1;
  const setQty = (id: string, v: number) => setQtys(p => ({ ...p, [id]: Math.max(1, v) }));
  const inCart = (id: string) => cart.some(c => c.productId === id);

  const addToCart = (p: any) => {
    const qty = getQty(p.id);
    setCart(prev => {
      const ex = prev.find(c => c.productId === p.id);
      if (ex) return prev.map(c => c.productId === p.id ? { ...c, qty: c.qty + qty } : c);
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, category: p.category || '', manufacturer: p.manufacturer || '', price: Number(p.base_price || p.price || 0), unit: p.unit || '/bag', qty }];
    });
  };

  const remove = (id: string) => setCart(prev => prev.filter(c => c.productId !== id));
  const clear = () => setCart([]);
  const cartQty = (id: string, v: number) => { if (v < 1) { remove(id); return; } setCart(prev => prev.map(c => c.productId === id ? { ...c, qty: v } : c)); };

  const sub = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const gst = Math.round(sub * GST);
  const total = sub + gst;

  const mutation = useMutation({
    mutationFn: () => api.post('/orders', { business_id: bizId, items: cart.map(c => ({ product_id: c.productId, quantity: c.qty })), notes }),
    onSuccess: (res) => {
      setDone(res.data?.data?.order_number || 'new order');
      clear(); setNotes('');
      if (!isRetailer) setBizId('');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (done) return (
    <div className="animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Order Placed!</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
          Order <strong style={{ color: '#059669' }}>{done}</strong> submitted and pending confirmation.
        </div>
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setDone('')}>Place Another Order</button>
      </div>
    </div>
  );

  return (
    <div className="animate-in">
      {/* Business selector for non-retailers */}
      {!isRetailer && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Ordering for:</span>
          <select className="form-input" value={bizId} onChange={e => setBizId(e.target.value)} style={{ maxWidth: 300 }}>
            <option value="">Select retailer / business…</option>
            {bizs.map((b: any, i: number) => <option key={b.id ?? String(i)} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
          </select>
          {!bizId && <span style={{ fontSize: 12, color: 'var(--amber-600)', fontWeight: 500 }}>⚠ Select a business first</span>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: Catalog ── */}
        <div>
          {/* Search + filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" style={{ flex: 1, minWidth: 180 }} />
            <select className="form-input" value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ width: 180 }}>
              <option value="">All brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="form-input" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 160 }}>
              <option value="">All categories</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>Loading products…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>No products found.</div>
          ) : (
            <div>
              {brandGroups.map(([brand, bProds]) => (
                <div key={brand} style={{ marginBottom: 28 }}>
                  {/* Brand header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, #1a1d23, #374151)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0,
                    }}>{brand.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 15, color: '#1a1d23' }}>{brand}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{bProds.length} product{bProds.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
                  </div>

                  {/* Products grid for this brand */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                    {bProds.map((p: any) => {
                const added = inCart(p.id);
                const stock = Number(p.available_qty ?? p.stock ?? 999);
                const lowStock = stock > 0 && stock < 100;
                const outOfStock = stock === 0;
                return (
                  <div key={p.id} style={{
                    background: '#fff',
                    border: `1.5px solid ${added ? '#10b981' : outOfStock ? '#fca5a5' : 'var(--border)'}`,
                    borderRadius: 12, padding: 15,
                    boxShadow: added ? '0 0 0 3px #d1fae5' : '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: 9,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    opacity: outOfStock ? 0.65 : 1,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--emerald-50)', color: 'var(--emerald-700)', padding: '2px 7px', borderRadius: 10 }}>
                        {p.category || 'General'}
                      </span>
                      {added && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>✓ In cart</span>}
                    </div>

                    <div>
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                      {p.manufacturer && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{p.manufacturer}</div>}
                    </div>

                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 19, fontWeight: 800, color: '#059669' }}>
                      {fmt(Number(p.base_price || p.price || 0))}
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{p.unit || '/bag'}</span>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      SKU: <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>{p.sku}</code>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 600, color: outOfStock ? '#dc2626' : lowStock ? '#d97706' : '#059669' }}>
                      {outOfStock ? '✗ Out of stock' : lowStock ? `⚠️ Low · ${stock} bags` : `✓ In stock · ${stock} bags`}
                    </div>

                    {/* Qty controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setQty(p.id, getQty(p.id) - 1)} disabled={outOfStock}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <input type="number" min={1} value={getQty(p.id)} disabled={outOfStock}
                        onChange={e => setQty(p.id, parseInt(e.target.value) || 1)}
                        style={{ width: 50, textAlign: 'center', padding: '5px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
                      <button onClick={() => setQty(p.id, getQty(p.id) + 1)} disabled={outOfStock}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', flex: 1, textAlign: 'right' }}>bags</span>
                    </div>

                    <button onClick={() => addToCart(p)} disabled={outOfStock}
                      style={{
                        width: '100%', padding: '8px 0', borderRadius: 8, cursor: outOfStock ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: 13, border: 'none',
                        background: outOfStock ? '#e5e7eb' : added ? '#10b981' : '#059669',
                        color: outOfStock ? '#9ca3af' : '#fff',
                        transition: 'background 0.15s',
                      }}>
                      {outOfStock ? 'Out of Stock' : added ? '✓ Add More' : 'Add to Cart'}
                    </button>
                  </div>
                );
              })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Cart ── */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                🛒 Cart
                {cart.length > 0 && (
                  <span style={{ background: '#059669', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>{cart.length}</span>
                )}
              </span>
              {cart.length > 0 && (
                <button onClick={clear} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear all</button>
              )}
            </div>

            <div className="card-body">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-faint)', fontSize: 13 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                  Cart is empty.<br />Add products to get started.
                </div>
              ) : (
                <>
                  {/* Cart items */}
                  {cart.map((item, idx) => (
                    <div key={item.productId} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '10px 0', borderBottom: idx < cart.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{fmt(item.price)} / bag</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                          <button onClick={() => cartQty(item.productId, item.qty - 1)}
                            style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)', background: '#f9fafb', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={e => cartQty(item.productId, parseInt(e.target.value) || 1)}
                            style={{ width: 52, textAlign: 'center', padding: '3px 6px', border: '1.5px solid var(--emerald-200)', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#1a1d23', outline: 'none', background: '#f0fdf4' }}
                          />
                          <button onClick={() => cartQty(item.productId, item.qty + 1)}
                            style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)', background: '#f9fafb', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>bags</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#059669' }}>{fmt(item.price * item.qty)}</div>
                        <button onClick={() => remove(item.productId)}
                          style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0, fontWeight: 600 }}>Remove</button>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                    {[['Subtotal', fmt(sub)], ['GST (5%)', fmt(gst)]].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, color: 'var(--text-muted)' }}>
                        <span>{l}</span><span style={{ color: 'var(--text)' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, fontFamily: 'var(--font-head)', color: '#059669', marginTop: 6 }}>
                      <span>Total</span><span>{fmt(total)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label">Notes (optional)</label>
                    <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Delivery instructions…" style={{ resize: 'vertical' }} />
                  </div>

                  {/* Place order */}
                  <button className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 12, opacity: (bizId && cart.length > 0) ? 1 : 0.55 }}
                    disabled={!bizId || cart.length === 0 || mutation.isPending}
                    onClick={() => mutation.mutate()}>
                    {mutation.isPending ? 'Placing…' : `Place Order · ${fmt(total)}`}
                  </button>

                  {!bizId && !isRetailer && <div className="field-error" style={{ marginTop: 8 }}>Select a business above.</div>}
                  {mutation.isError && (
                    <div className="field-error" style={{ marginTop: 8 }}>
                      {(mutation.error as any)?.response?.data?.error?.message || 'Failed to place order.'}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
