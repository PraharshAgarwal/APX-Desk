'use client';
import { useState } from 'react';

const WA_ORDERS = [
  { from:'Kaveri Agro Traders',        phone:'+91 94450 12345', msg:'order 50 bags urea 46',           time:'10:42 AM',  status:'Converted',      orderId:'ORD-2025-1043' },
  { from:'Maruthi Traders',            phone:'+91 99001 23456', msg:'need 30 bags dap and 20 bags npk', time:'9:18 AM',   status:'Draft Created',  orderId:'ORD-2025-1044' },
  { from:'Unknown (+91 98765 11111)',  phone:'+91 98765 11111', msg:'price of urea today',              time:'8:55 AM',   status:'Replied',        orderId:null },
  { from:'Sri Balaji Fertilizers',     phone:'+91 98765 43210', msg:'cancel order 1041',                time:'Yesterday', status:'Escalated',      orderId:'ORD-2025-1041' },
  { from:'Lakshmi Agro',              phone:'+91 96780 34567', msg:'hi sir please send 80 bags ssp',   time:'Yesterday', status:'Pending',        orderId:null },
];

const BOT_SETTINGS = [
  'Auto-parse product names',
  'Create draft orders automatically',
  'Send price replies',
  'Unknown number — ask for business ID',
  'Escalate cancellations to admin',
];

const WA_STATS = [
  ['Messages Received','34'],
  ['Orders Converted','18 (53%)'],
  ['Price Queries','8'],
  ['Escalations','4'],
  ['Avg Response Time','< 2 min'],
];

const STATUS_BADGE: Record<string,string> = {
  Pending: 'badge-amber', Converted: 'badge-green',
  'Draft Created': 'badge-blue', Escalated: 'badge-red', Replied: 'badge-stone',
};
const STATUS_BORDER: Record<string,string> = {
  Pending: 'var(--amber-500)', Converted: 'var(--emerald-500)',
  'Draft Created': 'var(--blue-500)', Escalated: 'var(--red-500)', Replied: 'var(--border)',
};

export default function WhatsAppOrdersPage() {
  const [botEnabled, setBotEnabled] = useState<Record<string,boolean>>(
    Object.fromEntries(BOT_SETTINGS.map(s => [s, true]))
  );

  return (
    <div className="animate-in" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap: 20, alignItems:'start' }}>
      {/* ── Left: messages ── */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700 }}>Incoming WhatsApp Messages</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>Configure Bot</button>
            <span className="badge badge-green">● Bot Active</span>
          </div>
        </div>

        {WA_ORDERS.map((w, i) => (
          <div key={i} className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${STATUS_BORDER[w.status]}` }}>
            <div className="card-header">
              <div>
                <span style={{ fontWeight:600, fontSize:13 }}>{w.from}</span>
                <span style={{ fontSize:11, color:'var(--text-faint)', marginLeft:8 }}>{w.phone}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text-faint)' }}>{w.time}</span>
                <span className={`badge ${STATUS_BADGE[w.status]}`}>{w.status}</span>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 12 }}>
              <div style={{ background:'var(--bg-subtle)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--text-muted)', fontStyle:'italic', marginBottom:12 }}>
                "{w.msg}"
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {w.status === 'Pending' && <>
                  <button type="button" className="btn-primary" style={{ fontSize:12, padding:'6px 14px' }}>Convert to Order</button>
                  <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>Reply</button>
                </>}
                {w.status === 'Draft Created' && <button type="button" className="btn-primary" style={{ fontSize:12, padding:'6px 14px' }}>Review Draft {w.orderId}</button>}
                {w.status === 'Converted' && <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>{w.orderId} →</button>}
                {w.status === 'Escalated' && <button type="button" className="btn-danger" style={{ fontSize:12, padding:'6px 14px' }}>Handle Cancellation</button>}
                {w.status === 'Replied' && <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>View Thread</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Right: config + stats ── */}
      <div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><span className="card-title">Bot Configuration</span></div>
          <div className="card-body">
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
              Auto-parses messages, matches product names, and creates draft orders.
            </div>
            {BOT_SETTINGS.map(setting => (
              <div key={setting} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:13 }}>{setting}</span>
                <div
                  role="switch" aria-checked={botEnabled[setting]}
                  onClick={() => setBotEnabled(p => ({ ...p, [setting]: !p[setting] }))}
                  style={{
                    width: 38, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative',
                    background: botEnabled[setting] ? 'var(--emerald-600)' : '#d1d5db',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'#fff',
                    left: botEnabled[setting] ? 19 : 3, transition:'left 0.2s', boxShadow:'0 1px 2px rgba(0,0,0,0.15)',
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">WhatsApp Stats (MTD)</span></div>
          <div className="card-body">
            {WA_STATS.map(([label, val]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight:600 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
