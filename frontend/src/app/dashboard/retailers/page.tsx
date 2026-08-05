'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { Icons, IconClipboard, IconPackage } from '@/components/ui/Icons';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';

type DetailTab = 'overview' | 'profile' | 'orders' | 'invoices' | 'ledger';

/* ─────────────────────────── helpers ─────────────────────────── */
const fmt = (n: string | number | null | undefined) =>
  n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fdate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN') : '—';

function FieldRow({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid #f9fafb', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#9ca3af', minWidth: wide ? 180 : 150, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: value ? '#1a1d23' : '#d1d5db' }}>{value || '—'}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '10px 16px', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, color: '#1a1d23' }}>{title}</span>
      </div>
      <div style={{ padding: '8px 16px 12px' }}>{children}</div>
    </div>
  );
}

function LicenceBlock({ title, data }: { title: string; data: Record<string, string> | null | undefined }) {
  const d = data || {};
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[['Licence No.', d.no], ['Issue Date', fdate(d.issued_on)], ['Expiry Date', fdate(d.expires_on)]].map(([l, v]) => (
          <div key={l} style={{ background: '#f8f9fb', borderRadius: 8, padding: '8px 12px', border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: v && v !== '—' ? '#1a1d23' : '#d1d5db' }}>{v || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── main page ───────────────────────────── */
export default function RetailersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: retailersData, isLoading } = useQuery({
    queryKey: ['retailers'],
    queryFn: async () => (await api.get('/businesses')).data.data,
  });

  const retailers: any[] = Array.isArray(retailersData) ? retailersData : [];
  const filtered = retailers.filter((r: any) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.gstin?.toLowerCase().includes(search.toLowerCase())
  );
  const selected = retailers.find((r: any) => r.id === selectedId);

  return (
    <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100vh - 80px)' }}>
      {/* Left Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px 12px 0 0', padding: '14px 16px', borderBottom: 'none' }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#1a1d23', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icons.Store size={15} color="#059669" /> Retailers
          </div>
          <input className="form-input" placeholder="Search by name or GST…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ fontSize: 12, padding: '7px 12px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0 0 12px 12px', borderTop: '1px solid #f3f4f6' }}>
          {isLoading
            ? <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
            : filtered.length === 0
              ? <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No retailers found</div>
              : filtered.map((r: any) => {
                const balance = Number(r.current_balance);
                const creditPct = Number(r.credit_limit) > 0
                  ? Math.min(100, (Math.max(0, balance) / Number(r.credit_limit)) * 100) : 0;
                const isAtRisk = creditPct > 80;
                const isSelected = selectedId === r.id;
                return (
                  <div key={r.id} onClick={() => setSelectedId(r.id)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                      background: isSelected ? '#f0fdf4' : 'transparent',
                      borderLeft: isSelected ? '3px solid #059669' : '3px solid transparent',
                      transition: 'all 0.1s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1d23' }}>{r.name}</div>
                      <span className={`badge ${r.is_active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{r.gstin || 'No GSTIN'}</div>
                    {r.assigned_exec_name && (
                      <div style={{ fontSize: 10, color: '#059669', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.User size={10} color="#059669" /> {r.assigned_exec_name}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Outstanding</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: balance > 0 ? '#dc2626' : '#059669' }}>
                        ₹{Math.abs(balance).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${creditPct}%`, background: isAtRisk ? '#ef4444' : '#10b981', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                      {r.total_orders} orders · {creditPct.toFixed(0)}% credit used
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Right Panel */}
      {selectedId
        ? <RetailerDetail businessId={selectedId} summaryRow={selected} />
        : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600 }}>Select a retailer</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Choose from the list to see full details</div>
          </div>
        )
      }
    </div>
  );
}

