'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Icons } from '@/components/ui/Icons';

const STEPS = ['Order Placed', 'Confirmed', 'Packed', 'Dispatched', 'Delivered'];
const STATUS_TO_STEP: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 2, dispatched: 3, delivered: 4,
};
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
const fmtDate = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function TrackShipmentPage() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['track', searched],
    queryFn: async () => {
      const res = await api.get(`/orders?search=${encodeURIComponent(searched)}&limit=5`);
      const list: any[] = res.data?.data ?? [];
      if (!list.length) throw new Error('not found');
      const order = list.find(o => o.order_number.toLowerCase() === searched.toLowerCase()) || list[0];
      const detail = await api.get(`/orders/${order.id}`);
      return { order, detail: detail.data?.data };
    },
    enabled: !!searched,
    retry: false,
  });

  const order = data?.order;
  const detail = data?.detail;
  const stepIdx = order ? (STATUS_TO_STEP[order.status] ?? 0) : -1;
  const history: any[] = detail?.statusHistory || [];
  const items: any[] = detail?.items || [];
  const dispatch = detail?.dispatches?.[0] ?? null;

  const doSearch = () => { if (query.trim()) setSearched(query.trim()); };

  return (
    <div className="animate-in">
      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Track Your Shipment</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="form-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Enter Order Number — e.g. ORD-2025-0001"
              style={{ maxWidth: 360 }}
            />
            <button type="button" className="btn-primary" onClick={doSearch}>Track →</button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 56, color: 'var(--text-faint)' }}>Fetching shipment details…</div>
      )}
      {isError && searched && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: '#9ca3af' }}>
            <Icons.Search size={40} />
          </div>
          <div className="card-title" style={{ marginBottom: 6 }}>Order not found</div>
          <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>Check the order number and try again.</div>
        </div>
      )}

      {order && (
        <>
          {/* Dark hero card */}
          <div style={{
            background: 'linear-gradient(135deg, #1c1917, #1a3a2a)',
            borderRadius: 14, padding: 24, color: '#fff', marginBottom: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize: 24, fontWeight: 800 }}>{order.order_number}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                  {order.business_name} · {new Date(order.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                </div>
              </div>
              <span className="badge badge-blue" style={{ textTransform: 'capitalize', fontSize: 12 }}>{order.status}</span>
            </div>
            {dispatch && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, fontSize:13 }}>
                {[['VEHICLE', dispatch.vehicle_number || '—'],['DRIVER', `${dispatch.driver_name || '—'}${dispatch.driver_phone ? ' · ' + dispatch.driver_phone : ''}`],['DISPATCH #', dispatch.dispatch_number]].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, letterSpacing:'0.08em', marginBottom:4 }}>{l}</div>
                    <div style={{ fontWeight:600 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status stepper */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Delivery Progress</span></div>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center' }}>
                {STEPS.map((step, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:700, border:'2px solid',
                        background: i < stepIdx ? 'var(--emerald-600)' : i === stepIdx ? 'var(--blue-600)' : '#fff',
                        borderColor: i < stepIdx ? 'var(--emerald-600)' : i === stepIdx ? 'var(--blue-600)' : 'var(--border)',
                        color: i <= stepIdx ? '#fff' : 'var(--text-faint)',
                      }}>
                        {i < stepIdx ? '✓' : i === stepIdx ? '●' : i + 1}
                      </div>
                      <div style={{ fontSize:11, marginTop:6, textAlign:'center', whiteSpace:'nowrap', color: i <= stepIdx ? 'var(--text)' : 'var(--text-faint)', fontWeight: i === stepIdx ? 600 : 400 }}>
                        {step}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ flex:1, height:2, background: i < stepIdx ? 'var(--emerald-500)' : 'var(--border)', margin:'0 6px', marginBottom:20 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Timeline */}
            <div className="card">
              <div className="card-header"><span className="card-title">Activity Timeline</span></div>
              <div className="card-body">
                {history.length === 0
                  ? <div style={{ fontSize:13, color:'var(--text-faint)' }}>No history available.</div>
                  : (
                    <div style={{ position:'relative', paddingLeft:20 }}>
                      <div style={{ position:'absolute', left:6, top:6, bottom:6, width:1, background:'var(--border)' }}/>
                      {history.map((h:any, i:number) => (
                        <div key={i} style={{ position:'relative', marginBottom:16 }}>
                          <div style={{ position:'absolute', left:-17, top:4, width:11, height:11, borderRadius:'50%', background: h.to_status==='delivered'?'var(--emerald-600)':h.to_status==='dispatched'?'var(--blue-500)':h.to_status==='cancelled'?'var(--red-500)':'var(--emerald-500)', border:'2px solid #fff' }}/>
                          <div style={{ fontSize:11, color:'var(--text-faint)' }}>{fmtDate(h.changed_at)}</div>
                          <div style={{ fontSize:13, fontWeight:500, textTransform:'capitalize', marginTop:2 }}>
                            {h.to_status}
                            {h.from_status && <span style={{ fontWeight:400, color:'var(--text-faint)', marginLeft:6 }}>← {h.from_status}</span>}
                          </div>
                          {h.changed_by_name && <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:1 }}>by {h.changed_by_name}</div>}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Items */}
            <div className="card">
              <div className="card-header"><span className="card-title">Items in Shipment</span></div>
              <div className="card-body">
                {items.map((item:any, i:number) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom: i < items.length-1 ? '1px solid var(--border)' : 'none', fontSize:13, alignItems:'center' }}>
                    <span style={{ fontWeight:500, display:'inline-flex', alignItems:'center', gap: 6 }}>
                      <Icons.Package size={13} color="#6b7280" />
                      {item.product_name}
                    </span>
                    <span className="badge badge-stone">{item.quantity} bags</span>
                    <span style={{ fontWeight:600, color:'var(--emerald-700)' }}>{fmt(Number(item.unit_price)*item.quantity)}</span>
                  </div>
                ))}
                {items.length === 0 && <div style={{ fontSize:13, color:'var(--text-faint)' }}>No items loaded.</div>}
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:14, fontWeight:700, fontSize:14, borderTop:'1px solid var(--border)' }}>
                  <span>Total</span>
                  <span style={{ color:'var(--emerald-700)' }}>{fmt(Number(order.total_amount))}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
