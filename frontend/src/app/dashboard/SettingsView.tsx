'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api, { errMsg } from '@/lib/api';
import {
  UserCircle, ShieldCheck, SlidersHorizontal,
  Camera, Check, Moon, Sun, BellOff, Mail
} from 'lucide-react';
import {
  Button, Card, CardHeader, Field, Input, TextField,
  Skeleton, SkeletonText, cn, useConfirm,
} from '@/components/ui';
import { useAuthUser } from '@/components/AuthUserContext';

interface SettingsViewProps {
  currentUser: User;
}

type TabId = 'profile' | 'security' | 'preferences';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Personal Info', icon: <UserCircle size={16} aria-hidden="true" /> },
  { id: 'security', label: 'Security', icon: <ShieldCheck size={16} aria-hidden="true" /> },
  { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal size={16} aria-hidden="true" /> },
];

export default function SettingsView({ currentUser }: SettingsViewProps) {
  // Refreshes the app-wide verified user after a save, so the sidebar,
  // avatar, and every other view that reads `currentUser` pick up the
  // change immediately without a full reload.
  const { refresh } = useAuthUser();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences state
  const [muteChatAfter5, setMuteChatAfter5] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    // Settings only renders after sign-in, on the client, so reading the DOM here is safe.
    try {
      return localStorage.getItem('internalx_theme') === 'light' ? 'light' : document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const confirm = useConfirm();
  const uid = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    api.get('/team-members/me').then(
      (res) => {
        if (cancelled) return;
        if (res.data.success) {
          const user = res.data.data;
          setFullName(user.full_name);
          setPhone(user.phone || '');
          setAvatarUrl(user.avatar_url || '');
          if (user.notification_preferences) {
            setMuteChatAfter5(!!user.notification_preferences.muteChatAfter5);
            setEmailNotifications(user.notification_preferences.emailNotifications !== false);
          }
        }
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        toast.error(errMsg(err, 'Failed to load profile settings'));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleThemeToggle = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    try { localStorage.setItem('internalx_theme', newTheme); } catch { /* private mode: the theme still applies for this session */ }
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Avatar must be under 5MB');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setSaving(true);
      // No manual auth header — the shared `api` client sends the session
      // cookie automatically. Leave Content-Type unset so axios/the browser
      // fill in the multipart boundary themselves.
      const { data: res } = await api.post('/team-members/me/avatar', formData);
      if (res.success) {
        setAvatarUrl(res.data.avatar_url);
        toast.success('Avatar updated successfully');
        await refresh();
      } else {
        toast.error(res.message || 'Failed to upload avatar');
      }
    } catch (err) {
      // axios throws on a non-2xx response — a rejected file type (the
      // avatar allowlist is stricter than the document one: png/jpg/webp
      // only) lands here, not in the `else` above.
      toast.error(errMsg(err, 'Error uploading avatar'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/team-members/me/profile', {
        full_name: fullName,
        phone,
        notification_preferences: { muteChatAfter5, emailNotifications }
      });
      if (res.data.success) {
        toast.success('Profile updated successfully');
        await refresh();
      } else {
        toast.error(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(errMsg(err, 'Error updating profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');

    // Replacing a credential cannot be undone, and a mistyped new password
    // locks the account out — worth one deliberate confirmation.
    const proceed = await confirm({
      title: 'Change your password?',
      description: 'You will need the new password the next time you sign in. This cannot be undone.',
      confirmLabel: 'Change password',
    });
    if (!proceed) return;

    try {
      setSaving(true);
      const res = await api.put('/team-members/me/password', { currentPassword, newPassword });
      if (res.data.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.data.message || 'Failed to change password');
      }
    } catch (err) {
      toast.error(errMsg(err, 'Error changing password'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-10 max-w-3xl" role="status" aria-busy="true">
        <span className="sr-only">Loading settings…</span>
        <div>
          <Skeleton height={24} width="40%" />
          <Skeleton height={12} width="65%" className="mt-3" />
        </div>
        <Skeleton height={56} className="rounded-[var(--radius-card)]" />
        <Card>
          <div className="flex items-center gap-4">
            <Skeleton circle width={64} height={64} />
            <div className="flex-1">
              <Skeleton height={12} width="35%" />
              <Skeleton height={10} width="55%" className="mt-2" />
            </div>
          </div>
          <SkeletonText lines={4} className="mt-6" />
        </Card>
      </div>
    );
  }

  // Arrow keys move between tabs, as expected of an ARIA tablist.
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    let next: number;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const newPasswordError = newPassword.length > 0 && newPassword.length < 8
    ? 'Use at least 8 characters.'
    : undefined;
  const confirmPasswordError = confirmPassword.length > 0 && newPassword !== confirmPassword
    ? 'Passwords do not match.'
    : undefined;

  const avatarBackground = avatarUrl
    ? `url(${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}${avatarUrl})`
    : 'none';

  const PREFERENCES = [
    {
      key: 'quiet-hours',
      icon: <BellOff size={20} aria-hidden="true" className="text-amber-500" />,
      title: 'Quiet Hours',
      desc: 'Mute team chat notifications after 5:00 PM local time.',
      checked: muteChatAfter5,
      onChange: (v: boolean) => setMuteChatAfter5(v),
    },
    {
      key: 'email-notifications',
      icon: <Mail size={20} aria-hidden="true" className="text-cyan-500" />,
      title: 'Email Notifications',
      desc: 'Receive email digests for pending tasks and document approvals.',
      checked: emailNotifications,
      onChange: (v: boolean) => setEmailNotifications(v),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-3xl">
      <div>
        <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Account Settings</h2>
        <p className="text-[var(--color-text-secondary)] text-sm font-medium mt-1">
          Manage your profile, security credentials, and system preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex gap-2 bg-[var(--color-bg-secondary)] p-1.5 rounded-2xl border border-[var(--color-border)]"
        >
          {TABS.map((tab, i) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={el => { tabRefs.current[i] = el; }}
                type="button"
                role="tab"
                id={`${uid}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${uid}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onKeyDown={e => handleTabKeyDown(e, i)}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all border flex-1 justify-center ${
                  selected
                    ? 'bg-[var(--color-bg-card)] text-[var(--color-purple-glow)] border-[var(--color-border)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Profile Tab ─────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div
            role="tabpanel"
            id={`${uid}-panel-profile`}
            aria-labelledby={`${uid}-tab-profile`}
          >
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
              <Card>
                <CardHeader
                  title="Profile photo"
                  description="Shown next to your name across chat, tasks and approvals."
                />
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile photo"
                    className="w-20 h-20 rounded-2xl bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] overflow-hidden flex items-center justify-center shrink-0 relative group cursor-pointer"
                    style={{
                      backgroundImage: avatarBackground,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!avatarUrl && <UserCircle size={40} aria-hidden="true" className="text-[var(--color-text-muted)]" />}
                    <span aria-hidden="true" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </span>
                  </button>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="sr-only"
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      aria-label="Upload a new profile photo"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leadingIcon={<Camera size={14} aria-hidden="true" />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Avatar
                    </Button>
                    <p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-2">JPG, GIF or PNG. Max size 5MB.</p>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Personal details"
                  description="Your name and phone are visible to the rest of the team."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <TextField
                    label="Full Name"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />

                  <Field label="Email Address" hint="Email cannot be changed. Contact IT admin.">
                    {({ id, describedBy }) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        type="email"
                        value={currentUser.email}
                        readOnly
                        autoComplete="email"
                        className="cursor-not-allowed opacity-60"
                      />
                    )}
                  </Field>

                  <TextField
                    label="Phone Number"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    autoComplete="tel"
                  />

                  <Field label="Role / Designation" hint="Set by your administrator.">
                    {({ id, describedBy }) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        type="text"
                        value={currentUser.designation || currentUser.levelName}
                        readOnly
                        className="cursor-not-allowed opacity-60"
                      />
                    )}
                  </Field>
                </div>

                <div className="flex justify-end pt-6 mt-6 border-t border-[var(--color-border)]">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    leadingIcon={<Check size={15} strokeWidth={2.5} aria-hidden="true" />}
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </Card>
            </form>
          </div>
        )}

        {/* ── Security Tab ────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div
            role="tabpanel"
            id={`${uid}-panel-security`}
            aria-labelledby={`${uid}-tab-security`}
          >
            <Card>
              <CardHeader
                title="Change password"
                description="Use at least 8 characters. You will be asked to confirm before the change is saved."
              />
              <form onSubmit={handleSavePassword} className="flex flex-col gap-5 max-w-md">
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                <div className="border-t border-[var(--color-border)] pt-5 flex flex-col gap-4">
                  <TextField
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    hint="At least 8 characters."
                    error={newPasswordError}
                  />

                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    error={confirmPasswordError}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    leadingIcon={<ShieldCheck size={15} strokeWidth={2.5} aria-hidden="true" />}
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── Preferences Tab ─────────────────────────────────── */}
        {activeTab === 'preferences' && (
          <div
            role="tabpanel"
            id={`${uid}-panel-preferences`}
            aria-labelledby={`${uid}-tab-preferences`}
          >
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
              <Card>
                <CardHeader
                  title="Notifications"
                  description="Control when InternalX is allowed to interrupt you."
                />
                <div className="flex flex-col gap-4">
                  {PREFERENCES.map(pref => {
                    const titleId = `${uid}-${pref.key}-title`;
                    const descId = `${uid}-${pref.key}-desc`;
                    return (
                      <div key={pref.key} className="flex items-center justify-between gap-4 p-5 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]">
                        <div className="flex items-center gap-4">
                          <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                            {pref.icon}
                          </div>
                          <div>
                            <h4 id={titleId} className="text-[14px] font-bold text-[var(--color-text-primary)] mb-0.5">{pref.title}</h4>
                            <p id={descId} className="text-[12px] font-medium text-[var(--color-text-muted)]">{pref.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={pref.checked}
                          aria-labelledby={titleId}
                          aria-describedby={descId}
                          onClick={() => pref.onChange(!pref.checked)}
                          className={cn(
                            'w-12 h-6 rounded-full relative transition-colors shrink-0',
                            pref.checked ? 'bg-[var(--color-purple-glow)]' : 'bg-[var(--color-border)]',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                              pref.checked ? 'translate-x-6' : 'translate-x-0.5',
                            )}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  leadingIcon={<Check size={15} strokeWidth={2.5} aria-hidden="true" />}
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