/* ── Retailer Detail Panel ─────────────────────────────── */
function RetailerDetail({ businessId, summaryRow }: { businessId: string; summaryRow: any }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { primaryRole } = useAuthStore();
  const isAdmin = primaryRole() === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['retailer-detail', businessId],
    queryFn: async () => (await api.get(`/businesses/${businessId}`)).data.data,
  });

  if (isLoading) return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
      Loading details…
    </div>
  );

  const { profile, balance, orders, invoices, ledger } = data || {};
  if (!profile) return null;

  const creditPct = balance && Number(balance.credit_limit) > 0
    ? Math.min(100, (Math.max(0, Number(balance.current_balance)) / Number(balance.credit_limit)) * 100) : 0;
  const addr = profile.address || {};

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'profile', label: 'Full Profile' },
    { key: 'orders', label: 'Orders' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'ledger', label: 'Ledger' },
  ];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['retailer-detail', businessId] });
    qc.invalidateQueries({ queryKey: ['retailers'] });
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fffe 0%, #f0fdf4 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: '#fff' }}>
              {profile.name?.charAt(0) || 'R'}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: '#1a1d23' }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {profile.type} · {profile.gstin || 'No GSTIN'} · {addr.city || profile.district || '—'}
                {profile.assigned_exec_name && <span style={{ marginLeft: 8, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icons.User size={11} color="#059669" /> {profile.assigned_exec_name}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && (
              <button onClick={() => setShowEditModal(true)}
                style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: 7, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icons.Edit size={12} color="#059669" /> Edit Profile
              </button>
            )}
            <button onClick={() => setShowCreditModal(true)}
              style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ede9fe', padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>
              Credit Limit
            </button>
            <span className={`badge ${profile.is_active ? 'badge-green' : 'badge-red'}`}>{profile.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {balance && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
            {[
              { label: 'Credit Limit', value: fmt(balance.credit_limit), color: '#1a1d23' },
              { label: 'Outstanding', value: fmt(balance.current_balance), color: Number(balance.current_balance) > 0 ? '#dc2626' : '#059669' },
              { label: 'Total Debits', value: fmt(balance.total_debits), color: '#dc2626' },
              { label: 'Total Credits', value: fmt(balance.total_credits), color: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
        {balance && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
              <span>Credit utilization</span>
              <span style={{ fontWeight: 700, color: creditPct > 80 ? '#dc2626' : '#059669' }}>{creditPct.toFixed(0)}%</span>
            </div>
            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${creditPct}%`, background: creditPct > 80 ? '#ef4444' : creditPct > 60 ? '#f59e0b' : '#10b981', borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', padding: '0 16px', background: '#fafbfc' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none',
            color: tab === t.key ? '#059669' : '#6b7280',
            borderBottom: tab === t.key ? '2px solid #059669' : '2px solid transparent',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {tab === 'overview' && <OverviewTab profile={profile} balance={balance} summaryRow={summaryRow} />}
        {tab === 'profile' && <ProfileTab profile={profile} />}
        {tab === 'orders' && <OrdersTab orders={orders || []} />}
        {tab === 'invoices' && <InvoicesTab invoices={invoices || []} />}
        {tab === 'ledger' && <LedgerTab ledger={ledger || []} />}
      </div>

      {showCreditModal && (
        <CreditModal businessId={businessId} currentLimit={Number(balance?.credit_limit || 0)}
          onClose={() => { setShowCreditModal(false); invalidate(); }} />
      )}
      {showEditModal && (
        <EditProfileModal profile={profile} businessId={businessId}
          onClose={() => { setShowEditModal(false); invalidate(); }} />
      )}
    </div>
  );
}

/* ── Overview Tab ──────────────────────────────────────── */
function OverviewTab({ profile, balance, summaryRow }: any) {
  const addr = profile.address || {};
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 12 }}>Business Profile</div>
        {([
          ['Business Name', profile.name],
          ['Type', profile.type],
          ['GSTIN', profile.gstin],
          ['PAN', profile.pan_number],
          ['Phone', profile.phone],
          ['Alt. Phone', profile.alternate_phone],
          ['Email', profile.email],
          ['District', profile.district],
          ['City', `${addr.city || ''}${addr.state ? ', ' + addr.state : ''}`],
          ['PIN Code', addr.pin],
          ['IMFS ID (Wholesaler)', profile.imfs_id_wholesaler],
          ['IMFS ID (Retailer)', profile.imfs_id_retailer],
          ['Assigned Exec', profile.assigned_exec_name],
          ['Since', new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })],
        ] as [string, string | null | undefined][]).map(([label, value]) => (
          <FieldRow key={label} label={label} value={value || undefined} wide />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 12 }}>Primary Contact</div>
          {([
            ['Name', `${profile.first_name || ''} ${profile.last_name || ''}`.trim()],
            ['Email', profile.user_email],
            ['Phone', profile.user_phone],
          ] as [string, string | null | undefined][]).map(([label, value]) => (
            <FieldRow key={label} label={label} value={value || undefined} />
          ))}
        </div>
        {summaryRow && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 12 }}>Order Summary</div>
            {[['Total Orders', summaryRow.total_orders], ['Pending', summaryRow.pending_orders], ['Delivered', summaryRow.delivered_orders]].map(([label, value]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d23' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Full Profile Tab ──────────────────────────────────── */
function ProfileTab({ profile }: { profile: any }) {
  const t = profile.turnover || {};
  const est = profile.business_estimate || {};

  const ESTIMATES: [string, string, string][] = [
    ['bio_organic', 'Bio / Organic Fertilizer', 'MT'],
    ['ssp', 'S.S.P. (All Grade)', 'MT'],
    ['specialty_liquid', 'Speciality Liquid Fertilizer', 'MT'],
    ['water_soluble', 'Water Soluble Fertilizer', 'MT'],
    ['mix_micro', 'Mix Micro Nutrient', 'MT'],
    ['pesticide_lakh', 'Pesticide', 'Lakh ₹'],
    ['npk_complex', 'NPK Complex Fertilizer', 'MT'],
    ['urea', 'Urea', 'MT'],
    ['dap', 'DAP', 'MT'],
    ['mop', 'MOP', 'MT'],
    ['ammonium_sulphate', 'Ammonium Sulphate', 'MT'],
    ['seed_lakh', 'Seed', 'Lakh ₹'],
  ];

  return (
    <div>
      {/* Business Details */}
      <SectionCard title="Business Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <FieldRow label="PAN Number" value={profile.pan_number} />
          <FieldRow label="GST Reg. No." value={profile.gstin} />
          <FieldRow label="IMFS ID (Wholesaler)" value={profile.imfs_id_wholesaler} />
          <FieldRow label="IMFS ID (Retailer)" value={profile.imfs_id_retailer} />
        </div>

        {/* Turnover table */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Annual Turnover</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[['2025–26', t.y2526], ['2024–25', t.y2425], ['2023–24', t.y2324]].map(([yr, val]) => (
              <div key={yr} style={{ background: '#f8f9fb', borderRadius: 8, padding: '10px 14px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{yr}</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 800, color: val ? '#1a1d23' : '#d1d5db' }}>
                  {val ? `₹${Number(val).toLocaleString('en-IN')}` : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Firm Details */}
      <SectionCard title="Firm Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <FieldRow label="Mobile" value={profile.phone} />
          <FieldRow label="Alternate Mobile" value={profile.alternate_phone} />
          <FieldRow label="Email" value={profile.email} />
          <FieldRow label="District" value={profile.district} />
          <FieldRow label="Address" value={profile.address?.street} />
          <FieldRow label="City / State" value={[profile.address?.city, profile.address?.state].filter(Boolean).join(', ')} />
          <FieldRow label="PIN Code" value={profile.address?.pin} />
        </div>
      </SectionCard>

      {/* Licence Details */}
      <SectionCard title="Licence Details">
        <LicenceBlock title="Fertilizer Licence" data={profile.fertilizer_licence} />
        <LicenceBlock title="Pesticide Licence" data={profile.pesticide_licence} />
        <LicenceBlock title="Seed Licence" data={profile.seed_licence} />
      </SectionCard>

      {/* Security Deposit */}
      <SectionCard title="Security Deposit Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <FieldRow label="Bank Name" value={profile.security_bank_name} />
          <FieldRow label="Amount" value={profile.security_amount ? fmt(profile.security_amount) : undefined} />
          <FieldRow label="Cheque / DD No." value={profile.security_cheque_dd_no} />
          <FieldRow label="RTGS (UTR) No." value={profile.security_rtgs_utr} />
          <FieldRow label="Deposit Date" value={fdate(profile.security_deposit_date)} />
          <FieldRow
            label="Credit Limit"
            value={profile.credit_limit ? fmt(profile.credit_limit) : undefined}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Blank Cheque Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
            <FieldRow label="Bank Name" value={profile.blank_cheque_bank} />
            <FieldRow label="Cheque No. 1" value={profile.blank_cheque_no1} />
            <FieldRow label="Cheque No. 2" value={profile.blank_cheque_no2} />
          </div>
        </div>
      </SectionCard>

      {/* Business Estimates */}
      <SectionCard title="Business Estimate">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {ESTIMATES.map(([key, label, unit]) => (
            <div key={key} style={{ background: '#f8f9fb', borderRadius: 8, padding: '10px 14px', border: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: est[key] ? '#1a1d23' : '#d1d5db' }}>
                {est[key] != null ? Number(est[key]).toLocaleString('en-IN') : '—'}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{unit}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Assigned Sales Executive */}
      {profile.assigned_exec_name && (
        <SectionCard title="Assigned Sales Executive">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>
              {profile.assigned_exec_name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1d23' }}>{profile.assigned_exec_name}</div>
              {profile.assigned_exec_email && <div style={{ fontSize: 12, color: '#6b7280' }}>{profile.assigned_exec_email}</div>}
              {profile.assigned_exec_phone && <div style={{ fontSize: 12, color: '#6b7280' }}>{profile.assigned_exec_phone}</div>}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ── Edit Profile Modal (admin only) ─────────────────── */
function EditProfileModal({ profile, businessId, onClose }: { profile: any; businessId: string; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: execsData } = useQuery({
    queryKey: ['sales-executives'],
    queryFn: async () => (await api.get('/businesses/sales-executives')).data.data,
  });
  const execs: any[] = execsData || [];

  // Scalar fields
  const [f, setF] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    alternate_phone: profile.alternate_phone || '',
    email: profile.email || '',
    district: profile.district || '',
    gstin: profile.gstin || '',
    pan_number: profile.pan_number || '',
    imfs_id_wholesaler: profile.imfs_id_wholesaler || '',
    imfs_id_retailer: profile.imfs_id_retailer || '',
    assigned_sales_executive_id: profile.assigned_sales_executive_id || '',
    security_bank_name: profile.security_bank_name || '',
    security_amount: profile.security_amount || '',
    security_cheque_dd_no: profile.security_cheque_dd_no || '',
    security_rtgs_utr: profile.security_rtgs_utr || '',
    security_deposit_date: profile.security_deposit_date ? profile.security_deposit_date.substring(0, 10) : '',
    blank_cheque_bank: profile.blank_cheque_bank || '',
    blank_cheque_no1: profile.blank_cheque_no1 || '',
    blank_cheque_no2: profile.blank_cheque_no2 || '',
  });

  // Address
  const addr0 = profile.address || {};
  const [addr, setAddr] = useState({ street: addr0.street || '', city: addr0.city || '', state: addr0.state || '', pin: addr0.pin || '' });

  // Turnover
  const t0 = profile.turnover || {};
  const [turnover, setTurnover] = useState({ y2526: t0.y2526 || '', y2425: t0.y2425 || '', y2324: t0.y2324 || '' });

  // Licences
  const fl0 = profile.fertilizer_licence || {};
  const pl0 = profile.pesticide_licence || {};
  const sl0 = profile.seed_licence || {};
  const [fertLic, setFertLic] = useState({ no: fl0.no || '', issued_on: fl0.issued_on?.substring(0, 10) || '', expires_on: fl0.expires_on?.substring(0, 10) || '' });
  const [pestLic, setPestLic] = useState({ no: pl0.no || '', issued_on: pl0.issued_on?.substring(0, 10) || '', expires_on: pl0.expires_on?.substring(0, 10) || '' });
  const [seedLic, setSeedLic] = useState({ no: sl0.no || '', issued_on: sl0.issued_on?.substring(0, 10) || '', expires_on: sl0.expires_on?.substring(0, 10) || '' });

  // Business estimates
  const est0 = profile.business_estimate || {};
  const EST_KEYS = ['bio_organic', 'ssp', 'specialty_liquid', 'water_soluble', 'mix_micro', 'pesticide_lakh', 'npk_complex', 'urea', 'dap', 'mop', 'ammonium_sulphate', 'seed_lakh'];
  const EST_LABELS: Record<string, string> = {
    bio_organic: 'Bio/Organic Fertilizer', ssp: 'S.S.P.', specialty_liquid: 'Speciality Liquid Fert.',
    water_soluble: 'Water Soluble Fert.', mix_micro: 'Mix Micro Nutrient', pesticide_lakh: 'Pesticide (Lakh ₹)',
    npk_complex: 'NPK Complex', urea: 'Urea', dap: 'DAP', mop: 'MOP', ammonium_sulphate: 'Ammonium Sulphate', seed_lakh: 'Seed (Lakh ₹)',
  };
  const [est, setEst] = useState<Record<string, string>>(
    Object.fromEntries(EST_KEYS.map(k => [k, est0[k] != null ? String(est0[k]) : '']))
  );

  const mutation = useMutation({
    mutationFn: async () => api.patch(`/businesses/${businessId}`, {
      ...f,
      security_amount: f.security_amount ? Number(f.security_amount) : null,
      assigned_sales_executive_id: f.assigned_sales_executive_id || null,
      address: addr,
      turnover: { y2526: turnover.y2526 ? Number(turnover.y2526) : null, y2425: turnover.y2425 ? Number(turnover.y2425) : null, y2324: turnover.y2324 ? Number(turnover.y2324) : null },
      fertilizer_licence: fertLic,
      pesticide_licence: pestLic,
      seed_licence: seedLic,
      business_estimate: Object.fromEntries(EST_KEYS.map(k => [k, est[k] ? Number(est[k]) : null])),
    }),
    onSuccess: () => { toast.success('Profile saved'); onClose(); },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    },
  });

  const sf = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const inputStyle = { width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

  const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );

  const LicForm = ({ title, val, setVal }: { title: string; val: typeof fertLic; setVal: (v: typeof fertLic) => void }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Field label="Licence No." value={val.no} onChange={v => setVal({ ...val, no: v })} />
        <Field label="Issue Date" value={val.issued_on} onChange={v => setVal({ ...val, issued_on: v })} type="date" />
        <Field label="Expiry Date" value={val.expires_on} onChange={v => setVal({ ...val, expires_on: v })} type="date" />
      </div>
    </div>
  );

  const [section, setSection] = useState<'firm' | 'business' | 'licences' | 'security' | 'estimates'>('firm');
  const SECTIONS = [['firm', 'Firm Details'], ['business', 'Business'], ['licences', 'Licences'], ['security', 'Security Deposit'], ['estimates', 'Estimates']] as const;

  return (
    <Modal title={`Edit Profile — ${profile.name}`} onClose={onClose} size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }>
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
        {SECTIONS.map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: 'none',
            background: section === key ? '#059669' : '#f3f4f6',
            color: section === key ? '#fff' : '#6b7280',
          }}>{label}</button>
        ))}
      </div>

      {section === 'firm' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Firm Name" value={f.name} onChange={v => sf('name', v)} />
          <Field label="District" value={f.district} onChange={v => sf('district', v)} />
          <Field label="Mobile No." value={f.phone} onChange={v => sf('phone', v)} />
          <Field label="Alternate Mobile" value={f.alternate_phone} onChange={v => sf('alternate_phone', v)} />
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Email" value={f.email} onChange={v => sf('email', v)} type="email" />
          </div>
          <Field label="Street Address" value={addr.street} onChange={v => setAddr(a => ({ ...a, street: v }))} />
          <Field label="City" value={addr.city} onChange={v => setAddr(a => ({ ...a, city: v }))} />
          <Field label="State" value={addr.state} onChange={v => setAddr(a => ({ ...a, state: v }))} />
          <Field label="PIN Code" value={addr.pin} onChange={v => setAddr(a => ({ ...a, pin: v }))} />
          <div style={{ gridColumn: '1/-1', marginBottom: 10 }}>
            <label style={labelStyle}>Assigned Sales Executive</label>
            <select style={{ ...inputStyle }} value={f.assigned_sales_executive_id} onChange={e => sf('assigned_sales_executive_id', e.target.value)}>
              <option value="">— None —</option>
              {execs.map((e: any) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.email})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {section === 'business' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="PAN Number" value={f.pan_number} onChange={v => sf('pan_number', v)} />
          <Field label="GST Reg. No." value={f.gstin} onChange={v => sf('gstin', v)} />
          <Field label="IMFS ID (Wholesaler)" value={f.imfs_id_wholesaler} onChange={v => sf('imfs_id_wholesaler', v)} />
          <Field label="IMFS ID (Retailer)" value={f.imfs_id_retailer} onChange={v => sf('imfs_id_retailer', v)} />
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 8 }}>Turnover (₹)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Field label="2025–26" value={turnover.y2526} onChange={v => setTurnover(t => ({ ...t, y2526: v }))} type="number" />
              <Field label="2024–25" value={turnover.y2425} onChange={v => setTurnover(t => ({ ...t, y2425: v }))} type="number" />
              <Field label="2023–24" value={turnover.y2324} onChange={v => setTurnover(t => ({ ...t, y2324: v }))} type="number" />
            </div>
          </div>
        </div>
      )}

      {section === 'licences' && (
        <div>
          <LicForm title="Fertilizer Licence" val={fertLic} setVal={setFertLic} />
          <LicForm title="Pesticide Licence" val={pestLic} setVal={setPestLic} />
          <LicForm title="Seed Licence" val={seedLic} setVal={setSeedLic} />
        </div>
      )}

      {section === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Bank Name" value={f.security_bank_name} onChange={v => sf('security_bank_name', v)} />
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Amount (₹) — Security Deposit</label>
            <input style={inputStyle} type="number" min={0} value={String(f.security_amount)}
              onChange={e => sf('security_amount', e.target.value)} />
          </div>
          {/* Auto-derived credit limit */}
          <div style={{ marginBottom: 10, gridColumn: '1/-1' }}>
            <label style={labelStyle}>Credit Limit (auto = 5 × Security Deposit)</label>
            <div style={{
              padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 6, fontSize: 14, fontWeight: 700,
              color: f.security_amount ? '#059669' : '#9ca3af',
            }}>
              {f.security_amount && Number(f.security_amount) > 0
                ? `₹${(Number(f.security_amount) * 5).toLocaleString('en-IN')}`
                : '— enter deposit amount above'}
            </div>
          </div>
          <Field label="Cheque / DD No." value={f.security_cheque_dd_no} onChange={v => sf('security_cheque_dd_no', v)} />
          <Field label="RTGS (UTR) No." value={f.security_rtgs_utr} onChange={v => sf('security_rtgs_utr', v)} />
          <Field label="Deposit Date" value={f.security_deposit_date} onChange={v => sf('security_deposit_date', v)} type="date" />
          <div />
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 8 }}>Blank Cheque Details</div>
          </div>
          <Field label="Bank Name" value={f.blank_cheque_bank} onChange={v => sf('blank_cheque_bank', v)} />
          <Field label="Cheque No. 1" value={f.blank_cheque_no1} onChange={v => sf('blank_cheque_no1', v)} />
          <Field label="Cheque No. 2" value={f.blank_cheque_no2} onChange={v => sf('blank_cheque_no2', v)} />
        </div>
      )}


      {section === 'estimates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {EST_KEYS.map(k => (
            <Field key={k} label={EST_LABELS[k]} value={est[k]} onChange={v => setEst(e => ({ ...e, [k]: v }))} type="number" />
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ── Orders Tab ────────────────────────────────────────── */
function OrderAccordionRow({ order, expanded, onToggle }: { order: any; expanded: boolean; onToggle: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['order-detail', order.id],
    queryFn: async () => (await api.get(`/orders/${order.id}`)).data.data,
    enabled: expanded,
    staleTime: 30000,
  });

  const items: any[] = detail?.items || [];
  const history: any[] = detail?.statusHistory || [];
  const STATUS_COLORS: Record<string, string> = {
    pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-blue',
    dispatched: 'badge-stone', delivered: 'badge-green', cancelled: 'badge-red',
  };

  return (
    <>
      <tr onClick={onToggle}
        style={{ cursor: 'pointer', background: expanded ? '#f0fdf4' : undefined, transition: 'background 0.15s' }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#f9fafb'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = ''; }}>
        <td style={{ width: 28, paddingRight: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: expanded ? '#dcfce7' : '#f3f4f6', transition: 'transform 0.2s, background 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2L6.5 5L3.5 8" stroke={expanded ? '#16a34a' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </td>
        <td><strong style={{ color: '#059669' }}>{order.order_number}</strong></td>
        <td><span className={`badge ${STATUS_COLORS[order.status] || 'badge-stone'}`} style={{ textTransform: 'capitalize' }}>{order.status}</span></td>
        <td><span className="badge badge-stone">{order.item_count} items</span></td>
        <td><strong>₹{Number(order.total_amount).toLocaleString('en-IN')}</strong></td>
        <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, borderTop: 'none' }}>
            <div style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0', borderBottom: '2px solid #bbf7d0', padding: '14px 20px 16px 48px' }}>
              {isLoading ? <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading…</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Line Items</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.6fr 1fr', gap: 10, paddingBottom: 6, borderBottom: '1px solid #bbf7d0', marginBottom: 4 }}>
                      {['Product', 'SKU', 'Qty', 'Unit Price', 'Line Total'].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</div>
                      ))}
                    </div>
                    {items.length === 0 ? <div style={{ fontSize: 13, color: '#9ca3af' }}>No items.</div>
                      : items.map((item: any, idx: number) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.6fr 1fr', gap: 10, padding: '7px 0', borderBottom: idx < items.length - 1 ? '1px solid #dcfce7' : 'none', alignItems: 'center' }}>
                          <div><div style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{item.unit}</div></div>
                          <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 5px', borderRadius: 4 }}>{item.sku || '—'}</code>
                          <div style={{ fontWeight: 700 }}>{Number(item.quantity).toFixed(0)}</div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</div>
                          <div style={{ fontWeight: 700, color: '#059669' }}>₹{Number(item.line_total).toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    {items.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #bbf7d0', display: 'flex', gap: 20, fontSize: 12 }}>
                        <span style={{ color: '#6b7280' }}>{items.length} line{items.length !== 1 ? 's' : ''}</span>
                        <span>Total: <strong style={{ color: '#059669', fontSize: 14 }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</strong></span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Status History</div>
                    {history.length === 0 ? <div style={{ fontSize: 13, color: '#9ca3af' }}>No history.</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {history.map((h: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 2, background: h.to_status === 'delivered' ? '#16a34a' : h.to_status === 'cancelled' ? '#dc2626' : '#059669' }} />
                              {idx < history.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 14, background: '#d1fae5', marginTop: 2 }} />}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{h.to_status}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(h.changed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th style={{ width: 28 }} /><th>Order #</th><th>Status</th><th>Items</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          {orders.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No orders yet</td></tr>
            : orders.map((o: any) => (
              <OrderAccordionRow key={o.id} order={o} expanded={expandedId === o.id} onToggle={() => setExpandedId(p => p === o.id ? null : o.id)} />
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Invoices Tab ────────────────────────────────────── */
function InvoicesTab({ invoices }: { invoices: any[] }) {
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>Invoice #</th><th>Total</th><th>Paid</th><th>Due Date</th><th>Status</th></tr></thead>
        <tbody>
          {invoices.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No invoices yet</td></tr>
            : invoices.map((inv: any) => {
              const isPaid = Number(inv.paid_amount) >= Number(inv.total_amount);
              return (
                <tr key={inv.id}>
                  <td><strong style={{ color: '#059669', fontSize: 12 }}>{inv.invoice_number}</strong></td>
                  <td><strong>₹{Number(inv.total_amount).toLocaleString('en-IN')}</strong></td>
                  <td style={{ color: isPaid ? '#059669' : '#dc2626', fontWeight: 600 }}>₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td><span className={`badge ${inv.is_void ? 'badge-stone' : isPaid ? 'badge-green' : 'badge-red'}`}>{inv.is_void ? 'Void' : isPaid ? 'Paid' : 'Unpaid'}</span></td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Ledger Tab ────────────────────────────────────────── */
function LedgerTab({ ledger }: { ledger: any[] }) {
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>
          {ledger.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No transactions</td></tr>
            : ledger.map((e: any) => (
              <tr key={e.id}>
                <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{ fontSize: 13 }}>{e.description}</td>
                <td><span className={`badge ${e.type === 'credit' ? 'badge-green' : 'badge-red'}`}>{e.type}</span></td>
                <td><strong style={{ color: e.type === 'credit' ? '#059669' : '#dc2626' }}>{e.type === 'credit' ? '+' : '−'}₹{Number(e.amount).toLocaleString('en-IN')}</strong></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Credit Limit Modal ─────────────────────────────── */
function CreditModal({ businessId, currentLimit, onClose }: { businessId: string; currentLimit: number; onClose: () => void }) {
  const [limit, setLimit] = useState(String(currentLimit));
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async () => api.patch(`/finance/credit-limits/${businessId}`, { creditLimit: Number(limit) }),
    onSuccess: () => { toast.success('Credit limit updated'); onClose(); },
    onError: () => toast.error('Failed to update credit limit'),
  });
  return (
    <Modal title="Edit Credit Limit" onClose={onClose} size="sm"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Update'}</button></>}>
      <div className="field-group">
        <label className="field-label">New Credit Limit (₹)</label>
        <input className="form-input" type="number" min={0} value={limit} onChange={e => setLimit(e.target.value)} autoFocus />
        <div className="field-hint">Current: ₹{currentLimit.toLocaleString('en-IN')}</div>
      </div>
    </Modal>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = { pending: 'badge-amber', confirmed: 'badge-blue', processing: 'badge-blue', dispatched: 'badge-stone', delivered: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${m[status] || 'badge-stone'}`}>{status}</span>;
}
