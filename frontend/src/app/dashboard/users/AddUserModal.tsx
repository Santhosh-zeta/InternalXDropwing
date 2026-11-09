'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';
import { createUser, errMsg } from '@/lib/api';
import type { Venture } from '@/lib/types';
import type { User } from '@/lib/constants';
import { Button, Field, Modal, Select, TextField } from '@/components/ui';
import { DEPARTMENTS, DESIGNATIONS, assignableLevels } from './constants';

interface Props {
  actor: User;
  ventures: Venture[];
  onClose: () => void;
  onCreated: () => void;
}

/** Create-a-member dialog. Mounted only while open, so state starts fresh each time. */
export default function AddUserModal({ actor, ventures, onClose, onCreated }: Props) {
  const levels = assignableLevels(actor);
  const ownVenture = actor.accessLevel > 2 ? (actor.venture?.id ?? 0) : 0;
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    access_level: levels.find((l) => l.level === 7)?.level ?? levels[0]?.level ?? 7,
    venture_id: ownVenture || ventures[0]?.id || 0,
    department: '',
    designation: '',
  });
  const [saving, setSaving] = useState(false);
  // Set when the server has no email configured: the link is shown once.
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const global = form.access_level <= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createUser({ ...form, venture_id: global ? undefined : form.venture_id });
      if (!res.success) throw new Error(res.message);
      if (res.invite?.link) {
        setInviteLink(res.invite.link);
      } else {
        toast.success(res.invite?.emailed ? `Invitation sent to ${form.email}` : 'Member created');
        onCreated();
      }
    } catch (err) {
      toast.error(errMsg(err, 'Could not create the member'));
    } finally {
      setSaving(false);
    }
  };

  if (inviteLink) {
    return (
      <Modal
        open
        onClose={onCreated}
        title="Share the invite link"
        description="Email is not set up on this server, so nothing was sent. The link works for 72 hours and is shown only once."
        size="md"
        footer={<Button variant="primary" onClick={onCreated}>Done</Button>}
      >
        <div className="flex flex-col gap-3">
          <input readOnly value={inviteLink} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)]" />
          <Button
            variant="secondary"
            leadingIcon={<Copy size={14} aria-hidden="true" />}
            onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success('Link copied'), () => toast.error('Copy failed: select the link and copy it manually'))}
          >
            Copy link
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite a member"
      description="They get an email with a link to set their own password (valid 72 hours)."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-user-form" loading={saving} disabled={!global && !form.venture_id}>Send invite</Button>
        </>
      }
    >
      <form id="add-user-form" onSubmit={submit} className="flex flex-col gap-5">
        <TextField label="Full name" required value={form.full_name} maxLength={100} onChange={(e) => set('full_name', e.target.value)} placeholder="E.g. Jane Doe" autoComplete="off" />
        <TextField label="Email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@company.com" autoComplete="off" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Access level">
            {({ id }) => (
              <Select id={id} value={form.access_level} onChange={(e) => set('access_level', Number(e.target.value))}>
                {levels.map((l) => <option key={l.level} value={l.level}>L{l.level} - {l.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Venture" hint={global ? 'Levels 1-2 are not tied to a venture.' : undefined}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={global ? 0 : form.venture_id}
                disabled={global || actor.accessLevel > 2}
                onChange={(e) => set('venture_id', Number(e.target.value))}
              >
                {global && <option value={0}>All ventures</option>}
                {ventures.filter((v) => actor.accessLevel <= 2 || v.id === ownVenture).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Department">
            {({ id }) => (
              <Select id={id} value={form.department} onChange={(e) => set('department', e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Designation">
            {({ id }) => (
              <Select id={id} value={form.designation} onChange={(e) => set('designation', e.target.value)}>
                <option value="">Select role</option>
                {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </form>
    </Modal>
  );
}
