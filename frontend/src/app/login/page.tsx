'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Icons } from '@/components/ui/Icons';

const ROLES = [
  { key: 'admin',             label: 'Admin',           Icon: Icons.Shield,    email: 'admin@fdms.com',     password: 'Admin@123' },
  { key: 'retailer',          label: 'Retailer',        Icon: Icons.Store,     email: 'retailer@fdms.com',  password: 'Retail@123' },
  { key: 'warehouse_manager', label: 'Warehouse Mgr',   Icon: Icons.Warehouse, email: 'warehouse@fdms.com', password: 'Warehouse@123' },
  { key: 'sales_executive',   label: 'Sales Executive', Icon: Icons.Briefcase, email: 'sales@fdms.com',     password: 'Sales@123' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('admin@fdms.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await api.post('/auth/login', { email, password });
      return res.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Login failed.');
    },
  });

  const handleRoleSelect = (role: typeof ROLES[0]) => {
    setSelectedRole(role.key);
    setEmail(role.email);
    setPassword(role.password);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ email, password });
  };

  return (
    <div id="login-screen" style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f4f6f9',
    }}>
      {/* Left — Branding */}
      <div style={{
        flex: '0 0 420px',
        background: 'linear-gradient(160deg, #059669 0%, #047857 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 48px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 44, height: 44, background: 'rgba(255,255,255,0.2)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icons.Package size={22} color="#fff" /></div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800 }}>APX Desk</div>
            <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Distribution Platform</div>
          </div>
        </div>

        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
          Streamline your fertilizer supply chain
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.85, marginBottom: 40 }}>
          Enterprise inventory tracking, order management, financial ledger, and warehouse operations — all in one platform.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {['FEFO batch tracking & expiry alerts', 'Role-based dashboards', 'Real-time order lifecycle'].map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, opacity: 0.9 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="animate-in" style={{ width: 400 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, color: '#1a1d23', marginBottom: 4 }}>
            Sign in
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
            Select a role to auto-fill demo credentials
          </p>

          {/* Role Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
            {ROLES.map((role) => (
              <button
                key={role.key}
                id={`role-btn-${role.key}`}
                onClick={() => handleRoleSelect(role)}
                style={{
                  padding: '12px', borderRadius: 10, textAlign: 'left',
                  border: selectedRole === role.key ? '2px solid #059669' : '1px solid #e5e7eb',
                  background: selectedRole === role.key ? '#ecfdf5' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <role.Icon size={18} color={selectedRole === role.key ? '#047857' : '#9ca3af'} />
                </span>
                <span style={{ fontSize: 13, fontWeight: selectedRole === role.key ? 700 : 500, color: selectedRole === role.key ? '#047857' : '#4b5563' }}>
                  {role.label}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Email</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-input" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Password</label>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="form-input" />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button
              id="login-submit" type="submit" disabled={loginMutation.isPending}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center', opacity: loginMutation.isPending ? 0.7 : 1 }}
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
