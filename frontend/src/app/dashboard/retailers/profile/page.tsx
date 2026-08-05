'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

const DUMMY_ADDRESSES = [
  { id: 1, label: 'Main Store',     address: '#12, Market Road, Mysuru — 570 001', primary: true },
  { id: 2, label: 'Godown',         address: 'Plot 7, Industrial Estate, Mysuru — 570 011', primary: false },
];

export default function BusinessProfilePage() {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState(DUMMY_ADDRESSES);
  const [editMode, setEditMode] = useState(false);
  const [addAddr, setAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', address: '' });
  const [saved, setSaved] = useState(false);

  const { data: bizData } = useQuery({
    queryKey: ['my-business', user?.businessId],
    queryFn: async () => (await api.get(`/businesses/${user?.businessId}`)).data?.data?.profile ?? null,
    enabled: !!user?.businessId,
  });

  const biz = bizData || {
    name: user?.firstName ? `${user.firstName}'s Business` : 'My Business',
    contact: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    email: user?.email || '',
    phone: '',
    city: '',
    gstin: '',
    pan: '',
    credit_limit: 100000,
    is_active: true,
  };

  const handleSave = () => { setSaved(true); setEditMode(false); setTimeout(() => setSaved(false), 3000); };

  const addAddress = () => {
    if (!newAddr.address) return;
    setAddresses(p => [...p, { id: Date.now(), ...newAddr, primary: false }]);
    setNewAddr({ label: '', address: '' });
    setAddAddr(false);
  };

  return (
    <div className="animate-in">
      {saved && (
        <div style={{ background: 'var(--emerald-50)', border: '1px solid var(--emerald-100)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--emerald-700)', fontWeight: 500 }}>
          ✅ Profile updated successfully.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* Left — Business Info */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Business Information</span>
              <button type="button" className={editMode ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '6px 14px' }} onClick={editMode ? handleSave : () => setEditMode(true)}>
                {editMode ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
            <div className="card-body">
              <div className="grid-2">
                {[
                  { label: 'Business Name',   field: 'name',    value: biz.name },
                  { label: 'Contact Person',  field: 'contact', value: biz.contact },
                  { label: 'Email',           field: 'email',   value: biz.email },
                  { label: 'Phone',           field: 'phone',   value: biz.phone || '+91 XXXXX XXXXX' },
                  { label: 'City',            field: 'city',    value: biz.city || 'Mysuru' },
                  { label: 'GSTIN',           field: 'gstin',   value: biz.gstin || '29AABCK1234K1Z5' },
                ].map(f => (
                  <div key={f.field} className="field-group">
                    <label className="field-label">{f.label}</label>
                    {editMode
                      ? <input className="form-input" defaultValue={f.value} />
                      : <div style={{ fontSize: 13, fontWeight: 500, padding: '8px 0', color: 'var(--text)' }}>{f.value || '—'}</div>}
                  </div>
                ))}
              </div>
              <div className="field-group">
                <label className="field-label">PAN</label>
                {editMode
                  ? <input className="form-input" defaultValue={biz.pan || 'AABCK1234K'} />
                  : <div style={{ fontSize: 13, fontWeight: 500, padding: '8px 0' }}>{biz.pan || 'AABCK1234K'}</div>}
              </div>
            </div>
          </div>

          {/* Delivery Addresses */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Delivery Addresses</span>
              <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setAddAddr(true)}>+ Add Address</button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {addresses.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < addresses.length - 1 ? '1px solid var(--border)' : '' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
                      {a.primary && <span className="badge badge-green">Primary</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!a.primary && <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setAddresses(p => p.map(x => ({ ...x, primary: x.id === a.id })))}>Set Primary</button>}
                    <button type="button" className="btn-danger" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setAddresses(p => p.filter(x => x.id !== a.id))}>Remove</button>
                  </div>
                </div>
              ))}
              {addAddr && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <div className="grid-2" style={{ marginBottom: 10 }}>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">Label</label>
                      <input className="form-input" value={newAddr.label} onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Main Store, Godown" />
                    </div>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">Full Address</label>
                      <input className="form-input" value={newAddr.address} onChange={e => setNewAddr(p => ({ ...p, address: e.target.value }))} placeholder="Street, City, PIN" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={addAddress}>Add</button>
                    <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setAddAddr(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Account overview */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Account Overview</span></div>
            <div className="card-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--emerald-50)', border: '2px solid var(--emerald-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--emerald-700)' }}>
                  {(biz.name || 'B').charAt(0).toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15 }}>{biz.name}</div>
                <span className="badge badge-green" style={{ marginTop: 6 }}>Active Account</span>
              </div>
              {[['Credit Limit', fmt(Number(biz.credit_limit || 100000))],['Account Type','Retailer'],['Member Since','Jan 2024'],['Assigned Rep','Suresh Kumar']].map(([l,v])=>(
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ background: 'linear-gradient(135deg,#065f46,#1e3a5f)', color: '#fff', border: 'none' }}>
            <div className="card-body">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.6, marginBottom: 8 }}>NEED HELP?</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Contact your Sales Rep</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 14 }}>Suresh Kumar · +91 98001 11223</div>
              <button type="button" style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
