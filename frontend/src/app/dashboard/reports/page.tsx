'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { IconDownload } from '@/components/ui/Icons';
import DatePicker from '@/components/ui/DatePicker';

type RptKey = 'dues'|'payments'|'expiry'|'sales'|'health';
type Period  = '7'|'30'|'90'|'365';

const RPTS: {key:RptKey;label:string;desc:string;tag:string;color:string}[] = [
  {key:'dues',     label:'Outstanding Dues (Aging)',   desc:'Who owes what — bucketed 0-30 / 31-60 / 60+ days', tag:'Finance',   color:'#dc2626'},
  {key:'payments', label:'Payment Collections',        desc:'Receipts in period by retailer & method',           tag:'Finance',   color:'#059669'},
  {key:'expiry',   label:'Expiry Risk Report',         desc:'Batches expiring soon with ₹ value at risk',        tag:'Inventory', color:'#f59e0b'},
  {key:'sales',    label:'Sales Register',             desc:'All orders in period with status & revenue',        tag:'Sales',     color:'#7c3aed'},
  {key:'health',   label:'Retailer Health Check',      desc:'Credit utilisation, overdue flags, risk scores',    tag:'Retailers', color:'#2563eb'},
];
const PERIODS: {key:Period;label:string}[] = [
  {key:'7',label:'Last 7 days'},{key:'30',label:'Last 30 days'},
  {key:'90',label:'Last 90 days'},{key:'365',label:'This year'},
];
const TAG_C: Record<string,string> = {Finance:'#2563eb',Inventory:'#059669',Sales:'#7c3aed',Retailers:'#d97706'};
const TAG_B: Record<string,string> = {Finance:'#eff6ff',Inventory:'#f0fdf4',Sales:'#f5f3ff',Retailers:'#fffbeb'};

type ReportType = 'financial' | 'inventory' | 'orders' | 'retailers';

type SavedReport = {
  id: string;
  name: string;
  fileType: 'CSV' | 'Excel';
  size: string;
  generated: string;
  reportKey: ReportType;
};

const SAVED_REPORTS_INIT: SavedReport[] = [
  { id: '1', name: 'Monthly Sales Summary — Apr 2026',    fileType: 'CSV',   size: '2.1 MB', generated: 'Apr 1',  reportKey: 'financial' },
  { id: '2', name: 'Inventory Audit Report — Q1 2026',   fileType: 'Excel', size: '1.8 MB', generated: 'Apr 1',  reportKey: 'inventory' },
  { id: '3', name: 'Outstanding Payments — Apr 2026',    fileType: 'CSV',   size: '890 KB', generated: 'Apr 12', reportKey: 'financial' },
  { id: '4', name: 'Product-wise Sales Analysis',        fileType: 'Excel', size: '3.1 MB', generated: 'Apr 5',  reportKey: 'orders'    },
  { id: '5', name: 'Business Credit Report',             fileType: 'CSV',   size: '1.2 MB', generated: 'Apr 8',  reportKey: 'retailers' },
];

