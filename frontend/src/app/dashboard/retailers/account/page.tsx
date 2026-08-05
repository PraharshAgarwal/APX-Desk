'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const pct = (a: number, b: number) => b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0;

const PAYMENT_HISTORY = [
  { month: 'Jan', amount: 85000,  daysLate: 0,  onTime: true },
  { month: 'Feb', amount: 72000,  daysLate: 2,  onTime: true },
  { month: 'Mar', amount: 120000, daysLate: 0,  onTime: true },
  { month: 'Apr', amount: 95000,  daysLate: 5,  onTime: false },
  { month: 'May', amount: 48000,  daysLate: 0,  onTime: true },
];
const maxPay = Math.max(...PAYMENT_HISTORY.map(p => p.amount));

export default function AccountCreditPage() {
  const { user } = useAuthStore();

  const { data: balanceData } = useQuery({
    queryKey: ['my-balance', user?.businessId],
    queryFn: async () => (await api.get(`/finance/balance/${user?.businessId}`)).data?.data ?? null,
    enabled: !!user?.businessId,
  });

  const balance = balanceData || { current_balance: 48000, credit_limit: 200000 };
  const outstanding = Number(balance.current_balance || 0);
  const limit = Number(balance.credit_limit || 200000);
  const available = Math.max(0, limit - outstanding);
  const utilPct = pct(outstanding, limit);

  return (
    <div className="animate-in">
      {/* Credit utilisation card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Credit Limit</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800 }}>{fmt(limit)}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>Approved limit</div>
        </div>
        <div className={`stat-card ${utilPct > 80 ? 'red' : utilPct > 50 ? 'amber' : ''}`}>
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Outstanding</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color: utilPct > 80 ? 'var(--red-600)' : 'var(--text)' }}>{fmt(outstanding)}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{utilPct}% of limit used</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Available Credit</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800, color:'var(--emerald-600)' }}>{fmt(available)}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>Ready to use</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Utilisation breakdown */}
        <div className="card">
          <div className="card-header"><span className="card-title">Credit Utilisation</span></div>
          <div className="card-body">
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span>Outstanding / Limit</span>
                <span style={{ fontWeight: 700, color: utilPct > 80 ? 'var(--red-600)' : utilPct > 50 ? '#d97706' : 'var(--emerald-600)' }}>{utilPct}%</span>
              </div>
              <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                <div style={{ height: '100%', width: `${utilPct}%`, background: utilPct > 80 ? 'var(--red-500)' : utilPct > 50 ? 'var(--amber-500)' : 'var(--emerald-500)', borderRadius: 6, transition: 'width 0.5s ease' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                <span>₹0</span><span>{fmt(limit)}</span>
              </div>
            </div>
            {[['Outstanding Balance', fmt(outstanding), utilPct > 80 ? 'var(--red-600)' : 'var(--text)'],['Available Credit', fmt(available), 'var(--emerald-600)'],['Payment Terms','15 days credit','var(--text)'],['Next Due Date','May 19, 2025','var(--text)']].map(([l,v,c])=>(
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontWeight: 600, color: c as string }}>{v}</span>
              </div>
            ))}

            {/* Limit increase CTA */}
            <div style={{ marginTop: 20, background: 'var(--emerald-50)', border: '1px solid var(--emerald-100)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--emerald-800)', marginBottom: 4 }}>Need more credit?</div>
              <div style={{ fontSize: 12, color: 'var(--emerald-700)', marginBottom: 10 }}>You can request a credit limit increase. Your rep will review within 2 business days.</div>
              <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>Request Limit Increase</button>
            </div>
          </div>
        </div>

        {/* Payment history */}
        <div className="card">
          <div className="card-header"><span className="card-title">Payment History (Last 5 Months)</span></div>
          <div className="card-body">
            {/* Bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130, marginBottom: 16 }}>
              {PAYMENT_HISTORY.map(p => (
                <div key={p.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: p.onTime ? 'var(--emerald-600)' : '#d97706' }}>{p.onTime ? '✓' : `+${p.daysLate}d`}</div>
                  <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: p.onTime ? 'var(--emerald-500)' : 'var(--amber-500)', height: Math.round((p.amount / maxPay) * 100) }}/>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.month}</div>
                </div>
              ))}
            </div>
            {/* History rows */}
            {PAYMENT_HISTORY.slice().reverse().map(p => (
              <div key={p.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{p.month} 2025</span>
                <span style={{ fontWeight: 500 }}>{fmt(p.amount)}</span>
                <span className={`badge ${p.onTime ? 'badge-green' : 'badge-amber'}`}>{p.onTime ? 'On Time' : `${p.daysLate} days late`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
