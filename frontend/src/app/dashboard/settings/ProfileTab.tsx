'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Check, UserCircle } from 'lucide-react';
import api, { API_URL, apiGet, errMsg } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { Envelope } from '@/lib/types';
import type { User } from '@/lib/constants';
import { useAuthUser } from '@/components/AuthUserContext';
import { AsyncState, Button, Card, CardHeader, Field, Input, SkeletonText, TextField } from '@/components/ui';

interface Me { full_name: string; phone: string | null; avatar_url: string | null }

/** Name, phone and photo. Notification preferences live in their own tab and are saved by their own endpoint. */
export default function ProfileTab({ currentUser }: { currentUser: User }) {
  const me = useApi('me', async (signal) => (await apiGet<Envelope<Me>>('/team-members/me', signal)).data);
  return (
    <AsyncState loading={me.loading} error={me.error} onRetry={me.refetch} what="your profile" skeleton={<Card><SkeletonText lines={4} /></Card>}>
      {me.data && <ProfileForm currentUser={currentUser} initial={me.data} />}
    </AsyncState>
  );
}

function ProfileForm({ currentUser, initial }: { currentUser: User; initial: Me }) {
  // Refreshes the app-wide verified user after a save, so the sidebar and every
  // view that reads `currentUser` pick up the change without a reload.
  const { refresh } = useAuthUser();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarBackground = avatarUrl ? `url(${API_URL}${avatarUrl})` : 'none';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Avatar must be under 5MB');
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      setSaving(true);
      // The shared client sends the session cookie; leave Content-Type unset so the browser adds the multipart boundary.
      const { data: res } = await api.post('/team-members/me/avatar', formData);
      if (!res.success) throw new Error(res.message);
      setAvatarUrl(res.data.avatar_url);
      toast.success('Avatar updated');
      await refresh();
    } catch (err) {
      // A rejected file type (png/jpg/webp only) arrives as a non-2xx response.
      toast.error(errMsg(err, 'Error uploading avatar'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/team-members/me/profile', { full_name: fullName, phone });
      if (!res.data.success) throw new Error(res.data.message);
      toast.success('Profile updated');
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, 'Error updating profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
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
  );
}