export default function ReportsPage() {
  const [active, setActive] = useState<RptKey>('dues');
  const [period,  setPeriod]  = useState<Period>('30');
  const r = RPTS.find(x => x.key === active)!;
  return (
    <div className="animate-in" style={{display:'grid',gridTemplateColumns:'250px 1fr',gap:16,alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <div className="card">
          <div className="card-header"><span className="card-title">Reports</span></div>
          <div style={{padding:'6px 8px 10px'}}>
            {RPTS.map(x => (
              <button key={x.key} onClick={()=>setActive(x.key)} style={{
                width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:8,cursor:'pointer',
                marginBottom:4,display:'block',
                background:active===x.key?x.color+'12':'transparent',
                border:active===x.key?`1px solid ${x.color}40`:'1px solid transparent',
              }}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                  <strong style={{fontSize:12,color:active===x.key?x.color:'#1a1d23'}}>{x.label}</strong>
                  <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:20,background:TAG_B[x.tag],color:TAG_C[x.tag]}}>{x.tag}</span>
                </div>
                <div style={{fontSize:11,color:'#9ca3af',lineHeight:1.35}}>{x.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="card" style={{padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.04em'}}>Period</div>
          {PERIODS.map(p=>(
            <button key={p.key} onClick={()=>setPeriod(p.key)} style={{
              display:'block',width:'100%',textAlign:'left',padding:'7px 12px',borderRadius:7,
              cursor:'pointer',marginBottom:3,fontSize:13,fontWeight:600,
              background:period===p.key?'#f0fdf4':'transparent',
              color:period===p.key?'#059669':'#4b5563',
              border:period===p.key?'1px solid #d1fae5':'1px solid transparent',
            }}>{p.label}</button>
          ))}
        </div>
      </div>
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div>
            <div style={{fontFamily:'var(--font-head)',fontSize:15,fontWeight:800,color:'#1a1d23'}}>{r.label}</div>
            <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{r.desc}</div>
          </div>
          <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:TAG_B[r.tag],color:TAG_C[r.tag]}}>{r.tag}</span>
        </div>
        {active==='dues'     && <OutstandingDuesReport    period={period}/>}
        {active==='payments' && <PaymentCollectionsReport period={period}/>}
        {active==='expiry'   && <ExpiryRiskReport         period={period}/>}
        {active==='sales'    && <SalesRegisterReport      period={period}/>}
        {active==='health'   && <RetailerHealthReport     period={period}/>}
      </div>
    </div>
  );
}


// ── helpers ────────────────────────────────────────────────────
const INR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const sinceDate = (days: string) => new Date(Date.now() - Number(days)*86400000).toISOString().split('T')[0];

function ExportCSV({data,cols,filename}:{data:any[];cols:string[];filename:string}) {
  const go = () => {
    if (!data.length) return;
    const csv = [cols.join(','), ...data.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`${filename}_${new Date().toISOString().slice(0,10)}.csv`});
    a.click();
  };
  return <button onClick={go} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'#059669',background:'#ecfdf5',border:'1px solid #d1fae5',padding:'6px 14px',borderRadius:7,cursor:'pointer'}}><IconDownload size={12}/>Export CSV</button>;
}

function StatRow({items}:{items:{label:string;value:string|number;color:string}[]}) {
  return <div style={{display:'grid',gridTemplateColumns:`repeat(${items.length},1fr)`,gap:12,marginBottom:16}}>
    {items.map(s=><div key={s.label} className="stat-card">
      <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
      <div style={{fontFamily:'var(--font-head)',fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
    </div>)}
  </div>;
}

type SortOpt = {key:string;label:string};
type FTProps = {
  from:string; setFrom:(v:string)=>void;
  to:string;   setTo:(v:string)=>void;
  sortBy:string; setSortBy:(v:string)=>void;
  sortOpts:SortOpt[]; count:number;
  onClear:()=>void;
};
function FilterToolbar({from,setFrom,to,setTo,sortBy,setSortBy,sortOpts,count,onClear}:FTProps) {
  const iS:React.CSSProperties = {border:'1px solid #e5e7eb',borderRadius:7,padding:'6px 10px',fontSize:12,color:'#1a1d23',background:'#f9fafb',outline:'none'};
  const hasFilter = from||to||sortBy!==sortOpts[0]?.key;
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',background:'#f8faff',borderBottom:'1px solid #e5e7eb',flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <span style={{fontSize:11,color:'#6b7280',fontWeight:600}}>From</span>
        <DatePicker value={from} onChange={setFrom} placeholder="From date" style={{padding:'5px 10px',fontSize:12}}/>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <span style={{fontSize:11,color:'#6b7280',fontWeight:600}}>To</span>
        <DatePicker value={to} onChange={setTo} placeholder="To date" style={{padding:'5px 10px',fontSize:12}} min={from||undefined}/>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <span style={{fontSize:11,color:'#6b7280',fontWeight:600}}>Sort</span>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...iS,paddingRight:24}}>
          {sortOpts.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      {hasFilter&&<button onClick={onClear} style={{fontSize:11,fontWeight:600,color:'#6b7280',background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'5px 10px',cursor:'pointer'}}>Clear</button>}
      <div style={{marginLeft:'auto',fontSize:11,color:'#9ca3af',fontWeight:600}}>{count} result{count!==1?'s':''}</div>
    </div>
  );
}



// ── 1. Outstanding Dues (Aging) ────────────────────────────────
function OutstandingDuesReport({period}:{period:string}) {
  const SOPTS=[{key:'balance_desc',label:'Outstanding ↓'},{key:'balance_asc',label:'Outstanding ↑'},{key:'util_desc',label:'Utilization ↓'},{key:'name_asc',label:'Name A→Z'}];
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sortBy,setSortBy]=useState('balance_desc');
  const {data,isLoading} = useQuery({
    queryKey:['rpt-dues'],
    queryFn: async()=>{const d=(await api.get('/finance/balances')).data?.data; return Array.isArray(d)?d:(d?.data??[]);}
  });
  const rows: any[] = Array.isArray(data)?data:[];
  let owing = rows.filter(r=>Number(r.current_balance)>0);
  const total = owing.reduce((s,r)=>s+Number(r.current_balance),0);
  const hi    = owing.filter(r=>Number(r.current_balance)/Number(r.credit_limit||1)>0.8).length;
  owing = owing.sort((a,b)=>{
    if(sortBy==='balance_asc') return Number(a.current_balance)-Number(b.current_balance);
    if(sortBy==='util_desc'){const pa=Number(a.credit_limit)>0?(Number(a.current_balance)/Number(a.credit_limit)):0;const pb=Number(b.credit_limit)>0?(Number(b.current_balance)/Number(b.credit_limit)):0;return pb-pa;}
    if(sortBy==='name_asc') return (a.business_name||'').localeCompare(b.business_name||'');
    return Number(b.current_balance)-Number(a.current_balance);
  });
  return (<div>
    <StatRow items={[
      {label:'Total Outstanding',value:INR(total),color:'#dc2626'},
      {label:'Retailers with Dues',value:owing.length,color:'#1a1d23'},
      {label:'High-Risk (>80% limit)',value:hi,color:'#f59e0b'},
    ]}/>
    <div className="card">
      <div className="card-header">
        <span className="card-title">Retailer Dues Aging</span>
        <ExportCSV data={owing} cols={['business_name','credit_limit','current_balance']} filename="outstanding_dues"/>
      </div>
      <FilterToolbar from={from} setFrom={setFrom} to={to} setTo={setTo} sortBy={sortBy} setSortBy={setSortBy} sortOpts={SOPTS} count={owing.length} onClear={()=>{setFrom('');setTo('');setSortBy('balance_desc');}}/>
      <table className="data-table"><thead><tr><th>Retailer</th><th>GSTIN</th><th>Credit Limit</th><th>Outstanding</th><th>Utilization</th><th>Risk</th></tr></thead>
        <tbody>{isLoading?<tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>Loading…</td></tr>
          :owing.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No outstanding dues</td></tr>
          :owing.map((r:any)=>{
            const pct=Number(r.credit_limit)>0?Math.min(100,(Number(r.current_balance)/Number(r.credit_limit))*100):0;
            const risk=pct>80?'High':pct>50?'Medium':'Low';
            const rc={High:'badge-red',Medium:'badge-amber',Low:'badge-green'}[risk]!;
            return <tr key={r.business_id}>
              <td><strong>{r.business_name}</strong></td>
              <td style={{fontSize:12,color:'#6b7280'}}>{r.gstin||'—'}</td>
              <td>{INR(Number(r.credit_limit))}</td>
              <td><strong style={{color:'#dc2626'}}>{INR(Number(r.current_balance))}</strong></td>
              <td><div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{flex:1,height:6,background:'#f3f4f6',borderRadius:3}}><div style={{height:'100%',width:`${pct}%`,background:pct>80?'#ef4444':'#10b981',borderRadius:3}}/></div>
                <span style={{fontSize:11,color:'#6b7280',minWidth:28}}>{pct.toFixed(0)}%</span>
              </div></td>
              <td><span className={`badge ${rc}`}>{risk}</span></td>
            </tr>;
          })}</tbody>
      </table>
    </div>
  </div>);
}

