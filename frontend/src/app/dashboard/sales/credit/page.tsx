'use client';

const SCORES = [
  { name: 'Kaveri Agro Traders',    score: 87, grade: 'A',  payHist: 95, orderFreq: 88, daysLate: 2,  creditUtil: 64, trend: 'stable' },
  { name: 'Sri Balaji Fertilizers', score: 79, grade: 'B+', payHist: 82, orderFreq: 72, daysLate: 5,  creditUtil: 60, trend: 'up'     },
  { name: 'Maruthi Traders',        score: 71, grade: 'B',  payHist: 78, orderFreq: 55, daysLate: 8,  creditUtil: 24, trend: 'stable' },
  { name: 'Anand Agro Inputs',      score: 52, grade: 'C',  payHist: 58, orderFreq: 75, daysLate: 18, creditUtil: 97, trend: 'down'   },
  { name: 'Nataraj Agro',           score: 44, grade: 'D',  payHist: 50, orderFreq: 20, daysLate: 25, creditUtil: 0,  trend: 'down'   },
];

function scoreColor(s: number) {
  return s >= 80 ? 'var(--emerald-600)' : s >= 65 ? 'var(--amber-600)' : s >= 50 ? '#c2410c' : 'var(--red-600)';
}
function gradeBadge(g: string): string {
  if (g.startsWith('A')) return 'badge-green';
  if (g.startsWith('B')) return 'badge-blue';
  if (g.startsWith('C')) return 'badge-amber';
  return 'badge-red';
}
function trendIcon(t: string) { return t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️'; }

export default function CreditScoresPage() {
  const avg = Math.round(SCORES.reduce((s, x) => s + x.score, 0) / SCORES.length);

  return (
    <div className="animate-in">
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Accounts Tracked</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800 }}>{SCORES.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Portfolio Avg Score</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color: scoreColor(avg) }}>{avg}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>Out of 100</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>High Risk (≤60)</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color:'var(--red-600)' }}>{SCORES.filter(s=>s.score<=60).length}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Healthy (≥75)</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color:'var(--emerald-600)' }}>{SCORES.filter(s=>s.score>=75).length}</div>
        </div>
      </div>

      <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
        Scores are auto-calculated from payment timeliness, order frequency, and credit utilisation. Updated daily.
      </div>

      {SCORES.map(s => {
        const r = 28;
        const circ = 2 * Math.PI * r;
        return (
          <div key={s.name} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display:'flex', gap:20, alignItems:'center', padding:'18px 20px' }}>
              {/* SVG ring */}
              <div style={{ textAlign:'center', flexShrink:0 }}>
                <svg viewBox="0 0 70 70" width={70} height={70}>
                  <circle cx={35} cy={35} r={r} fill="none" stroke="var(--border)" strokeWidth={6}/>
                  <circle cx={35} cy={35} r={r} fill="none"
                    stroke={scoreColor(s.score)} strokeWidth={6}
                    strokeDasharray={`${circ * s.score / 100} ${circ * (1 - s.score / 100)}`}
                    strokeDashoffset={circ * 0.25}
                    strokeLinecap="round"
                    style={{ transition:'stroke-dasharray 0.5s ease' }}
                  />
                  <text x={35} y={40} textAnchor="middle"
                    style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:800, fill:scoreColor(s.score) }}>
                    {s.score}
                  </text>
                </svg>
                <span className={`badge ${gradeBadge(s.grade)}`}>{s.grade}</span>
              </div>

              {/* KPIs */}
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, marginBottom:12 }}>{s.name}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[
                    ['Payment History', s.payHist + '%'],
                    ['Order Frequency', s.orderFreq + '%'],
                    ['Avg Days Late',   s.daysLate + ' days'],
                    ['Credit Util.',    s.creditUtil + '%'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{label}</div>
                      <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:16 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Mini progress bars */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 24px', marginTop:12 }}>
                  {[['Payment',s.payHist],['Orders',s.orderFreq]].map(([l,v])=>(
                    <div key={l as string}>
                      <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:4 }}>{l as string}</div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${Number(v)>=75?'green':Number(v)>=50?'amber':'red'}`} style={{ width:`${v}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trend + actions */}
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Trend</div>
                <div style={{ fontSize:24 }}>{trendIcon(s.trend)}</div>
                <div style={{ display:'flex', gap:6, marginTop:12, justifyContent:'flex-end' }}>
                  <button type="button" className="btn-secondary" style={{ fontSize:12, padding:'5px 12px' }}>History</button>
                  {s.score < 60 && <button type="button" className="btn-danger" style={{ fontSize:12, padding:'5px 12px' }}>Flag</button>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
