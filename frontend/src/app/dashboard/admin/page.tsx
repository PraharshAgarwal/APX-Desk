'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { Icons, IconX } from '@/components/ui/Icons';
import { useToast } from '@/hooks/useToast';

export default function AdminPage() {
  const qc = useQueryClient();
  const [showUserModal, setShowUserModal] = useState(false);
  const [tab, setTab] = useState<'users' | 'audit'>('users');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });
  const [auditCategory, setAuditCategory] = useState('');
  const [auditYear, setAuditYear]         = useState('');
  const [auditMonth, setAuditMonth]       = useState('');

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs', auditCategory, auditYear, auditMonth],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '100' });
      if (auditCategory) p.set('entityType', auditCategory);
      if (auditYear)     p.set('year', auditYear);
      if (auditMonth)    p.set('month', auditMonth);
      return (await api.get(`/users/audit-logs?${p}`)).data;
    },
    enabled: tab === 'audit',
  });

  const toast = useToast();

  const deactivateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/users/${id}`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${vars.status === 'active' ? 'activated' : 'deactivated'}`);
    },
    onError: () => toast.error('Failed to update user status'),
  });

  const users: any[] = usersData?.data || [];

  return (
    <div className="animate-in">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f4f6f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['users', 'audit'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#059669' : '#6b7280',
            border: tab === t ? '1px solid #e5e7eb' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{t === 'users' ? 'Users & Roles' : 'Audit Logs'}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          {/* Role filter bar */}
          {(() => {
            const ROLES = [
              { key: '',                  label: 'All Users',         Icon: Icons.Users,     color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', active: '#1a1d23' },
              { key: 'admin',             label: 'Admin',             Icon: Icons.Shield,    color: '#7c3aed', bg: '#f5f3ff', border: '#ede9fe', active: '#7c3aed' },
              { key: 'sales_executive',   label: 'Sales Executive',   Icon: Icons.Briefcase, color: '#2563eb', bg: '#eff6ff', border: '#dbeafe', active: '#2563eb' },
              { key: 'warehouse_manager', label: 'Warehouse Manager', Icon: Icons.Building,  color: '#d97706', bg: '#fffbeb', border: '#fde68a', active: '#d97706' },
              { key: 'retailer',          label: 'Retailer',          Icon: Icons.Store,     color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', active: '#059669' },
            ];
            const countFor = (role: string) => role === '' ? users.length : users.filter((u: any) => (u.roles || []).includes(role)).length;
            const filteredUsers = roleFilter === '' ? users : users.filter((u: any) => (u.roles || []).includes(roleFilter));
            const activeRole = ROLES.find(r => r.key === roleFilter) || ROLES[0];

            return (
              <>
                {/* Role pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {ROLES.map(r => {
                    const isActive = roleFilter === r.key;
                    const cnt = countFor(r.key);
                    return (
                      <button key={r.key} onClick={() => setRoleFilter(r.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: isActive ? r.bg : '#fff',
                          color: isActive ? r.active : '#6b7280',
                          border: `1.5px solid ${isActive ? r.border : '#e5e7eb'}`,
                          boxShadow: isActive ? `0 0 0 3px ${r.border}` : 'none',
                        }}>
                        <span style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><r.Icon size={15} color={isActive ? r.active : r.color} /></span>
                        {r.label}
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          background: isActive ? r.active : '#e5e7eb',
                          color: isActive ? '#fff' : '#6b7280',
                          borderRadius: 12, padding: '1px 8px', marginLeft: 2,
                        }}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Users card */}
                <div className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'inline-flex' }}><activeRole.Icon size={18} color={activeRole.color} /></span>
                      <span className="card-title">
                        {activeRole.label}
                        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>
                          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </div>
                    <button className="btn-primary" id="add-user-btn" onClick={() => setShowUserModal(true)}>+ Add User</button>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Business</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><activeRole.Icon size={28} color="#d1d5db" /></div>
                          No {activeRole.label.toLowerCase()} users found
                        </td></tr>
                      ) : filteredUsers.map((u: any) => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: activeRole.bg, border: `1px solid ${activeRole.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: activeRole.active, flexShrink: 0 }}>
                                {(u.first_name?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.first_name} {u.last_name}</div>
                                {u.phone && <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ color: '#6b7280', fontSize: 13 }}>{u.email}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {(u.roles || []).filter((r: string) => r).map((r: string) => (
                                <span key={r} className="badge badge-violet" style={{ cursor: 'pointer' }}
                                  onClick={() => setRoleFilter(r)}>{r.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ color: '#6b7280', fontSize: 13 }}>{u.business_name || '—'}</td>
                          <td><span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span></td>
                          <td>
                            <button
                              onClick={() => deactivateMutation.mutate({ id: u.id, status: u.status === 'active' ? 'inactive' : 'active' })}
                              style={{
                                fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                                background: u.status === 'active' ? '#fef2f2' : '#ecfdf5',
                                color: u.status === 'active' ? '#dc2626' : '#059669',
                                border: u.status === 'active' ? '1px solid #fecaca' : '1px solid #d1fae5',
                              }}>
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {tab === 'audit' && (
        <div>
          {/* Audit filter bar */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Filter:</span>

            {/* Category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Category</label>
              <select value={auditCategory} onChange={e => setAuditCategory(e.target.value)}
                style={{ padding: '6px 28px 6px 10px', borderRadius: 8, fontSize: 13, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', appearance: 'none' as any, color: '#374151', minWidth: 160, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                <option value="">All categories</option>
                {['inventory_batch','inventory_adjustment','order','grn','pick','user'].map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Year</label>
              <select value={auditYear} onChange={e => setAuditYear(e.target.value)}
                style={{ padding: '6px 28px 6px 10px', borderRadius: 8, fontSize: 13, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', appearance: 'none' as any, color: '#374151', minWidth: 100, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                <option value="">Any year</option>
                {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Month */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Month</label>
              <select value={auditMonth} onChange={e => setAuditMonth(e.target.value)}
                style={{ padding: '6px 28px 6px 10px', borderRadius: 8, fontSize: 13, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', appearance: 'none' as any, color: '#374151', minWidth: 130, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                <option value="">Any month</option>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>

            {(auditCategory || auditYear || auditMonth) && (
                <button onClick={() => { setAuditCategory(''); setAuditYear(''); setAuditMonth(''); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                  <IconX size={9} strokeWidth={2} /> Clear
                </button>
            )}

            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
              {auditLoading ? 'Loading…' : `${(auditData?.data || []).length} entries${auditData?.meta?.total ? ` of ${auditData.meta.total}` : ''}`}
            </span>
          </div>

          {/* Audit log table */}
          <div className="card">
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>Audit Logs</span>
              {(auditCategory || auditYear || auditMonth) && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {auditCategory && <span className="badge badge-violet">{auditCategory.replace(/_/g, ' ')}</span>}
                  {auditYear && <span className="badge badge-blue">{auditYear}</span>}
                  {auditMonth && <span className="badge badge-stone">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(auditMonth)-1]}</span>}
                </div>
              )}
            </div>
            {auditLoading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading audit logs…</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Category</th>
                    <th>Entity ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditData?.data || []).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icons.Clipboard size={28} color="#d1d5db" /></div>
                      No audit logs match these filters
                    </td></tr>
                  ) : (auditData?.data || []).map((log: any) => {
                    const CAT_COLORS: Record<string, string> = {
                      inventory_batch: 'badge-blue', inventory_adjustment: 'badge-amber',
                      order: 'badge-green', grn: 'badge-violet', pick: 'badge-stone', user: 'badge-red',
                    };
                    const ACTION_ICONS: Record<string, React.ReactNode> = {
                      created:  <Icons.Plus size={14} color="#059669" />,
                      updated:  <Icons.Edit size={14} color="#2563eb" />,
                      deleted:  <Icons.Trash size={14} color="#dc2626" />,
                      adjusted: <Icons.Scale size={14} color="#d97706" />,
                    };
                    const verb = log.action?.split('.')[1] || '';
                    const actionIcon = ACTION_ICONS[verb] || <Icons.Wrench size={14} color="#9ca3af" />;
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1d23' }}>
                            {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{log.user_name || <span style={{ color: '#9ca3af' }}>System</span>}</div>
                          {log.ip_address && <div style={{ fontSize: 11, color: '#9ca3af' }}>{log.ip_address}</div>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{actionIcon}</span>
                            <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 8px', borderRadius: 5, color: '#374151' }}>{log.action}</code>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${CAT_COLORS[log.entity_type] || 'badge-stone'}`}>
                            {log.entity_type?.replace(/_/g, ' ') || '—'}
                          </span>
                        </td>
                        <td>
                          {log.entity_id
                            ? <code style={{ fontSize: 11, color: '#6b7280' }}>{log.entity_id.slice(0, 8)}…</code>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showUserModal && <CreateUserModal onClose={() => { setShowUserModal(false); qc.invalidateQueries({ queryKey: ['users'] }); }} />}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', roles: ['retailer'], businessId: '' });
  const { data: bizData } = useQuery({
    queryKey: ['businesses-list'],
    queryFn: async () => (await api.get('/businesses')).data.data,
  });
  const businesses: any[] = Array.isArray(bizData) ? bizData : [];

  const toast = useToast();

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/users', form)).data,
    onSuccess: () => { toast.success('User created successfully'); onClose(); },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user');
    },
  });

  const ROLE_OPTIONS = ['admin', 'retailer', 'warehouse_manager', 'sales_executive'];
  const toggleRole = (r: string) => setForm(f => ({
    ...f, roles: f.roles.includes(r) ? f.roles.filter(x => x !== r) : [...f.roles, r],
  }));

  return (
    <Modal title="Create User" onClose={onClose} size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mutation.mutate()}
            disabled={!form.email || !form.password || !form.firstName || form.roles.length === 0 || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create User'}
          </button>
        </>
      }>
      <div className="grid-2">
        <div className="field-group">
          <label className="field-label">First Name</label>
          <input className="form-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Rajan" />
        </div>
        <div className="field-group">
          <label className="field-label">Last Name</label>
          <input className="form-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Sharma" />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Email</label>
        <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@fdms.com" />
      </div>
      <div className="grid-2">
        <div className="field-group">
          <label className="field-label">Password</label>
          <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars" />
        </div>
        <div className="field-group">
          <label className="field-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98…" />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Business (optional)</label>
        <select className="form-input" value={form.businessId} onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))}>
          <option value="">No business</option>
          {businesses.map((b: any) => <option key={b.business_id} value={b.business_id}>{b.business_name}</option>)}
        </select>
      </div>
      <div className="field-group">
        <label className="field-label">Roles</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {ROLE_OPTIONS.map(r => (
            <button key={r} onClick={() => toggleRole(r)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: form.roles.includes(r) ? '1px solid #059669' : '1px solid #e5e7eb',
              background: form.roles.includes(r) ? '#ecfdf5' : '#fff',
              color: form.roles.includes(r) ? '#059669' : '#6b7280',
            }}>{r.replace('_', ' ')}</button>
          ))}
        </div>
      </div>
      {mutation.isError && <div className="field-error">Failed. Email may already exist.</div>}
    </Modal>
  );
}