// ── 2. Payment Collections ─────────────────────────────────────
function PaymentCollectionsReport({period}:{period:string}) {
  const SOPTS=[{key:'date_desc',label:'Date (Newest)'},{key:'date_asc',label:'Date (Oldest)'},{key:'amt_desc',label:'Amount ↓'},{key:'amt_asc',label:'Amount ↑'}];
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sortBy,setSortBy]=useState('date_desc');
  const {data,isLoading} = useQuery({
    queryKey:['rpt-payments',period],
    queryFn: async()=>{const d=(await api.get('/finance/payments?limit=200')).data?.data; return Array.isArray(d)?d:(d?.data??[]);}
  });
  const cutoff = from||sinceDate(period);
  let all: any[] = (Array.isArray(data)?data:[]).filter((p:any)=>(!cutoff||p.payment_date>=cutoff)&&(!to||p.payment_date<=to));
  const total = all.reduce((s,p)=>s+Number(p.amount),0);
  const cash  = all.filter(p=>p.method==='cash').reduce((s,p)=>s+Number(p.amount),0);
  const bank  = all.filter(p=>p.method!=='cash').reduce((s,p)=>s+Number(p.amount),0);
  all = all.sort((a,b)=>{
    if(sortBy==='date_asc') return (a.payment_date||'').localeCompare(b.payment_date||'');
    if(sortBy==='amt_desc') return Number(b.amount)-Number(a.amount);
    if(sortBy==='amt_asc')  return Number(a.amount)-Number(b.amount);
    return (b.payment_date||'').localeCompare(a.payment_date||'');
  });
  return (<div>
    <StatRow items={[
      {label:'Total Collected',value:INR(total),color:'#059669'},
      {label:'Transactions',value:all.length,color:'#1a1d23'},
      {label:'Cash',value:INR(cash),color:'#f59e0b'},
      {label:'Bank / UPI',value:INR(bank),color:'#2563eb'},
    ]}/>
    <div className="card">
      <div className="card-header">
        <span className="card-title">Payment Log</span>
        <ExportCSV data={all} cols={['payment_number','business_name','amount','method','payment_date']} filename="payment_collections"/>
      </div>
      <FilterToolbar from={from} setFrom={setFrom} to={to} setTo={setTo} sortBy={sortBy} setSortBy={setSortBy} sortOpts={SOPTS} count={all.length} onClear={()=>{setFrom('');setTo('');setSortBy('date_desc');}}/>
      <table className="data-table"><thead><tr><th>Payment #</th><th>Retailer</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
        <tbody>{isLoading?<tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>Loading…</td></tr>
          :all.length===0?<tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No payments in period</td></tr>
          :all.map((p:any)=><tr key={p.id}>
            <td><strong style={{color:'#059669'}}>{p.payment_number}</strong></td>
            <td>{p.business_name||'—'}</td>
            <td><strong>{INR(Number(p.amount))}</strong></td>
            <td><span className={`badge ${p.method==='cash'?'badge-amber':'badge-blue'}`}>{p.method||'—'}</span></td>
            <td style={{fontSize:12,color:'#6b7280'}}>{p.payment_date?new Date(p.payment_date).toLocaleDateString('en-IN'):'—'}</td>
          </tr>)}</tbody>
      </table>
    </div>
  </div>);
}

