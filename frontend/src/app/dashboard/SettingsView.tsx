'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  UserCircle, ShieldCheck, SlidersHorizontal,
  Camera, Loader2, Check, Moon, Sun, BellOff, Mail
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
}

export default function SettingsView({ currentUser }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const localTheme = localStorage.getItem('internalx_theme') as 'dark' | 'light' | null;
    if (localTheme) {
      setTheme(localTheme);
    } else if (typeof document !== 'undefined') {
      setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/team-members/me');
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
      } catch (err) {
        toast.error('Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleThemeToggle = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('internalx_theme', newTheme);
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
      const token = localStorage.getItem('internalx_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}/api/team-members/me/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const res = await response.json();
      if (res.success) {
        setAvatarUrl(res.data.avatar_url);
        toast.success('Avatar updated successfully');
        const stored = JSON.parse(localStorage.getItem('internalx_user') || '{}');
        stored.avatarUrl = res.data.avatar_url;
        localStorage.setItem('internalx_user', JSON.stringify(stored));
      } else {
        toast.error(res.message || 'Failed to upload avatar');
      }
    } catch (err) {
      toast.error('Error uploading avatar');
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
        const stored = JSON.parse(localStorage.getItem('internalx_user') || '{}');
        stored.fullName = fullName;
        stored.phone = phone;
        localStorage.setItem('internalx_user', JSON.stringify(stored));
      } else {
        toast.error(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');

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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error changing password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
        <p className="font-medium">Loading settings...</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors";
  const disabledInputClass = "w-full px-4 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-muted)] outline-none cursor-not-allowed opacity-60";
  const labelClass = "block text-[12px] font-bold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider";

  const TABS = [
    { id: 'profile' as const, label: 'Personal Info', icon: <UserCircle size={16} /> },
    { id: 'security' as const, label: 'Security', icon: <ShieldCheck size={16} /> },
    { id: 'preferences' as const, label: 'Preferences', icon: <SlidersHorizontal size={16} /> },
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
        <div className="flex gap-2 bg-[var(--color-bg-secondary)] p-1.5 rounded-2xl border border-[var(--color-border)]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all border flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-purple-glow)] border-[var(--color-border)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 md:p-8 shadow-sm">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
              {/* Avatar */}
              <div className="flex items-center gap-6 pb-6 border-b border-[var(--color-border)]">
                <div
                  className="w-20 h-20 rounded-2xl bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] overflow-hidden flex items-center justify-center shrink-0 relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    backgroundImage: avatarUrl ? `url(${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}${avatarUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!avatarUrl && <UserCircle size={40} className="text-[var(--color-text-muted)]" />}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--color-text-primary)] mb-2">Profile Avatar</h4>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-[13px] font-bold transition-colors flex items-center gap-2"
                  >
                    <Camera size={14} /> Change Avatar
                  </button>
                  <p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-2">JPG, GIF or PNG. Max size 5MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" value={currentUser.email} disabled className={disabledInputClass} />
                  <span className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1.5 block">Email cannot be changed. Contact IT admin.</span>
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Role / Designation</label>
                  <input type="text" value={currentUser.designation || currentUser.levelName} disabled className={disabledInputClass} />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="flex flex-col gap-5 max-w-md">
              <div>
                <label className={labelClass}>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className={inputClass} />
              </div>

              <div className="border-t border-[var(--color-border)] pt-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className={`${inputClass} ${confirmPassword && newPassword !== confirmPassword ? '!border-rose-500' : ''}`}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <span className="text-[11px] font-bold text-rose-500 mt-1.5 block">Passwords do not match</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} strokeWidth={2.5} />}
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">

              {/* Preference Row component inline */}
              {[
                {
                  icon: <BellOff size={20} className="text-amber-500" />,
                  title: 'Quiet Hours',
                  desc: 'Mute team chat notifications after 5:00 PM local time.',
                  checked: muteChatAfter5,
                  onChange: (v: boolean) => setMuteChatAfter5(v),
                },
                {
                  icon: <Mail size={20} className="text-cyan-500" />,
                  title: 'Email Notifications',
                  desc: 'Receive email digests for pending tasks and document approvals.',
                  checked: emailNotifications,
                  onChange: (v: boolean) => setEmailNotifications(v),
                },
              ].map((pref, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      {pref.icon}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-0.5">{pref.title}</h4>
                      <p className="text-[12px] font-medium text-[var(--color-text-muted)]">{pref.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => pref.onChange(!pref.checked)}
                    className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${pref.checked ? 'bg-[var(--color-purple-glow)]' : 'bg-[var(--color-border)]'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pref.checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}

              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-5 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                    {theme === 'dark' ? <Moon size={20} className="text-[var(--color-purple-glow)]" /> : <Sun size={20} className="text-amber-400" />}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-0.5">App Theme</h4>
                    <p className="text-[12px] font-medium text-[var(--color-text-muted)]">Choose between Dark and Light mode for the dashboard.</p>
                  </div>
                </div>
                <div className="flex gap-1.5 bg-[var(--color-bg-primary)] p-1 rounded-xl border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => handleThemeToggle('dark')}
                    className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${theme === 'dark' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                  >
                    <Moon size={13} /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeToggle('light')}
                    className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${theme === 'light' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                  >
                    <Sun size={13} /> Light
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
