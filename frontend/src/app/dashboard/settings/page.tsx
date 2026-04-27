'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Icons } from '@/components/ui/Icons';

type Tab = 'general' | 'payment' | 'tax' | 'notifications';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('general');

  const TABS: { key: Tab; label: string; Icon: React.FC<any> }[] = [
    { key: 'general',       Icon: Icons.Building,  label: 'General' },
    { key: 'payment',       Icon: Icons.CreditCard, label: 'Payment Terms' },
    { key: 'tax',           Icon: Icons.Reports,   label: 'Tax & GST' },
    { key: 'notifications', Icon: Icons.Bell,      label: 'Notifications' },
  ];

  return (
    <div className="animate-in">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f4f6f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: tab === t.key ? '#fff' : 'transparent',
            color: tab === t.key ? '#059669' : '#6b7280',
            border: tab === t.key ? '1px solid #e5e7eb' : '1px solid transparent',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ display: 'inline-flex' }}><t.Icon size={14} color={tab === t.key ? '#059669' : '#6b7280'} /></span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'general'       && <GeneralSettings user={user} />}
      {tab === 'payment'       && <PaymentSettings />}
      {tab === 'tax'           && <TaxSettings />}
      {tab === 'notifications' && <NotificationSettings />}
    </div>
  );
}