// ── 3. Expiry Risk ─────────────────────────────────────────────
function ExpiryRiskReport({period}:{period:string}) {
  const SOPTS=[{key:'days_asc',label:'Days Left ↑'},{key:'days_desc',label:'Days Left ↓'},{key:'qty_desc',label:'Quantity ↓'},{key:'name_asc',label:'Product A→Z'}];
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sortBy,setSortBy]=useState('days_asc');
  const {data,isLoading} = useQuery({
    queryKey:['rpt-expiry'],
    queryFn: async()=>{const d=(await api.get('/inventory/near-expiry')).data?.data; return Array.isArray(d)?d:(d?.data??[]);}
  });
  const batches: any[] = Array.isArray(data)?data:[];
  const days = Number(period);
  let atRisk = batches.filter(b=>{
    const d=b.days_until_expiry??b.expiry_date?Math.round((new Date(b.expiry_date).getTime()-Date.now())/86400000):null;
    if(d===null||d>days) return false;
    if(from&&b.expiry_date&&b.expiry_date<from) return false;
    if(to&&b.expiry_date&&b.expiry_date>to) return false;
    return true;
  }).sort((a,b)=>{
    const da=a.days_until_expiry??999; const db=b.days_until_expiry??999;
    if(sortBy==='days_desc') return db-da;
    if(sortBy==='qty_desc')  return Number(b.quantity)-Number(a.quantity);
    if(sortBy==='name_asc')  return (a.product_name||'').localeCompare(b.product_name||'');
    return da-db;
  });
  const valueAtRisk = atRisk.reduce((s,b)=>s+Number(b.quantity||0)*Number(b.purchase_price||0),0);
  const critical = atRisk.filter(b=>(b.days_until_expiry??999)<=7).length;
  return (<div>
    <StatRow items={[
      {label:'Batches at Risk',value:atRisk.length,color:'#dc2626'},
      {label:'Critical (≤7 days)',value:critical,color:'#dc2626'},
      {label:'Value at Risk',value:INR(valueAtRisk),color:'#f59e0b'},
    ]}/>
    <div className="card">
      <div className="card-header">
        <span className="card-title">Near-Expiry Batches</span>
        <ExportCSV data={atRisk} cols={['product_name','batch_number','quantity','expiry_date','warehouse_name']} filename="expiry_risk"/>
      </div>
      <FilterToolbar from={from} setFrom={setFrom} to={to} setTo={setTo} sortBy={sortBy} setSortBy={setSortBy} sortOpts={SOPTS} count={atRisk.length} onClear={()=>{setFrom('');setTo('');setSortBy('days_asc');}}/>
      <table className="data-table"><thead><tr><th>Product</th><th>Batch #</th><th>Qty</th><th>Expiry</th><th>Warehouse</th><th>Days Left</th></tr></thead>
        <tbody>{isLoading?<tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>Loading…</td></tr>
          :atRisk.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No batches expiring in this period</td></tr>
          :atRisk.map((b:any)=>{
            const d=b.days_until_expiry??Math.round((new Date(b.expiry_date).getTime()-Date.now())/86400000);
            return <tr key={b.id}>
              <td><strong>{b.product_name}</strong></td>
              <td><code style={{fontSize:11,background:'#f3f4f6',padding:'2px 6px',borderRadius:4}}>{b.batch_number}</code></td>
              <td>{Number(b.quantity).toFixed(0)}</td>
              <td style={{fontSize:12,color:d<=7?'#dc2626':'#6b7280'}}>{b.expiry_date?new Date(b.expiry_date).toLocaleDateString('en-IN'):'—'}</td>
              <td style={{fontSize:12,color:'#6b7280'}}>{b.warehouse_name||'—'}</td>
              <td><span className={`badge ${d<=7?'badge-red':d<=30?'badge-amber':'badge-green'}`}>{d}d</span></td>
            </tr>;
          })}</tbody>
      </table>
    </div>
  </div>);
}

