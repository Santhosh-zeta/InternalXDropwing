'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { BellRing, CalendarRange, Mail, Moon, Sun, type LucideIcon } from 'lucide-react';
import { errMsg, getNotificationPrefs, setNotificationPrefs, type NotificationPrefs } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { AsyncState, Card, CardHeader, SkeletonText, cn } from '@/components/ui';

type PrefKey = 'digest' | 'alerts' | 'email';

const ROWS: { key: PrefKey; icon: LucideIcon; tone: string; title: string; desc: string; available: (p: NotificationPrefs) => boolean }[] = [
  { key: 'digest', icon: CalendarRange, tone: 'text-[var(--color-purple-glow)]', title: 'Weekly digest', desc: 'A Monday summary of your tasks, deadlines and projects.', available: (p) => p.digestAvailable !== false },
  { key: 'alerts', icon: BellRing, tone: 'text-amber-500', title: 'Alerts', desc: 'Heads-up when something in your scope needs attention, such as overdue work.', available: (p) => p.alertsAvailable !== false },
  { key: 'email', icon: Mail, tone: 'text-cyan-500', title: 'Also send by email', desc: 'Email a copy of the digest and alerts. In-app notifications are always kept.', available: () => true },
];

function Switch({ checked, onChange, titleId, descId, busy }: { checked: boolean; onChange: (v: boolean) => void; titleId: string; descId: string; busy: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={titleId}
      aria-describedby={descId}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60', checked ? 'bg-[var(--color-purple-glow)]' : 'bg-[var(--color-border)]')}
    >
      <span aria-hidden="true" className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-0.5')} />
    </button>
  );
}

/** Notification switches save immediately (`PUT /api/notifications/preferences`); the theme is a per-device setting. */
export default function PreferencesTab() {
  const prefs = useApi('notification-prefs', async (signal) => (await getNotificationPrefs(signal)).data);
  const [busy, setBusy] = useState<PrefKey | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    // Settings only renders after sign-in, on the client, so reading the DOM here is safe.
    try {
      return localStorage.getItem('internalx_theme') === 'light' ? 'light' : document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggle = async (key: PrefKey, value: boolean) => {
    setBusy(key);
    try {
      const res = await setNotificationPrefs({ [key]: value });
      prefs.setData((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toast.success('Preference saved');
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the preference'));
    } finally {
      setBusy(null);
    }
  };

  const handleThemeToggle = (next: 'dark' | 'light') => {
    setTheme(next);
    try { localStorage.setItem('internalx_theme', next); } catch { /* private mode: the theme still applies for this session */ }
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Notifications" description="Choose what InternalX sends you. Changes are saved as you switch." />
        <AsyncState loading={prefs.loading} error={prefs.error} onRetry={prefs.refetch} what="notification settings" skeleton={<SkeletonText lines={3} />}>
          {prefs.data && (
            <div className="flex flex-col gap-4">
              {ROWS.filter((r) => r.available(prefs.data!)).map((row) => {
                const titleId = `pref-${row.key}-title`;
                const descId = `pref-${row.key}-desc`;
                const Icon = row.icon;
                return (
                  <div key={row.key} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
                    <div className="flex items-center gap-4">
                      <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                        <Icon size={20} className={row.tone} />
                      </div>
                      <div>
                        <h4 id={titleId} className="mb-0.5 text-[14px] font-bold text-[var(--color-text-primary)]">{row.title}</h4>
                        <p id={descId} className="text-[12px] font-medium text-[var(--color-text-muted)]">{row.desc}</p>
                      </div>
                    </div>
                    <Switch checked={prefs.data![row.key]} onChange={(v) => toggle(row.key, v)} titleId={titleId} descId={descId} busy={busy === row.key} />
                  </div>
                );
              })}
            </div>
          )}
        </AsyncState>
      </Card>

      {/* Theme — the app's only theme control. */}
      <Card>
        <CardHeader
          title="Appearance"
          description={`The dashboard is currently using ${theme === 'dark' ? 'Dark' : 'Light'} mode. Your choice is saved on this device.`}
        />
        <div className="flex items-center justify-between gap-4 p-5 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
              {theme === 'dark'
                ? <Moon size={20} className="text-[var(--color-purple-glow)]" />
                : <Sun size={20} className="text-amber-400" />}
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-0.5">App Theme</h4>
              <p className="text-[12px] font-medium text-[var(--color-text-muted)]">Choose between Dark and Light mode for the dashboard.</p>
            </div>
          </div>
          <div
            role="group"
            aria-label="App theme"
            className="flex gap-1.5 bg-[var(--color-bg-primary)] p-1 rounded-xl border border-[var(--color-border)]"
          >
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => handleThemeToggle('dark')}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${theme === 'dark' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
            >
              <Moon size={13} aria-hidden="true" /> Dark
            </button>
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => handleThemeToggle('light')}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${theme === 'light' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
            >
              <Sun size={13} aria-hidden="true" /> Light
            </button>
          </div>
        </div>
        <p role="status" className="sr-only">{theme === 'dark' ? 'Dark mode active' : 'Light mode active'}</p>
      </Card>
    </div>
  );
}
