'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell, BellRing, CheckCircle2, MessageSquare, Clock, Info, Trash2, Check, RefreshCw, Inbox,
  type LucideIcon,
} from 'lucide-react';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead, clearReadNotifications, errMsg,
} from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { AppNotification } from '@/lib/types';
import { Button, tint } from '@/components/ui';
import { MENU } from './menu';

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  task_assigned: { icon: CheckCircle2, color: 'var(--color-emerald)' },
  task_updated: { icon: RefreshCw, color: 'var(--color-cyan)' },
  project_update: { icon: Inbox, color: 'var(--color-purple-glow)' },
  mention: { icon: MessageSquare, color: 'var(--color-amber)' },
  deadline: { icon: Clock, color: 'var(--color-rose)' },
  system: { icon: Info, color: 'var(--color-purple-light)' },
};

const POLL_MS = 30_000;

function timeAgo(dateStr: string, now: number): string {
  const m = Math.floor((now - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Notification links are paths such as `/dashboard/tasks`; map them to a view id. */
function viewFromLink(link?: string): string | null {
  const last = link?.split('?')[0].split('/').filter(Boolean).pop();
  return MENU.some((m) => m.id === last) ? (last as string) : null;
}

interface NotificationBellProps {
  color?: string;
  onNavigate?: (viewId: string) => void;
}

export default function NotificationBell({ color = 'var(--color-purple-glow)', onNavigate }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [now, setNow] = useState(() => Date.now());
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data, loading, fetching, error, refetch, setData } = useApi('notifications', async (signal) => {
    const res = await getNotifications(signal);
    if (!res.success) throw new Error(res.message || 'Could not load notifications');
    setNow(Date.now());
    return res.data;
  });

  useEffect(() => {
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.is_read).length;
  const displayed = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const run = async (action: () => Promise<unknown>, optimistic: (list: AppNotification[]) => AppNotification[], success?: string) => {
    setData((prev) => optimistic(prev ?? []));
    try {
      await action();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(errMsg(e, 'Could not update notifications'));
      refetch();
    }
  };

  const open_ = (n: AppNotification) => {
    if (!n.is_read) {
      void run(() => markNotificationRead(n.id), (l) => l.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    const view = viewFromLink(n.link);
    if (view && onNavigate) {
      setOpen(false);
      onNavigate(view);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={buttonRef}
        id="btn-notifications"
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-purple-glow)]"
        style={{
          borderColor: open ? tint(color, 25) : 'var(--color-border)',
          background: open ? tint(color, 8) : 'var(--color-bg-secondary)',
          color: open ? color : 'var(--color-text-muted)',
        }}
      >
        {unread > 0 ? <BellRing size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--color-bg-primary)] px-1 text-[10px] font-bold text-white"
            style={{ background: 'var(--color-rose)' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-[100] flex max-h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/50 p-4">
            <div>
              <div className="text-sm font-bold text-[var(--color-text-primary)]">Notifications</div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]" aria-live="polite">
                {unread > 0 ? `${unread} unread` : 'Everything is up to date'}
              </div>
            </div>
            <div className="flex gap-1">
              <Button iconOnly size="sm" variant="ghost" aria-label="Refresh" onClick={refetch} disabled={fetching}>
                <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} aria-hidden="true" />
              </Button>
              {unread > 0 && (
                <Button
                  iconOnly size="sm" variant="ghost" aria-label="Mark all as read"
                  onClick={() => run(markAllNotificationsRead, (l) => l.map((x) => ({ ...x, is_read: true })), 'All marked as read')}
                >
                  <Check size={14} aria-hidden="true" />
                </Button>
              )}
              <Button
                iconOnly size="sm" variant="ghost" aria-label="Clear read notifications"
                disabled={notifications.every((n) => !n.is_read)}
                onClick={() => run(clearReadNotifications, (l) => l.filter((x) => !x.is_read), 'Read notifications cleared')}
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 gap-1 border-b border-[var(--color-border)] p-2" role="group" aria-label="Filter notifications">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {f === 'all' ? `All (${notifications.length})` : `Unread (${unread})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div role="status" className="flex flex-col items-center gap-3 p-8">
                <RefreshCw className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" aria-hidden="true" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Loading…</span>
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
                {error}
                <div className="mt-3"><Button size="sm" variant="secondary" onClick={refetch}>Try again</Button></div>
              </div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle2 size={28} aria-hidden="true" className="mb-3 text-[var(--color-text-muted)] opacity-40" />
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">All caught up</div>
                <div className="mx-auto mt-1 max-w-[220px] text-[12px] text-[var(--color-text-muted)]">
                  {filter === 'unread'
                    ? 'No unread notifications.'
                    : 'You will be notified here when you are assigned a task or one of yours changes.'}
                </div>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-2">
                {displayed.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                  const Icon = cfg.icon;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => open_(n)}
                        className={`relative flex w-full gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-purple-glow)] ${
                          n.is_read
                            ? 'hover:bg-[var(--color-bg-card)]/50'
                            : 'border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                          style={{ background: tint(cfg.color, 8), borderColor: tint(cfg.color, 20), color: cfg.color }}
                        >
                          <Icon size={18} strokeWidth={2.5} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="mb-1 flex items-start justify-between gap-2">
                            <span className={`truncate text-[13px] ${n.is_read ? 'font-medium text-[var(--color-text-secondary)]' : 'font-bold text-[var(--color-text-primary)]'}`}>
                              {n.title}
                            </span>
                            <span className="whitespace-nowrap pt-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
                              {timeAgo(n.created_at, now)}
                            </span>
                          </span>
                          <span className={`line-clamp-2 block text-[11px] leading-relaxed ${n.is_read ? 'text-[var(--color-text-muted)]' : 'font-medium text-[var(--color-text-secondary)]'}`}>
                            {n.message}
                          </span>
                        </span>
                        {!n.is_read && (
                          <span aria-hidden="true" className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-rose)' }} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