// ── 4. Sales Register ──────────────────────────────────────────
function SalesRegisterReport({period}:{period:string}) {
  const SOPTS=[{key:'date_desc',label:'Date (Newest)'},{key:'date_asc',label:'Date (Oldest)'},{key:'amt_desc',label:'Amount ↓'},{key:'amt_asc',label:'Amount ↑'},{key:'name_asc',label:'Retailer A-Z'}];
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sortBy,setSortBy]=useState('date_desc');
  const {data,isLoading} = useQuery({
    queryKey:['rpt-sales',period],
    queryFn: async()=>{const d=(await api.get('/orders?limit=200')).data?.data; return Array.isArray(d)?d:(d?.data??[]);}
  });
  const cutoff = from||sinceDate(period);
  const SC: Record<string,string> = {pending:'badge-amber',confirmed:'badge-blue',processing:'badge-violet',dispatched:'badge-stone',delivered:'badge-green',cancelled:'badge-red'};
  let orders: any[] = (Array.isArray(data)?data:[]).filter((o:any)=>o.created_at>=cutoff&&(!to||o.created_at.slice(0,10)<=to));
  const revenue = orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total_amount),0);
  const delivered = orders.filter(o=>o.status==='delivered').length;
  orders=orders.sort((a,b)=>{
    if(sortBy==='date_asc') return (a.created_at||'').localeCompare(b.created_at||'');
    if(sortBy==='amt_desc') return Number(b.total_amount)-Number(a.total_amount);
    if(sortBy==='amt_asc')  return Number(a.total_amount)-Number(b.total_amount);
    if(sortBy==='name_asc') return (a.business_name||'').localeCompare(b.business_name||'');
    return (b.created_at||'').localeCompare(a.created_at||'');
  });
  return (<div>
    <StatRow items={[
      {label:'Orders',value:orders.length,color:'#7c3aed'},
      {label:'Revenue',value:INR(revenue),color:'#059669'},
      {label:'Delivered',value:delivered,color:'#059669'},
      {label:'Cancelled',value:orders.filter(o=>o.status==='cancelled').length,color:'#dc2626'},
    ]}/>
    <div className="card">
      <div className="card-header">
        <span className="card-title">Order Register</span>
        <ExportCSV data={orders} cols={['order_number','business_name','status','total_amount','created_at']} filename="sales_register"/>
      </div>
      <FilterToolbar from={from} setFrom={setFrom} to={to} setTo={setTo} sortBy={sortBy} setSortBy={setSortBy} sortOpts={SOPTS} count={orders.length} onClear={()=>{setFrom('');setTo('');setSortBy('date_desc');}}/>
      <table className="data-table"><thead><tr><th>Order #</th><th>Retailer</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>{isLoading?<tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>Loading…</td></tr>
          :orders.length===0?<tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No orders in period</td></tr>
          :orders.map((o:any)=><tr key={o.id}>
            <td><strong style={{color:'#7c3aed'}}>{o.order_number}</strong></td>
            <td>{o.business_name||'—'}</td>
            <td><span className={`badge ${SC[o.status]||'badge-stone'}`}>{o.status}</span></td>
            <td><strong>{INR(Number(o.total_amount))}</strong></td>
            <td style={{fontSize:12,color:'#6b7280'}}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
          </tr>)}</tbody>
      </table>
    </div>
  </div>);
}

