'use client';

const FORECAST = [
  { product: 'Urea 46%',      aug: 920, sep: 1050, oct: 780,  trend: 'up',     note: 'Kharif demand peak in Sep',      stock: 840  },
  { product: 'DAP 18-46-0',  aug: 380, sep: 420,  oct: 650,  trend: 'up',     note: 'Rabi sowing begins Oct',         stock: 420  },
  { product: 'NPK 10-26-26', aug: 280, sep: 310,  oct: 290,  trend: 'stable', note: 'Steady vegetable demand',        stock: 310  },
  { product: 'MOP (Potash)', aug: 200, sep: 190,  oct: 310,  trend: 'up',     note: 'Cotton harvest boost Oct',       stock: 180  },
  { product: 'SSP 16%',      aug: 480, sep: 510,  oct: 580,  trend: 'up',     note: 'Oilseed season approaching',    stock: 650  },
  { product: 'NPK 19-19-19', aug: 90,  sep: 85,   oct: 95,   trend: 'stable', note: 'Consistent fertigation demand', stock: 95   },
];

const REORDERS = [
  { product: 'MOP (Potash)',  urgency: 'Immediate', note: 'Stock runs out before Sep peak. Order 300 bags now.',  cls: 'badge-red',   border: 'var(--red-500)' },
  { product: 'Urea 46%',     urgency: 'By Aug 5',  note: '840 bags meets Aug but falls short for Sep peak.',     cls: 'badge-amber', border: 'var(--amber-500)' },
  { product: 'NPK 19-19-19', urgency: 'By Aug 15', note: 'Only 95 bags left. Order minimum 200 bags.',           cls: 'badge-red',   border: 'var(--red-500)' },
  { product: 'DAP 18-46-0',  urgency: 'By Sep 1',  note: 'Rabi season spikes demand. Pre-book now.',             cls: 'badge-amber', border: 'var(--amber-500)' },
];

const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];
const BARS   = [55,60,72,90,85,100,110,108,95,88,70,60];

export default function ForecastPage() {
  return (
    <div className="animate-in">
      {/* Summary stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card red">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Critical Gaps</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: '#dc2626' }}>2</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Products below forecast</div>
        </div>
        <div className="stat-card amber">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Reorder Alerts</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: '#d97706' }}>4</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Action required</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Products Tracked</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>6</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>In forecast model</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Forecast Horizon</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>3M</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Aug – Oct 2025</div>
        </div>
      </div>

      {/* Main forecast table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <span className="card-title">Demand Forecast — Aug · Sep · Oct 2025</span>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>12-month moving avg + seasonal index. Values in bags.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>Recalculate</button>
            <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>⬇ Export</button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Product</th><th>Aug</th><th>Sep ↑</th><th>Oct</th><th>Trend</th><th>Current Stock</th><th>Gap / Surplus</th><th>Insight</th></tr>
          </thead>
          <tbody>
            {FORECAST.map(f => {
              const peak = Math.max(f.aug, f.sep, f.oct);
              const gap = f.stock - peak;
              return (
                <tr key={f.product}>
                  <td style={{ fontWeight: 500 }}>{f.product}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{f.aug}</td>
                  <td style={{ fontWeight: 700 }}>{f.sep}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{f.oct}</td>
                  <td>
                    {f.trend === 'up'
                      ? <span className="badge badge-green">▲ Rising</span>
                      : <span className="badge badge-stone">→ Stable</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{f.stock}</td>
                  <td>
                    <span className={`badge ${gap < 0 ? 'badge-red' : 'badge-green'}`}>
                      {gap >= 0 ? '+' : ''}{gap} bags
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }}>{f.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts + Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Seasonal Demand Pattern</span></div>
          <div className="card-body">
            <svg viewBox="0 0 340 140" width="100%" height={140}>
              {BARS.map((v, i) => {
                const x = 16 + i * 26, h = v * 1.1, y = 130 - h;
                const fill = i === 6 ? '#10b981' : (i >= 7 && i <= 9) ? '#f59e0b' : '#e7e5e4';
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={18} height={h} fill={fill} rx={3} opacity={i >= 7 && i <= 9 ? 0.8 : 1} />
                    <text x={x + 9} y={138} textAnchor="middle" style={{ fontSize: 8, fill: '#9ca3af' }}>{MONTHS[i]}</text>
                  </g>
                );
              })}
              <g>
                <rect x={220} y={10} width={10} height={10} fill="#f59e0b" rx={2} />
                <text x={234} y={19} style={{ fontSize: 9, fill: '#6b7280' }}>Forecast</text>
                <rect x={278} y={10} width={10} height={10} fill="#10b981" rx={2} />
                <text x={292} y={19} style={{ fontSize: 9, fill: '#6b7280' }}>Actual</text>
              </g>
            </svg>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', marginTop: 4 }}>Combined demand across all products (MT equivalent)</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Reorder Recommendations</span></div>
          <div className="card-body">
            {REORDERS.map(r => (
              <div key={r.product} style={{ borderLeft: `3px solid ${r.border}`, padding: '10px 14px', marginBottom: 10, background: 'var(--bg-subtle)', borderRadius: '0 8px 8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.product}</span>
                  <span className={`badge ${r.cls}`}>{r.urgency}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
