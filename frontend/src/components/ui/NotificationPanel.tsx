'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Icons } from '@/components/ui/Icons';

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => (await api.get('/notifications/unread-count')).data.data,
    refetchInterval: 30000,
  });

  const { data: listData } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: async () => (await api.get('/notifications')).data.data,
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications-count'] }); qc.invalidateQueries({ queryKey: ['notifications-list'] }); },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications-count'] }); qc.invalidateQueries({ queryKey: ['notifications-list'] }); },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = notifData?.count || 0;
  const notifications: any[] = listData || [];

  const NOTIF_ICONS: Record<string, React.ReactNode> = {
    order_placed:          <Icons.Orders size={18} color="#2563eb" />,
    order_confirmed:       <Icons.CheckCircle size={18} color="#059669" />,
    order_dispatched:      <Icons.Truck size={18} color="#d97706" />,
    order_delivered:       <Icons.Package size={18} color="#059669" />,
    payment_received:      <Icons.Finance size={18} color="#7c3aed" />,
    low_stock:             <Icons.AlertTriangle size={18} color="#dc2626" />,
    expiry_warning:        <Icons.Clock size={18} color="#f59e0b" />,
    credit_limit_warning:  <Icons.Bell size={18} color="#ef4444" />,
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id="notifications-btn"
        onClick={() => setOpen(!open)}
        style={{
          width: 36, height: 36, borderRadius: 8,
          border: '1px solid #e5e7eb', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <Icons.Bell size={16} color="#6b7280" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 8, height: 8, background: '#ef4444',
            borderRadius: '50%', border: '1.5px solid #fff',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44, width: 360,
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          zIndex: 500, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: '#1a1d23' }}>
              Notifications {unread > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11, marginLeft: 6 }}>{unread}</span>}
            </span>
            {unread > 0 && (
              <button onClick={() => markAllMutation.mutate()}
                style={{ fontSize: 12, color: '#059669', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : notifications.map((n: any) => (
              <div key={n.id} onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  background: n.is_read ? '#fff' : '#f0fdf4',
                  borderBottom: '1px solid #f3f4f6', cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}>
                <span style={{ display: 'inline-flex', flexShrink: 0, marginTop: 2 }}>{NOTIF_ICONS[n.type] || <Icons.Bell size={18} color="#9ca3af" />}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: 13, color: '#1a1d23', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!n.is_read && <div style={{ width: 8, height: 8, background: '#059669', borderRadius: '50%', flexShrink: 0, marginTop: 6 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