// ── 5. Retailer Health Check ───────────────────────────────────
function RetailerHealthReport({period}:{period:string}) {
  const SOPTS=[{key:'balance_desc',label:'Outstanding Desc'},{key:'util_desc',label:'Utilization Desc'},{key:'orders_desc',label:'Orders Desc'},{key:'limit_desc',label:'Credit Limit Desc'},{key:'name_asc',label:'Name A-Z'}];
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sortBy,setSortBy]=useState('balance_desc');
  const {data,isLoading} = useQuery({
    queryKey:['rpt-health'],
    queryFn: async()=>(await api.get('/businesses')).data.data,
  });
  let retailers: any[] = Array.isArray(data)?data:[];
  const atRisk = retailers.filter(r=>Number(r.credit_limit)>0&&(Number(r.current_balance)/Number(r.credit_limit))>0.8);
  const overdue = retailers.filter(r=>Number(r.current_balance)>0);
  retailers=retailers.sort((a,b)=>{
    if(sortBy==='util_desc'){const pa=Number(a.credit_limit)>0?Number(a.current_balance)/Number(a.credit_limit):0;const pb=Number(b.credit_limit)>0?Number(b.current_balance)/Number(b.credit_limit):0;return pb-pa;}
    if(sortBy==='orders_desc') return Number(b.total_orders)-Number(a.total_orders);
    if(sortBy==='limit_desc')  return Number(b.credit_limit)-Number(a.credit_limit);
    if(sortBy==='name_asc')    return (a.business_name||'').localeCompare(b.business_name||'');
    return Number(b.current_balance)-Number(a.current_balance);
  });
  return (<div>
    <StatRow items={[
      {label:'Total Retailers',value:retailers.length,color:'#2563eb'},
      {label:'Active',value:retailers.filter(r=>r.is_active).length,color:'#059669'},
      {label:'With Dues',value:overdue.length,color:'#f59e0b'},
      {label:'High-Risk',value:atRisk.length,color:'#dc2626'},
    ]}/>
    <div className="card">
      <div className="card-header">
        <span className="card-title">Retailer Health Check</span>
        <ExportCSV data={retailers} cols={['business_name','gstin','credit_limit','current_balance','total_orders','is_active']} filename="retailer_health"/>
      </div>
      <FilterToolbar from={from} setFrom={setFrom} to={to} setTo={setTo} sortBy={sortBy} setSortBy={setSortBy} sortOpts={SOPTS} count={retailers.length} onClear={()=>{setFrom('');setTo('');setSortBy('balance_desc');}}/>
      <table className="data-table"><thead><tr><th>Retailer</th><th>GSTIN</th><th>Credit Limit</th><th>Outstanding</th><th>Orders</th><th>Utilization</th><th>Status</th></tr></thead>
        <tbody>{isLoading?<tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>Loading…</td></tr>
          :retailers.map((r:any)=>{
            const pct=Number(r.credit_limit)>0?Math.min(100,(Math.max(0,Number(r.current_balance))/Number(r.credit_limit))*100):0;
            return <tr key={r.business_id}>
              <td><strong>{r.business_name}</strong></td>
              <td style={{fontSize:12,color:'#6b7280'}}>{r.gstin||'—'}</td>
              <td>{INR(Number(r.credit_limit))}</td>
              <td style={{fontWeight:700,color:Number(r.current_balance)>0?'#dc2626':'#059669'}}>{INR(Number(r.current_balance))}</td>
              <td style={{fontWeight:600}}>{r.total_orders}</td>
              <td><div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:60,height:6,background:'#f3f4f6',borderRadius:3}}><div style={{height:'100%',width:`${pct}%`,background:pct>80?'#ef4444':'#10b981',borderRadius:3}}/></div>
                <span style={{fontSize:11,color:'#6b7280'}}>{pct.toFixed(0)}%</span>
              </div></td>
              <td><span className={`badge ${r.is_active?'badge-green':'badge-red'}`}>{r.is_active?'Active':'Inactive'}</span></td>
            </tr>;
          })}</tbody>
      </table>
    </div>
  </div>);
}
