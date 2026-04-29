'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearReadNotifications } from '@/lib/api';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: 'task_assigned' | 'task_updated' | 'project_update' | 'mention' | 'deadline' | 'system';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  task_assigned: { icon: '✅', color: '#10b981' },
  task_updated:  { icon: '✏️', color: '#06b6d4' },
  project_update:{ icon: '📁', color: '#8b5cf6' },
  mention:       { icon: '💬', color: '#f59e0b' },
  deadline:      { icon: '⏰', color: '#f43f5e' },
  system:        { icon: '🔔', color: '#6366f1' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Seeded demo notifications for when the DB table is empty
const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'task_assigned', title: 'New Task Assigned', message: 'You have been assigned: "Design landing page hero section"', is_read: false, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 2, type: 'deadline', title: 'Deadline Tomorrow', message: 'Project "SerphoSoft Website Redesign" is due tomorrow', is_read: false, created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 3, type: 'mention', title: 'Mentioned in Chat', message: '@you was mentioned in #dropwing-general', is_read: false, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 4, type: 'project_update', title: 'Project Status Changed', message: 'PerSyniX AI Dashboard moved to "In Progress"', is_read: true, created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 5, type: 'task_updated', title: 'Task Completed', message: '"Set up CI/CD pipeline" was marked complete by Intern SerphoSoft', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 6, type: 'system', title: 'System Update', message: 'InternalX v2.4 deployed — new Reports & Analytics module live', is_read: true, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
];

interface NotificationBellProps {
  color?: string;
}

export default function NotificationBell({ color = '#8b5cf6' }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      if (res.success && res.data.length >= 0) {
        const notifs = res.data.length > 0 ? res.data : DEMO_NOTIFICATIONS;
        setNotifications(notifs);
        setUnread(notifs.filter((n: Notification) => !n.is_read).length);
      }
    } catch {
      setNotifications(DEMO_NOTIFICATIONS);
      setUnread(DEMO_NOTIFICATIONS.filter(n => !n.is_read).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 60s for new notifications
  useEffect(() => {
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(u => Math.max(0, u - 1));
    try { await markNotificationRead(id); } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
      toast.success('All marked as read');
    } catch { /* silent */ }
  };

  const handleClear = async () => {
    setNotifications(prev => prev.filter(n => !n.is_read));
    try {
      await clearReadNotifications();
      toast.success('Read notifications cleared');
    } catch { /* silent */ }
  };

  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell Button */}
      <button
        id="btn-notifications"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', width: 40, height: 40, borderRadius: 12,
          border: open ? `1px solid ${color}50` : '1px solid var(--color-border)',
          background: open ? `${color}18` : 'rgba(255,255,255,0.04)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, transition: 'all 0.2s',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#f43f5e', border: '2px solid var(--color-bg-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#fff',
            animation: 'pulse 2s infinite',
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 48,
          width: 380, maxHeight: 520, display: 'flex', flexDirection: 'column',
          background: 'var(--color-bg-secondary, #1a1b2e)',
          border: '1px solid var(--color-border)',
          borderRadius: 18, zIndex: 1000, overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          animation: 'slideDown 0.18s ease-out',
        }}>
          {/* Panel Header */}
          <div style={{
            padding: '16px 18px', borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Notifications</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {unread > 0 ? `${unread} unread` : 'All caught up'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && (
                <button onClick={handleMarkAllRead} style={{
                  padding: '5px 10px', borderRadius: 8, border: `1px solid ${color}30`,
                  background: `${color}15`, color, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                }}>Mark all read</button>
              )}
              <button onClick={handleClear} style={{
                padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11,
              }}>Clear read</button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 6, flexShrink: 0 }}>
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 8, border: `1px solid ${filter === f ? color+'40' : 'transparent'}`,
                background: filter === f ? `${color}18` : 'transparent',
                color: filter === f ? color : 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              }}>{f === 'all' ? `All (${notifications.length})` : `Unread (${unread})`}</button>
            ))}
          </div>

          {/* Notifications List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </div>
              </div>
            ) : (
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {displayed.map(notif => {
                  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && handleRead(notif.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, cursor: notif.is_read ? 'default' : 'pointer',
                        background: notif.is_read ? 'transparent' : `${cfg.color}10`,
                        border: `1px solid ${notif.is_read ? 'transparent' : cfg.color + '25'}`,
                        transition: 'all 0.15s', display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}
                      onMouseEnter={e => { if (!notif.is_read) (e.currentTarget as HTMLDivElement).style.background = `${cfg.color}18`; }}
                      onMouseLeave={e => { if (!notif.is_read) (e.currentTarget as HTMLDivElement).style.background = `${cfg.color}10`; }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: `${cfg.color}20`, border: `1px solid ${cfg.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      }}>{cfg.icon}</div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: notif.is_read ? 500 : 700, color: notif.is_read ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>{timeAgo(notif.created_at)}</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {notif.message}
                        </div>
                      </div>

                      {/* Unread dot */}
                      {!notif.is_read && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 18px', borderTop: '1px solid var(--color-border)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <button onClick={() => { setOpen(false); load(); }} style={{
              fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer',
            }}>↻ Refresh notifications</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
