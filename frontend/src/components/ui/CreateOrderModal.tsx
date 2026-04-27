'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Modal from '@/components/ui/Modal';

interface OrderItem { productId: string; quantity: number; productName: string; sku: string; unitPrice: number; manufacturer: string; }

export default function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user, primaryRole } = useAuthStore();
  const role = primaryRole();

  const [businessId, setBusinessId] = useState(user?.businessId || '');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(1);

  const { data: businesses } = useQuery({
    queryKey: ['businesses-list'],
    queryFn: async () => (await api.get('/finance/balances')).data.data,
    enabled: role !== 'retailer',
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: async () => (await api.get('/warehouse')).data.data,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await api.get('/products')).data.data,
  });

  const products: any[] = productsData || [];
  const warehouses: any[] = warehousesData || [];

  const createMutation = useMutation({
    mutationFn: async () => (await api.post('/orders', {
      businessId,
      warehouseId,
      items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      notes,
    })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); onClose(); },
  });

  const addItem = () => {
    const p = products.find((p: any) => p.id === selectedProduct);
    if (!p || !selectedProduct) return;
    if (items.find(i => i.productId === selectedProduct)) return;
    setItems([...items, { productId: p.id, quantity: qty, productName: p.name, sku: p.sku, unitPrice: p.base_price || 0, manufacturer: p.manufacturer || '' }]);
    setSelectedProduct('');
    setQty(1);
  };

  const removeItem = (productId: string) => setItems(items.filter(i => i.productId !== productId));

  const updateQty = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    setItems(items.map(i => i.productId === productId ? { ...i, quantity: newQty } : i));
  };

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <Modal
      title="New Order"
      onClose={onClose}
      size="md"
      footer={
        <>
          <span style={{ fontSize: 13, color: '#6b7280', marginRight: 'auto' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
            {total > 0 && <> · <strong style={{ color: '#059669' }}>₹{total.toLocaleString('en-IN')}</strong></>}
          </span>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => createMutation.mutate()}
            disabled={!businessId || !warehouseId || items.length === 0 || createMutation.isPending}>
            {createMutation.isPending ? 'Placing…' : 'Place Order'}
          </button>
        </>
      }>

      {/* Warehouse selector — required for inventory reservation on confirm */}
      <div className="field-group">
        <label className="field-label">Fulfilling Warehouse <span style={{ color: '#dc2626' }}>*</span></label>
        <select className="form-input" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
          <option value="">Select warehouse…</option>
          {warehouses.map((w: any) => (
            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
          ))}
        </select>
        <div className="field-hint">Required — inventory will be reserved from this warehouse when the order is confirmed.</div>
      </div>

      {/* Business selector (non-retailer only) */}
      {role !== 'retailer' && (
        <div className="field-group">
          <label className="field-label">Business / Retailer</label>
          <select className="form-input" value={businessId} onChange={e => setBusinessId(e.target.value)}>
            <option value="">Select business…</option>
            {(businesses || []).map((b: any) => (
              <option key={b.business_id} value={b.business_id}>{b.business_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Add item row */}
      <div className="field-group">
        <label className="field-label">Add Products</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-input" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select product…</option>
            {/* Group by manufacturer so same-named products from different companies are clearly separated */}
            {Object.entries(
              products.reduce((acc: Record<string, any[]>, p: any) => {
                const mfr = p.manufacturer || 'Generic';
                if (!acc[mfr]) acc[mfr] = [];
                acc[mfr].push(p);
                return acc;
              }, {})
            ).sort(([a], [b]) => a.localeCompare(b)).map(([mfr, mfrProducts]) => (
              <optgroup key={mfr} label={mfr}>
                {(mfrProducts as any[]).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <input type="number" className="form-input" value={qty} min={1}
            onChange={e => setQty(Number(e.target.value))} style={{ width: 80 }} placeholder="Qty" />
          <button className="btn-primary" onClick={addItem} disabled={!selectedProduct}>Add</button>
        </div>
      </div>

      {/* Order items table */}
      {items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.productId}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.productName}</div>
                    {item.manufacturer && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{item.manufacturer}</div>}
                  </td>
                  <td><code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{item.sku}</code></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                        style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <strong style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</strong>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                        style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
                    {item.unitPrice > 0 ? `₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td>
                    <button onClick={() => removeItem(item.productId)}
                      style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      <div className="field-group">
        <label className="field-label">Notes <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
        <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder="Special instructions…" style={{ resize: 'vertical' }} />
      </div>

      {createMutation.isError && (
        <div className="field-error">
          {(createMutation.error as any)?.response?.data?.error?.message || 'Failed to place order. Check stock availability.'}
        </div>
      )}
    </Modal>
  );
}