/* ── General Settings ───────────────────────────────── */
function GeneralSettings({ user }: any) {
  const [form, setForm] = useState({
    companyName: 'FDMS Enterprise',
    address: '123 Agri Hub, Sector 5, Delhi 110001',
    phone: '+91 98765 43210',
    email: 'admin@fdms.com',
    gstin: '07AAACF5235N1ZX',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: 'April',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const f = (k: string) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Building size={15} color="#059669" /> Company Information</span></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Company Name', key: 'companyName' },
            { label: 'GSTIN', key: 'gstin' },
            { label: 'Phone', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Address', key: 'address' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 5 }}>{label}</label>
              <input className="form-input" value={(form as any)[key]} onChange={f(key)} />
            </div>
          ))}
          <div style={{ paddingTop: 8, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave}>{saved ? 'Saved!' : 'Save Changes'}</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Settings size={15} color="#059669" /> System Preferences</span></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Timezone', key: 'timezone', options: ['Asia/Kolkata', 'Asia/Colombo', 'UTC'] },
            { label: 'Currency', key: 'currency', options: ['INR', 'USD', 'EUR'] },
            { label: 'Date Format', key: 'dateFormat', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
            { label: 'Fiscal Year Start', key: 'fiscalYearStart', options: ['April', 'January', 'October'] },
          ].map(({ label, key, options }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 5 }}>{label}</label>
              <select className="form-input" value={(form as any)[key]} onChange={f(key)}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ paddingTop: 8, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave}>{saved ? 'Saved!' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Payment Terms Settings ─────────────────────────── */
function PaymentSettings() {
  const [terms, setTerms] = useState([
    { id: 1, name: 'Net 15', days: 15, default: false },
    { id: 2, name: 'Net 30', days: 30, default: true },
    { id: 3, name: 'Net 45', days: 45, default: false },
    { id: 4, name: 'Immediate', days: 0, default: false },
  ]);
  const [newTerm, setNewTerm] = useState({ name: '', days: '' });
  const [saved, setSaved] = useState(false);

  const addTerm = () => {
    if (!newTerm.name || !newTerm.days) return;
    setTerms(t => [...t, { id: Date.now(), name: newTerm.name, days: Number(newTerm.days), default: false }]);
    setNewTerm({ name: '', days: '' });
  };

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="card-header">
        <span className="card-title">💳 Payment Terms Configuration</span>
        <button className="btn-primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
      <div className="card-body">
        <table className="data-table" style={{ marginBottom: 20 }}>
          <thead><tr><th>Term Name</th><th>Credit Days</th><th>Default</th><th></th></tr></thead>
          <tbody>
            {terms.map(t => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong></td>
                <td>{t.days === 0 ? 'Due on receipt' : `${t.days} days`}</td>
                <td>
                  {t.default
                    ? <span className="badge badge-green">Default</span>
                    : <button onClick={() => setTerms(ts => ts.map(x => ({ ...x, default: x.id === t.id })))}
                        style={{ fontSize: 11, color: '#059669', background: 'none', border: '1px solid #d1fae5', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}>
                        Set default
                      </button>}
                </td>
                <td>
                  <button onClick={() => setTerms(ts => ts.filter(x => x.id !== t.id))}
                    style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, padding: '14px 0', borderTop: '1px solid #f3f4f6' }}>
          <input className="form-input" placeholder="e.g. Net 60" value={newTerm.name} onChange={e => setNewTerm(f => ({ ...f, name: e.target.value }))} style={{ flex: 2 }} />
          <input className="form-input" type="number" placeholder="Days" value={newTerm.days} onChange={e => setNewTerm(f => ({ ...f, days: e.target.value }))} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={addTerm}>Add</button>
        </div>
      </div>
    </div>
  );
}

/* ── Tax Settings ───────────────────────────────────── */
function TaxSettings() {
  const [slabs] = useState([
    { rate: 0, desc: 'Exempted — Seeds, organic manure' },
    { rate: 5, desc: 'Standard — Chemical fertilizers, pesticides' },
    { rate: 12, desc: 'Standard — Agricultural equipment parts' },
    { rate: 18, desc: 'Higher — Some agri-chemicals' },
  ]);
  const [hsnMode, setHsnMode] = useState<'intrastate' | 'interstate'>('intrastate');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Reports size={15} color="#059669" /> GST Slabs</span></div>
        <div className="card-body">
          {slabs.map(s => (
            <div key={s.rate} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
              <div>
                <span className="badge badge-blue" style={{ marginRight: 8 }}>{s.rate}%</span>
                <span style={{ fontSize: 13, color: '#4b5563' }}>{s.desc}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '12px', background: '#f8fffe', borderRadius: 8, border: '1px solid #d1fae5', fontSize: 12, color: '#059669', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Icons.AlertCircle size={14} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
            GST rates are set per product SKU in the Products catalog.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Reports size={15} color="#059669" /> Tax Rules</span></div>
        <div className="card-body">
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Default Tax Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['intrastate', 'interstate'] as const).map(m => (
                <button key={m} onClick={() => setHsnMode(m)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: hsnMode === m ? '#ecfdf5' : '#f9fafb',
                  color: hsnMode === m ? '#059669' : '#6b7280',
                  border: hsnMode === m ? '1px solid #d1fae5' : '1px solid #e5e7eb',
                }}>
                  {m === 'intrastate' ? 'Intrastate (CGST+SGST)' : 'Interstate (IGST)'}
                </button>
              ))}
            </div>
          </div>
          {[
            ['CGST Rate', hsnMode === 'intrastate' ? 'Half of GST slab' : 'N/A'],
            ['SGST Rate', hsnMode === 'intrastate' ? 'Half of GST slab' : 'N/A'],
            ['IGST Rate', hsnMode === 'interstate' ? 'Full GST slab' : 'N/A'],
            ['E-Way Bill Threshold', '₹50,000'],
            ['GST Return Filing', 'Monthly (GSTR-1, GSTR-3B)'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Notification Settings ──────────────────────────── */
function NotificationSettings() {
  const [notifs, setNotifs] = useState([
    { key: 'order_placed',         label: 'New Order Placed',            email: true,  inapp: true },
    { key: 'order_delivered',      label: 'Order Delivered',             email: true,  inapp: true },
    { key: 'payment_received',     label: 'Payment Received',            email: true,  inapp: true },
    { key: 'low_stock',            label: 'Low Stock Alert',             email: true,  inapp: true },
    { key: 'expiry_warning',       label: 'Near-Expiry Warning',         email: true,  inapp: true },
    { key: 'credit_limit_warning', label: 'Credit Limit Warning (>80%)', email: false, inapp: true },
    { key: 'credit_limit_breach',  label: 'Credit Limit Breached',       email: true,  inapp: true },
  ]);
  const [saved, setSaved] = useState(false);
  const toggle = (key: string, field: 'email' | 'inapp') =>
    setNotifs(ns => ns.map(n => n.key === key ? { ...n, [field]: !n[field] } : n));

  return (
    <div className="card" style={{ maxWidth: 700 }}>
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icons.Bell size={15} color="#059669" /> Notification Preferences</span>
        <button className="btn-primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
      <table className="data-table">
        <thead><tr><th>Event</th><th style={{ textAlign: 'center' }}>Email</th><th style={{ textAlign: 'center' }}>In-App</th></tr></thead>
        <tbody>
          {notifs.map(n => (
            <tr key={n.key}>
              <td style={{ fontWeight: 500 }}>{n.label}</td>
              <td style={{ textAlign: 'center' }}>
                <Toggle checked={n.email} onChange={() => toggle(n.key, 'email')} />
              </td>
              <td style={{ textAlign: 'center' }}>
                <Toggle checked={n.inapp} onChange={() => toggle(n.key, 'inapp')} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: checked ? '#059669' : '#d1d5db', transition: 'background 0.2s', position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  );
}
