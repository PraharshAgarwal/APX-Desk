'use client';

import { useToastStore, ToastItem, ToastType } from '@/hooks/useToast';
import { Icons } from '@/components/ui/Icons';

const COLORS: Record<ToastType, { bg: string; border: string; iconColor: string; bar: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', iconColor: '#16a34a', bar: '#22c55e' },
  error:   { bg: '#fef2f2', border: '#fca5a5', iconColor: '#dc2626', bar: '#ef4444' },
  info:    { bg: '#eff6ff', border: '#93c5fd', iconColor: '#2563eb', bar: '#3b82f6' },
  warning: { bg: '#fffbeb', border: '#fcd34d', iconColor: '#d97706', bar: '#f59e0b' },
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Icons.CheckCircle size={15} color="#16a34a" />,
  error:   <Icons.AlertCircle  size={15} color="#dc2626" />,
  info:    <Icons.AlertCircle  size={15} color="#2563eb" />,
  warning: <Icons.AlertTriangle size={15} color="#d97706" />,
};

function Toast({ toast }: { toast: ToastItem }) {
  const { remove } = useToastStore();
  const c = COLORS[toast.type];

  return (
    <div
      style={{
        position: 'relative',
        minWidth: 280,
        maxWidth: 380,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        padding: '12px 40px 14px 14px',
        animation: 'toast-in 0.22s ease',
        overflow: 'hidden',
      }}
    >
      {/* message row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <span style={{ lineHeight: 1, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center' }}>{ICONS[toast.type]}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1d23', lineHeight: 1.45 }}>
          {toast.message}
        </span>
      </div>

      {/* dismiss button */}
      <button
        onClick={() => remove(toast.id)}
        style={{
          position: 'absolute', top: 8, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 2,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>

      {/* progress bar */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 3, background: '#e5e7eb', borderRadius: '0 0 10px 10px',
        }}
      >
        <div
          style={{
            height: '100%', background: c.bar,
            borderRadius: '0 0 10px 10px',
            animation: 'toast-bar 4s linear forwards',
          }}
        />
      </div>
    </div>
  );
}

export default function Toaster() {
  const { toasts } = useToastStore();

  return (
    <>
      {/* Keyframes injected inline — one-time cost */}
      <style>{`
        @keyframes toast-in  { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes toast-bar { from { width:100%; } to { width:0%; } }
      `}</style>

      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <Toast toast={t} />
          </div>
        ))}
      </div>
    </>
  );
}
