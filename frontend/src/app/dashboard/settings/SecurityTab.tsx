'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import api, { errMsg } from '@/lib/api';
import { Button, Card, CardHeader, TextField, useConfirm } from '@/components/ui';

export default function SecurityTab() {
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const newPasswordError = newPassword.length > 0 && newPassword.length < 8 ? 'Use at least 8 characters.' : undefined;
  const confirmPasswordError = confirmPassword.length > 0 && newPassword !== confirmPassword ? 'Passwords do not match.' : undefined;

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');

    // A mistyped new password locks the account out, so ask once.
    const proceed = await confirm({
      title: 'Change your password?',
      description: 'You will need the new password the next time you sign in. This cannot be undone.',
      confirmLabel: 'Change password',
    });
    if (!proceed) return;

    try {
      setSaving(true);
      const res = await api.put('/team-members/me/password', { currentPassword, newPassword });
      if (!res.data.success) throw new Error(res.data.message);
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(errMsg(err, 'Error changing password'));
    } finally {
      setSaving(false);
    }
  };

  return (
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
  );
}
