'use client';
import { useState } from 'react';

const SCHEMES = [
  {
    id: 1, name: 'Kharif Season Boost', tag: 'Seasonal', status: 'Active',
    products: 'Urea 46%, DAP 18-46-0, NPK Complex',
    benefit: '3% extra discount on orders of 100+ bags',
    window: 'Jun 1 – Sep 30, 2025',
    eligibility: 'All registered retailers',
    sharedWith: 12, enrolled: 8,
    color: '#059669',
  },
  {
    id: 2, name: 'Rabi Pre-buy Offer', tag: 'Pre-Season', status: 'Upcoming',
    products: 'DAP 18-46-0, SSP 16%, Potash',
    benefit: '2% pre-booking discount + priority allocation',
    window: 'Oct 1 – Nov 30, 2025',
    eligibility: 'Silver Dealer and above',
    sharedWith: 0, enrolled: 0,
    color: '#2563eb',
  },
  {
    id: 3, name: 'Loyalty Bonus — Gold Tier', tag: 'Loyalty', status: 'Active',
    products: 'All products',
    benefit: '₹500 credit note for every ₹1L ordered in a month',
    window: 'Ongoing — FY 2025-26',
    eligibility: 'Gold Distributor tier only',
    sharedWith: 5, enrolled: 4,
    color: '#f59e0b',
  },
  {
    id: 4, name: 'New Retailer Welcome Pack', tag: 'Onboarding', status: 'Active',
    products: 'Any 3 products',
    benefit: '5% off on first 3 orders (up to ₹500 each)',
    window: 'Year-round',
    eligibility: 'Newly onboarded retailers (0–90 days)',
    sharedWith: 3, enrolled: 2,
    color: '#7c3aed',
  },
  {
    id: 5, name: 'Year-End Clearance', tag: 'Clearance', status: 'Upcoming',
    products: 'Near-expiry & overstock lots',
    benefit: '10–15% clearance discount',
    window: 'Mar 1 – Mar 31, 2026',
    eligibility: 'All accounts',
    sharedWith: 0, enrolled: 0,
    color: '#dc2626',
  },
];

const STATUS_BADGE: Record<string,string> = { Active:'badge-green', Upcoming:'badge-amber', Expired:'badge-red' };

export default function SalesSchemesPage() {
  const [sharing, setSharing] = useState<number|null>(null);

  return (
    <div className="animate-in">
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Schemes',  val: SCHEMES.length,                               sub:'In portfolio' },
          { label:'Active Now',     val: SCHEMES.filter(s=>s.status==='Active').length,  sub:'Running this month', cls:'green' },
          { label:'Upcoming',       val: SCHEMES.filter(s=>s.status==='Upcoming').length, sub:'Starting soon',     cls:'amber' },
          { label:'Retailers Shared', val: SCHEMES.reduce((a,s)=>a+s.sharedWith,0),    sub:'Via WhatsApp / Email' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800 }}>{s.val}</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Scheme cards */}
      {SCHEMES.map(s => (
        <div key={s.id} className="card" style={{ marginBottom:14, borderLeft:`4px solid ${s.color}` }}>
          <div className="card-header">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span className="card-title">{s.name}</span>
                <span className="badge badge-stone">{s.tag}</span>
                <span className={`badge ${STATUS_BADGE[s.status]}`}>{s.status}</span>
              </div>
              <div style={{ fontSize:12, color:'var(--text-faint)' }}>📅 {s.window}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {s.status === 'Active' && (
                <>
                  <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}
                    onClick={()=>setSharing(sharing===s.id?null:s.id)}>
                    💬 Share via WhatsApp
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>
                    📧 Share via Email
                  </button>
                </>
              )}
              <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>Edit</button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Products</div>
                <div style={{ fontSize:13 }}>📦 {s.products}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Benefit</div>
                <div style={{ fontSize:13, fontWeight:600, color:s.color }}>🏷️ {s.benefit}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Eligibility</div>
                <div style={{ fontSize:13 }}>👤 {s.eligibility}</div>
              </div>
            </div>

            {/* Engagement metrics */}
            {s.status === 'Active' && (
              <div style={{ display:'flex', gap:24, marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                <div style={{ fontSize:13 }}>
                  <span style={{ color:'var(--text-muted)' }}>Shared with </span>
                  <strong>{s.sharedWith} retailers</strong>
                </div>
                <div style={{ fontSize:13 }}>
                  <span style={{ color:'var(--text-muted)' }}>Enrolled: </span>
                  <strong style={{ color:'var(--emerald-600)' }}>{s.enrolled}</strong>
                </div>
                <div style={{ fontSize:13 }}>
                  <span style={{ color:'var(--text-muted)' }}>Conversion: </span>
                  <strong>{s.sharedWith ? Math.round(s.enrolled/s.sharedWith*100) : 0}%</strong>
                </div>
              </div>
            )}

            {/* WhatsApp message preview */}
            {sharing === s.id && (
              <div style={{ marginTop:14, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--emerald-700)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>WhatsApp Message Preview</div>
                <div style={{ fontSize:13, color:'#166534', fontFamily:'monospace', lineHeight:1.6 }}>
                  🌿 *{s.name}*{'\n'}<br/>
                  📦 Products: {s.products}{'\n'}<br/>
                  🏷️ Offer: {s.benefit}{'\n'}<br/>
                  📅 Valid: {s.window}{'\n'}<br/>
                  👤 For: {s.eligibility}{'\n'}<br/><br/>
                  Reply *ORDER* to place now. — AgroLink Team
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <button type="button" className="btn-primary" style={{ fontSize:12, padding:'6px 16px' }}>Send to All Eligible Retailers</button>
                  <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }} onClick={()=>setSharing(null)}>Close Preview</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
