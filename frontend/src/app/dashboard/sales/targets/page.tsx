'use client';

const MONTHS = ['Nov','Dec','Jan','Feb','Mar','Apr','May'];
const MONTHLY = [
  { month:'Nov', target:1800000, achieved:1920000 },
  { month:'Dec', target:2200000, achieved:2050000 },
  { month:'Jan', target:2000000, achieved:2180000 },
  { month:'Feb', target:2100000, achieved:1980000 },
  { month:'Mar', target:2500000, achieved:2640000 },
  { month:'Apr', target:2300000, achieved:2210000 },
  { month:'May', target:2400000, achieved:980000,  partial: true },
];

const ACCOUNTS = [
  { name:'Kaveri Agro Traders',    mtd: 480000,  target: 600000 },
  { name:'Sri Balaji Fertilizers', mtd: 320000,  target: 400000 },
  { name:'Maruthi Traders',        mtd: 210000,  target: 250000 },
  { name:'Anand Agro Inputs',      mtd: 95000,   target: 200000 },
  { name:'Sai Krishi Kendra',      mtd: 175000,  target: 180000 },
];

const COMMISSIONS = [
  { quarter:'Q4 FY25 (Jan–Mar)', sales: 7800000, comm: 46800,  status:'Paid' },
  { quarter:'Q3 FY25 (Oct–Dec)', sales: 6250000, comm: 37500,  status:'Paid' },
  { quarter:'Q2 FY25 (Jul–Sep)', sales: 5100000, comm: 30600,  status:'Paid' },
  { quarter:'Q1 FY26 (Apr–Jun)', sales: 3190000, comm: 19140,  status:'Pending' },
];

const fmt = (n: number) => '₹' + (n >= 100000 ? (n/100000).toFixed(1)+'L' : n.toLocaleString('en-IN'));
const pct = (a: number, t: number) => Math.min(100, Math.round(a / t * 100));

const MTD_TARGET = 2400000;
const MTD_ACH    = 980000;
const YTD_TARGET = 15300000;
const YTD_ACH    = 13980000;
const maxBar = Math.max(...MONTHLY.map(m => m.target));

export default function SalesTargetsPage() {
  return (
    <div className="animate-in">
      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>MTD Achievement</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color:'var(--emerald-600)' }}>{pct(MTD_ACH, MTD_TARGET)}%</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{fmt(MTD_ACH)} of {fmt(MTD_TARGET)}</div>
          <div className="progress-bar" style={{ marginTop:10 }}>
            <div className="progress-fill green" style={{ width:`${pct(MTD_ACH, MTD_TARGET)}%` }}/>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>YTD Achievement</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color:'#2563eb' }}>{pct(YTD_ACH, YTD_TARGET)}%</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{fmt(YTD_ACH)} of {fmt(YTD_TARGET)}</div>
          <div className="progress-bar" style={{ marginTop:10 }}>
            <div className="progress-fill" style={{ width:`${pct(YTD_ACH, YTD_TARGET)}%`, background:'#2563eb' }}/>
          </div>
        </div>
        <div className="stat-card amber">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Gap to MTD Target</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color:'#d97706' }}>{fmt(MTD_TARGET - MTD_ACH)}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{MONTHLY.at(-1)?.month} target remaining</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Pending Commission</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color:'#7c3aed' }}>₹19,140</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>Q1 FY26 — awaiting</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Monthly trend bar chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Monthly Performance vs Target</span>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text-faint)' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:'var(--emerald-500)', display:'inline-block' }}/> Achieved</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:'#e5e7eb', display:'inline-block' }}/> Target</span>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:160 }}>
              {MONTHLY.map(m => {
                const tH = Math.round((m.target / maxBar) * 130);
                const aH = Math.round((m.achieved / maxBar) * 130);
                const hit = m.achieved >= m.target;
                return (
                  <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <div style={{ fontSize:10, fontWeight:600, color: hit ? 'var(--emerald-600)' : '#d97706' }}>
                      {m.partial ? `${pct(m.achieved, m.target)}%` : (hit ? '✓' : '!')}
                    </div>
                    <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:130 }}>
                      <div style={{ flex:1, borderRadius:'3px 3px 0 0', background:'#e5e7eb', height:tH }} />
                      <div style={{ flex:1, borderRadius:'3px 3px 0 0', background: m.partial ? '#f59e0b' : hit ? 'var(--emerald-500)' : '#f87171', height:aH }} />
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-faint)' }}>{m.month}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Account breakdown */}
        <div className="card">
          <div className="card-header"><span className="card-title">Account-wise MTD Progress</span></div>
          <div className="card-body">
            {ACCOUNTS.map(a => {
              const p = pct(a.mtd, a.target);
              return (
                <div key={a.name} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
                    <span style={{ fontWeight:500 }}>{a.name}</span>
                    <span style={{ color: p >= 80 ? 'var(--emerald-600)' : 'var(--text-muted)', fontWeight:600 }}>
                      {p}% <span style={{ fontWeight:400, color:'var(--text-faint)', fontSize:11 }}>({fmt(a.mtd)} / {fmt(a.target)})</span>
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${p >= 80 ? 'green' : p >= 50 ? 'amber' : 'red'}`} style={{ width:`${p}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Commission tracker */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Commission Tracker</span>
          <span className="badge badge-violet">Rate: 0.6% of collected sales</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Quarter</th><th>Total Sales</th><th>Commission Earned</th><th>Status</th></tr></thead>
          <tbody>
            {COMMISSIONS.map(c => (
              <tr key={c.quarter}>
                <td style={{ fontWeight:500 }}>{c.quarter}</td>
                <td style={{ fontWeight:600 }}>{fmt(c.sales)}</td>
                <td style={{ fontWeight:700, color:'var(--emerald-700)', fontFamily:'var(--font-head)', fontSize:15 }}>{fmt(c.comm)}</td>
                <td><span className={`badge ${c.status === 'Paid' ? 'badge-green' : 'badge-amber'}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
