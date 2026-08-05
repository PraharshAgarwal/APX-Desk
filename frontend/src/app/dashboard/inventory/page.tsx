'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/ui/Modal';
import { Icons, IconX } from '@/components/ui/Icons';

const DD: React.CSSProperties = {
  padding: '7px 32px 7px 12px', borderRadius: 8, fontSize: 13,
  border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
  appearance: 'none' as any, outline: 'none', color: '#374151', fontWeight: 500,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
};

function expBadge(d: any) {
  if (d == null) return <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>;
  const c = d <= 7 ? 'badge-red' : d <= 30 ? 'badge-amber' : 'badge-green';
  return <span className={`badge ${c}`}>{d}d</span>;
}

export default function InventoryPage() {
  const [search, setSearch]   = useState('');
  const [brand, setBrand]     = useState('');
  const [wh, setWh]           = useState('');
  const [exp, setExp]         = useState('');
  const [sort, setSort]       = useState('name_asc');
  const [grouped, setGrouped] = useState(true);
  const [open, setOpen]       = useState<Set<string>>(new Set());
  const [adj, setAdj]         = useState<any>(null);

  const { data: bd, isLoading } = useQuery({ queryKey: ['inv'], queryFn: async () => (await api.get('/inventory/batches?limit=500')).data });
  const { data: sd } = useQuery({ queryKey: ['stock-summary'], queryFn: async () => (await api.get('/inventory/stock')).data });

  const all: any[] = bd?.data || [];
  const stock: any[] = sd?.data || [];
  const brands     = useMemo(() => [...new Set(all.map((b: any) => b.manufacturer).filter(Boolean))].sort() as string[], [all]);
  const warehouses = useMemo(() => [...new Set(all.map((b: any) => b.warehouse_name).filter(Boolean))].sort() as string[], [all]);

  const filtered = useMemo(() => all.filter((b: any) => {
    if (search && !b.product_name?.toLowerCase().includes(search.toLowerCase()) && !b.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    if (brand && b.manufacturer !== brand) return false;
    if (wh && b.warehouse_name !== wh) return false;
    if (exp === '7' && !(b.days_until_expiry != null && b.days_until_expiry <= 7)) return false;
    if (exp === '30' && !(b.days_until_expiry != null && b.days_until_expiry <= 30)) return false;
    if (exp === 'ok' && !(b.days_until_expiry == null || b.days_until_expiry > 30)) return false;
    return true;
  }), [all, search, brand, wh, exp]);

  const groups = useMemo(() => {
    const m: Record<string, any[]> = {};
    filtered.forEach((b: any) => { if (!m[b.product_id]) m[b.product_id] = []; m[b.product_id].push(b); });
    const raw = Object.entries(m).map(([pid, bs]) => ({
      pid, name: bs[0].product_name, sku: bs[0].sku, mfr: bs[0].manufacturer,
      avail: bs.reduce((s, b) => s + Number(b.available_qty || 0), 0),
      qty:   bs.reduce((s, b) => s + Number(b.quantity || 0), 0),
      rsv:   bs.reduce((s, b) => s + Number(b.reserved_qty || 0), 0),
      minD:  bs.reduce((mn, b) => b.days_until_expiry != null ? Math.min(mn, b.days_until_expiry) : mn, Infinity),
      batches: bs,
    }));
    return raw.sort((a, b) => {
      switch (sort) {
        case 'name_asc':   return a.name.localeCompare(b.name);
        case 'name_desc':  return b.name.localeCompare(a.name);
        case 'avail_desc': return b.avail - a.avail;
        case 'avail_asc':  return a.avail - b.avail;
        case 'exp_asc':    return (a.minD === Infinity ? 99999 : a.minD) - (b.minD === Infinity ? 99999 : b.minD);
        case 'exp_desc':   return (b.minD === Infinity ? 99999 : b.minD) - (a.minD === Infinity ? 99999 : a.minD);
        default: return 0;
      }
    });
  }, [filtered, sort]);

  const sortedFlat = useMemo(() => [...filtered].sort((a: any, b: any) => {
    switch (sort) {
      case 'name_asc':   return (a.product_name||'').localeCompare(b.product_name||'');
      case 'name_desc':  return (b.product_name||'').localeCompare(a.product_name||'');
      case 'avail_desc': return Number(b.available_qty||0) - Number(a.available_qty||0);
      case 'avail_asc':  return Number(a.available_qty||0) - Number(b.available_qty||0);
      case 'exp_asc':    return (a.days_until_expiry ?? 99999) - (b.days_until_expiry ?? 99999);
      case 'exp_desc':   return (b.days_until_expiry ?? 99999) - (a.days_until_expiry ?? 99999);
      default: return 0;
    }
  }), [filtered, sort]);

  const toggle = (pid: string) => setOpen(p => { const s = new Set(p); s.has(pid) ? s.delete(pid) : s.add(pid); return s; });
  const hasFilter = search || brand || wh || exp;

  const summaryCards = [
    { label: 'Products',    val: new Set(all.map((b:any)=>b.product_id)).size, color: '#2563eb', Icon: Icons.Package },
    { label: 'Batches',    val: all.length,                                                      color: '#7c3aed', Icon: Icons.Inventory },
    { label: 'Near Expiry',val: all.filter((b:any)=>b.days_until_expiry!=null&&b.days_until_expiry<=30).length, color: '#d97706', Icon: Icons.Clock },
    { label: 'Critical',   val: all.filter((b:any)=>b.days_until_expiry!=null&&b.days_until_expiry<=7).length,  color: '#dc2626', Icon: Icons.AlertTriangle },
  ];

  return (
    <div className="animate-in">
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', borderLeft: `4px solid ${c.color}` }}>
            <div style={{ marginBottom: 8 }}><c.Icon size={22} color={c.color} /></div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><Icons.Search size={14} color="#9ca3af" /></span>
          <input className="form-input" placeholder="Search product or SKU…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13, width: '100%' }} />
        </div>

        <div style={{ width: 1, height: 28, background: '#e5e7eb' }} />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Brand</span>
          <div style={{ position: 'relative' }}>
            <select value={brand} onChange={e => setBrand(e.target.value)} style={{ ...DD, minWidth: 140 }}>
              <option value="">All brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Warehouse */}
        {warehouses.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Warehouse</span>
            <select value={wh} onChange={e => setWh(e.target.value)} style={{ ...DD, minWidth: 150 }}>
              <option value="">All warehouses</option>
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        )}

        {/* Expiry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Expiry</span>
          <select value={exp} onChange={e => setExp(e.target.value)} style={{ ...DD, minWidth: 140 }}>
            <option value="">Any expiry</option>
            <option value="7">Critical (≤7d)</option>
            <option value="30">Soon (≤30d)</option>
            <option value="ok">Safe (&gt;30d)</option>
          </select>
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...DD, minWidth: 170 }}>
            <option value="name_asc">Name A → Z</option>
            <option value="name_desc">Name Z → A</option>
            <option value="avail_desc">Available (High → Low)</option>
            <option value="avail_asc">Available (Low → High)</option>
            <option value="exp_asc">Expiry (Soonest first)</option>
            <option value="exp_desc">Expiry (Latest first)</option>
          </select>
        </div>

        {/* Clear */}
        {hasFilter && (
          <button type="button" onClick={() => { setSearch(''); setBrand(''); setWh(''); setExp(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <IconX size={9} strokeWidth={2} /> Clear
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
          {[{ l: 'Grouped', v: true }, { l: 'Flat', v: false }].map(o => (
            <button type="button" key={String(o.v)} onClick={() => setGrouped(o.v)}
              style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: grouped === o.v ? '#fff' : 'transparent',
                color: grouped === o.v ? '#059669' : '#6b7280',
                boxShadow: grouped === o.v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>
            Inventory — FEFO Order
            <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>
              {filtered.length} batch{filtered.length !== 1 ? 'es' : ''} across {groups.length} product{groups.length !== 1 ? 's' : ''}
            </span>
          </div>
          {grouped && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setOpen(new Set(groups.map(g => g.pid)))}
                style={{ fontSize: 12, color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                Expand all
              </button>
              <button type="button" onClick={() => setOpen(new Set())}
                style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                Collapse all
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Icons.Clock size={36} color="#d1d5db" /></div>
            Loading batches…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Icons.Search size={36} color="#d1d5db" /></div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>No batches match these filters</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Adjust the dropdowns above to see results</div>
          </div>
        ) : grouped ? (
          <>
            {/* Grouped column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 120px 100px 100px 110px 80px', padding: '8px 20px', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
              {['Product', 'Available', 'Total Qty', 'Reserved', 'Expiry Status', 'Batches'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {groups.map(g => {
              const isOp = open.has(g.pid);
              const d    = g.minD === Infinity ? null : g.minD;
              const accent = d != null && d <= 7 ? '#ef4444' : d != null && d <= 30 ? '#f59e0b' : g.avail < 100 ? '#f59e0b' : '#10b981';
              return (
                <div key={g.pid}>
                  {/* Product summary row */}
                  <div onClick={() => toggle(g.pid)} style={{
                    display: 'grid', gridTemplateColumns: '2.5fr 120px 100px 100px 110px 80px',
                    alignItems: 'center', padding: '13px 20px', cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    borderLeft: `3px solid ${accent}`,
                    background: isOp ? '#f0fdf4' : '#fff',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => { if (!isOp) (e.currentTarget as HTMLDivElement).style.background = '#fafbfc'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isOp ? '#f0fdf4' : '#fff'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'inline-flex', transform: isOp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}><Icons.ChevronRight size={14} color="#9ca3af" /></span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1d23' }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'flex', gap: 8 }}>
                          <code style={{ background: '#f3f4f6', borderRadius: 4, padding: '1px 5px' }}>{g.sku}</code>
                          {g.mfr && <span>{g.mfr}</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: g.avail < 100 ? '#dc2626' : '#059669' }}>{g.avail.toFixed(0)}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>units</span>
                      {g.avail < 100 && <div style={{ marginTop: 2 }}><span style={{ fontSize: 10, background: '#fef2f2', color: '#dc2626', padding: '1px 5px', borderRadius: 8, border: '1px solid #fecaca', fontWeight: 700 }}>LOW</span></div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{g.qty.toFixed(0)}</div>
                    <div>{g.rsv > 0 ? <span className="badge badge-amber">{g.rsv.toFixed(0)}</span> : <span style={{ color: '#d1d5db' }}>—</span>}</div>
                    <div>
                      {d == null ? <span className="badge badge-stone">No expiry</span>
                        : d <= 7  ? <span className="badge badge-red">Critical · {d}d</span>
                        : d <= 30 ? <span className="badge badge-amber">Soon · {d}d</span>
                        :           <span className="badge badge-green">Safe</span>}
                    </div>
                    <div><span className="badge badge-stone">{g.batches.length}</span></div>
                  </div>

                  {/* Expanded batch rows */}
                  {isOp && (
                    <div style={{ background: '#f8fffe', borderBottom: '2px solid #d1fae5' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '40px 180px 1fr 110px 90px 110px 90px 90px', alignItems: 'center', padding: '6px 20px', background: '#ecfdf5', borderBottom: '1px solid #d1fae5' }}>
                        {['', 'Batch #', 'Warehouse · Bin', 'Available', 'Reserved', 'Expiry Date', 'Days Left', 'Action'].map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                        ))}
                      </div>
                      {g.batches.map((b: any, i: number) => (
                        <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '40px 180px 1fr 110px 90px 110px 90px 90px', alignItems: 'center', padding: '10px 20px', borderBottom: i < g.batches.length - 1 ? '1px solid #f0fdf4' : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f0fdf4'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</div>
                          <code style={{ fontSize: 12, color: '#1e40af', fontFamily: 'monospace', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>{b.batch_number}</code>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{b.warehouse_name}</div>
                            {b.bin_code && <div style={{ fontSize: 11, color: '#9ca3af' }}>Bin: {b.bin_code}</div>}
                          </div>
                          <div>
                            <strong style={{ color: Number(b.available_qty) <= 0 ? '#dc2626' : '#059669', fontSize: 14 }}>{Number(b.available_qty || 0).toFixed(0)}</strong>
                            <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>/ {Number(b.quantity).toFixed(0)}</span>
                          </div>
                          <div>{Number(b.reserved_qty) > 0 ? <span className="badge badge-amber">{Number(b.reserved_qty).toFixed(0)}</span> : <span style={{ color: '#d1d5db' }}>—</span>}</div>
                          <div style={{ fontSize: 12, color: '#374151' }}>{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-IN') : '—'}</div>
                          <div>{expBadge(b.days_until_expiry)}</div>
                          <div>
                            <button onClick={() => setAdj(b)}
                              style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}>
                              Adjust
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* Flat table */
          <table className="data-table">
            <thead><tr><th>Product</th><th>Brand</th><th>Batch #</th><th>Warehouse</th><th>Available</th><th>Reserved</th><th>Expiry</th><th>Days Left</th><th>Action</th></tr></thead>
            <tbody>
              {sortedFlat.map((b: any) => (
                <tr key={b.id}>
                  <td><strong>{b.product_name}</strong><div className="sub">{b.sku}</div></td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{b.manufacturer || '—'}</td>
                  <td><code style={{ fontSize: 12, color: '#1e40af', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>{b.batch_number}</code></td>
                  <td>{b.warehouse_name}<div className="sub">{b.bin_code}</div></td>
                  <td><strong>{Number(b.available_qty || 0).toFixed(0)}</strong><div className="sub">of {Number(b.quantity).toFixed(0)}</div></td>
                  <td>{Number(b.reserved_qty) > 0 ? <span className="badge badge-amber">{Number(b.reserved_qty).toFixed(0)}</span> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ fontSize: 12 }}>{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td>{expBadge(b.days_until_expiry)}</td>
                  <td><button type="button" onClick={() => setAdj(b)} style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Adjust</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adj && <StockAdjustModal batch={adj} onClose={() => setAdj(null)} />}
    </div>
  );
}

function StockAdjustModal({ batch, onClose }: { batch: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('correction');
  const [delta, setDelta]   = useState<number | ''>('');
  const [notes, setNotes]   = useState('');
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/inventory/adjust', { batchId: batch.id, reason, quantityDelta: Number(delta), notes })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
      toast.success('Stock adjustment saved');
      onClose();
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Adjustment failed');
    },
  });
  const total = Number(batch.quantity || 0), rsv = Number(batch.reserved_qty || 0);
  const preview = delta !== '' ? total + Number(delta) : null;
  const neg = preview !== null && preview < 0;
  return (
    <Modal title="Stock Adjustment" onClose={onClose} size="sm" footer={<>
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={() => mutation.mutate()} disabled={delta === '' || delta === 0 || neg || mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save'}
      </button>
    </>}>
      <div style={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{batch.product_name} <code style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>({batch.sku})</code></div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display: 'flex', gap: 16 }}>
          <span>Total: <strong style={{ color: '#1a1d23' }}>{total}</strong></span>
          {rsv > 0 && <span>Reserved: <strong style={{ color: '#d97706' }}>{rsv}</strong></span>}
          <span>Available: <strong style={{ color: total - rsv <= 0 ? '#dc2626' : '#059669' }}>{total - rsv}</strong></span>
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{batch.batch_number} · {batch.warehouse_name}</div>
      </div>
      <div className="field-group">
        <label className="field-label">Reason</label>
        <select className="form-input" value={reason} onChange={e => setReason(e.target.value)}>
          {['damage','expiry','return','transfer','correction','theft'].map(r => <option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}
        </select>
      </div>
      <div className="field-group">
        <label className="field-label">Quantity Change <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 11 }}>(−reduce · +add)</span></label>
        <input className="form-input" type="number" value={delta} placeholder="e.g. -5 or +10"
          onChange={e => { mutation.reset(); setDelta(e.target.value === '' ? '' : Number(e.target.value)); }} />
        {preview !== null && <div className={neg ? 'field-error' : 'field-hint'}>New total: <strong>{preview}</strong>{neg && ' — cannot go below zero'}</div>}
      </div>
      <div className="field-group">
        <label className="field-label">Notes</label>
        <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" style={{ resize: 'vertical' }} />
      </div>
      {mutation.isError && <div className="field-error">{(mutation.error as any)?.response?.data?.error?.details?.map((d:any)=>d.msg).join(', ') || (mutation.error as any)?.response?.data?.error?.message || 'Adjustment failed.'}</div>}
    </Modal>
  );
}
