'use client';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';

const LEADS_INIT = [
  { id: 1, name: 'Rajan Kumar Agro',    contact: 'Rajan Kumar',    phone: '+91 94490 11223', city: 'Mandya',    source: 'Field Visit',   status: 'Hot',      volume: '₹2–5L/mo',   addedOn: 'May 1' },
  { id: 2, name: 'Shiva Farm Inputs',   contact: 'Shivappa M.',    phone: '+91 98001 22334', city: 'Hassan',    source: 'Referral',      status: 'Warm',     volume: '₹1–2L/mo',   addedOn: 'Apr 28' },
  { id: 3, name: 'Ganga Agro Centre',   contact: 'Gangadhar R.',   phone: '+91 96780 33445', city: 'Tumkur',    source: 'WhatsApp Bot',  status: 'Cold',     volume: '₹50K–1L/mo', addedOn: 'Apr 25' },
  { id: 4, name: 'Sai Krishi Kendra',   contact: 'Satish P.',      phone: '+91 95001 44556', city: 'Chitradurga',source: 'Trade Fair',    status: 'Hot',      volume: '₹5–10L/mo',  addedOn: 'May 2' },
  { id: 5, name: 'Sri Ram Fertilizers', contact: 'Ramesh T.',      phone: '+91 97001 55667', city: 'Davangere', source: 'Cold Call',     status: 'Converted', volume: '₹3–5L/mo',   addedOn: 'Apr 20' },
];

const STATUS_BADGE: Record<string,string> = { Hot:'badge-red', Warm:'badge-amber', Cold:'badge-stone', Converted:'badge-green' };
const SOURCE_BADGE: Record<string,string> = { 'Field Visit':'badge-blue','Referral':'badge-green','WhatsApp Bot':'badge-green','Trade Fair':'badge-violet','Cold Call':'badge-stone' };

const SOURCES = ['Field Visit','Referral','WhatsApp Bot','Trade Fair','Cold Call','Other'];
const STATUSES = ['Hot','Warm','Cold'];

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState(LEADS_INIT);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', contact:'', phone:'', city:'', source: SOURCES[0], volume:'', status: 'Warm' });

  const visible = leads.filter(l =>
    !filter || l.status.toLowerCase() === filter.toLowerCase()
  );

  const addLead = () => {
    if (!form.name || !form.contact) return;
    setLeads(prev => [...prev, { id: Date.now(), ...form, addedOn: 'Today' }]);
    setForm({ name:'', contact:'', phone:'', city:'', source: SOURCES[0], volume:'', status: 'Warm' });
    setShowModal(false);
  };

  return (
    <div className="animate-in">
      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Leads',    val: leads.length,                              sub:'In pipeline',         cls:'' },
          { label:'Hot Leads',      val: leads.filter(l=>l.status==='Hot').length,   sub:'High priority',       cls:'red' },
          { label:'Warm Leads',     val: leads.filter(l=>l.status==='Warm').length,  sub:'Follow up needed',    cls:'amber' },
          { label:'Converted',      val: leads.filter(l=>l.status==='Converted').length, sub:'This quarter',   cls:'' },
        ].map(s => (
          <div key={s.label} className={`stat-card${s.cls ? ' '+s.cls : ''}`}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:800 }}>{s.val}</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Leads & Onboarding Pipeline</span>
          <div style={{ display:'flex', gap:8 }}>
            <select
              value={filter} onChange={e=>setFilter(e.target.value)}
              className="form-input" style={{ width:'auto', padding:'6px 12px' }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
              <option value="Converted">Converted</option>
            </select>
            <button type="button" className="btn-primary" onClick={()=>setShowModal(true)}>+ Add Lead</button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Business</th><th>Contact</th><th>City</th><th>Source</th><th>Est. Volume</th><th>Status</th><th>Added</th><th></th></tr>
          </thead>
          <tbody>
            {visible.map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight:500 }}>{l.name}</td>
                <td>
                  <div>{l.contact}</div>
                  <div className="sub">{l.phone}</div>
                </td>
                <td style={{ color:'var(--text-secondary)' }}>{l.city}</td>
                <td><span className={`badge ${SOURCE_BADGE[l.source] || 'badge-stone'}`}>{l.source}</span></td>
                <td style={{ fontWeight:500 }}>{l.volume}</td>
                <td><span className={`badge ${STATUS_BADGE[l.status]}`}>{l.status}</span></td>
                <td style={{ fontSize:12, color:'var(--text-faint)' }}>{l.addedOn}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button type="button" className="btn-secondary" style={{ padding:'4px 10px', fontSize:12 }}>Call</button>
                    {l.status !== 'Converted' &&
                      <button type="button" className="btn-primary" style={{ padding:'4px 10px', fontSize:12 }}>Onboard</button>}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-faint)' }}>No leads match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      {showModal && (
        <Modal
          title="Add New Lead"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={addLead}>Add Lead</button>
            </>
          }
        >
          <div className="grid-2">
            <div className="field-group">
              <label className="field-label">Business Name *</label>
              <input className="form-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Rajan Kumar Agro" />
            </div>
            <div className="field-group">
              <label className="field-label">Contact Person *</label>
              <input className="form-input" value={form.contact} onChange={e=>setForm(p=>({...p,contact:e.target.value}))} placeholder="Name" />
            </div>
          </div>
          <div className="grid-2">
            <div className="field-group">
              <label className="field-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="field-group">
              <label className="field-label">City</label>
              <input className="form-input" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} placeholder="City" />
            </div>
          </div>
          <div className="grid-2">
            <div className="field-group">
              <label className="field-label">Lead Source</label>
              <select className="form-input" value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))}>
                {SOURCES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Status</label>
              <select className="form-input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Estimated Monthly Volume</label>
            <input className="form-input" value={form.volume} onChange={e=>setForm(p=>({...p,volume:e.target.value}))} placeholder="e.g. ₹2–5L/mo" />
          </div>
        </Modal>
      )}
    </div>
  );
}
