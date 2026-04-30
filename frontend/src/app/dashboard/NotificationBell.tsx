'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearReadNotifications } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Bell, BellRing, CheckCircle2, AlertCircle, MessageSquare, 
  Clock, Info, X, Trash2, Check, RefreshCw, Inbox
} from 'lucide-react';

interface Notification {
  id: number;
  type: 'task_assigned' | 'task_updated' | 'project_update' | 'mention' | 'deadline' | 'system';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  task_assigned: { icon: CheckCircle2, color: '#10b981' },
  task_updated:  { icon: RefreshCw, color: '#06b6d4' },
  project_update:{ icon: Inbox, color: '#8b5cf6' },
  mention:       { icon: MessageSquare, color: '#f59e0b' },
  deadline:      { icon: Clock, color: '#f43f5e' },
  system:        { icon: Info, color: '#6366f1' },
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
      if (res.success) {
        setNotifications(res.data);
        setUnread(res.unreadCount || res.data.filter((n: Notification) => !n.is_read).length);
      }
    } catch {
      // If API fails, keep existing or show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [load]);

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
      <button
        id="btn-notifications"
        onClick={() => setOpen(o => !o)}
        className="relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 border"
        style={{
          borderColor: open ? `${color}40` : 'var(--color-border)',
          background: open ? `${color}10` : 'var(--color-bg-secondary)',
          color: open ? color : 'var(--color-text-muted)',
        }}
      >
        {unread > 0 ? (
          <BellRing size={20} strokeWidth={open ? 2.5 : 2} className="group-hover:text-[var(--color-text-primary)]" />
        ) : (
          <Bell size={20} strokeWidth={open ? 2.5 : 2} className="group-hover:text-[var(--color-text-primary)]" />
        )}
        
        {unread > 0 && (
          <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 border-2 border-[var(--color-bg-primary)] text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-300">
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[380px] max-h-[520px] flex flex-col bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl z-[1000] overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-200">
          
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-bg-card)]/50">
            <div>
              <div className="text-sm font-bold text-[var(--color-text-primary)]">Activity Feed</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                {unread > 0 ? `${unread} unread updates` : 'Everything is up to date'}
              </div>
            </div>
            <div className="flex gap-2">
              {unread > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  title="Mark all as read"
                >
                  <Check size={14} />
                </button>
              )}
              <button 
                onClick={handleClear}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--color-text-muted)] hover:text-rose-500 transition-colors"
                title="Clear read"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="p-2 border-b border-[var(--color-border)] flex gap-1 shrink-0">
            {(['all', 'unread'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f 
                    ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' 
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {f === 'all' ? `All (${notifications.length})` : `Unread (${unread})`}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
                <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Syncing feed...</div>
              </div>
            ) : displayed.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center mb-4 border border-[var(--color-border)]">
                  <CheckCircle2 size={24} className="text-[var(--color-text-muted)] opacity-20" />
                </div>
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">All Caught Up!</div>
                <div className="text-[12px] text-[var(--color-text-muted)] mt-1 max-w-[200px] mx-auto">
                  {filter === 'unread' ? 'You have no unread notifications.' : 'New activity will appear here as it happens.'}
                </div>
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-1">
                {displayed.map(notif => {
                  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && handleRead(notif.id)}
                      className={`group flex gap-3 p-3 rounded-xl transition-all relative ${
                        notif.is_read 
                          ? 'hover:bg-[var(--color-bg-card)]/50' 
                          : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-sm'
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105"
                        style={{ 
                          background: `${cfg.color}10`, 
                          borderColor: `${cfg.color}25`,
                          color: cfg.color
                        }}
                      >
                        <Icon size={18} strokeWidth={2.5} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <div className={`text-[13px] truncate ${notif.is_read ? 'text-[var(--color-text-secondary)] font-medium' : 'text-[var(--color-text-primary)] font-bold'}`}>
                            {notif.title}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--color-text-muted)] whitespace-nowrap pt-0.5">
                            {timeAgo(notif.created_at)}
                          </div>
                        </div>
                        <div className={`text-[11px] leading-relaxed line-clamp-2 ${notif.is_read ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)] font-medium'}`}>
                          {notif.message}
                        </div>
                      </div>

                      {!notif.is_read && (
                        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[var(--color-border)] flex items-center justify-center bg-[var(--color-bg-card)]/50">
            <button 
              onClick={() => { setOpen(false); load(); }}
              className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors uppercase tracking-widest"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
