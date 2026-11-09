'use client';

import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Activity, AlertCircle, Calendar, Check, Copy, Mail, Shield, Trash2, UserCircle2 } from 'lucide-react';
import { deleteUser, errMsg, getUserDetails, getUserRate, resendInvite, setUserRate, updateUser } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { TeamMember, Venture } from '@/lib/types';
import type { User } from '@/lib/constants';
import { AsyncState, Badge, Button, EmptyState, Field, Modal, Select, SkeletonText, TextField, useConfirm } from '@/components/ui';
import { DEPARTMENTS, DESIGNATIONS, LEVELS, SECTION_LABEL, assignableLevels, canDelete, canManage } from './constants';

type TabId = 'profile' | 'access' | 'activity';
const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <UserCircle2 size={16} aria-hidden="true" /> },
  { id: 'access', label: 'Access', icon: <Shield size={16} aria-hidden="true" /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={16} aria-hidden="true" /> },
];

interface Props {
  member: TeamMember;
  actor: User;
  ventures: Venture[];
  onClose: () => void;
  /** Called after any change so the list can refresh. */
  onChanged: () => void;
}

/** Side panel for one person. Read-only unless the actor may manage them (mirrors the server rule). */
export default function UserDrawer({ member, actor, ventures, onClose, onChanged }: Props) {
  const confirm = useConfirm();
  const editable = canManage(actor, member);
  const [tab, setTab] = useState<TabId>('profile');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: member.full_name,
    phone: member.phone ?? '',
    department: member.department ?? '',
    designation: member.designation ?? '',
    is_active: member.is_active ? 1 : 0,
    access_level: member.access_level,
    venture_id: member.venture_id ?? 0,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const activity = useApi(`user-${member.id}`, async () => (await getUserDetails(member.id)).data.activity ?? []);

  // Hourly rate: visible and editable by L1-L3 only (the server enforces the same rule).
  const canRate = editable && actor.accessLevel <= 3;
  const rate = useApi(canRate ? `rate-${member.id}` : null, async (signal) => (await getUserRate(member.id, signal)).data.hourly_rate);
  const [rateInput, setRateInput] = useState<string | null>(null);
  const rateValue = rateInput ?? (rate.data == null ? '' : String(rate.data));
  const [savingRate, setSavingRate] = useState(false);
  const saveRate = async () => {
    const trimmed = rateValue.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100000)) {
      toast.error('Enter a rate between 0 and 99999.99, or leave empty to clear it');
      return;
    }
    setSavingRate(true);
    try {
      await setUserRate(member.id, parsed);
      toast.success(parsed === null ? 'Hourly rate cleared' : 'Hourly rate saved');
      setRateInput(null);
      rate.refetch();
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the rate'));
    } finally {
      setSavingRate(false);
    }
  };

  // Invites can be re-sent only to active accounts that have never signed in.
  const canReinvite = editable && actor.accessLevel <= 3 && !member.last_login && !!member.is_active && !member.pending_approval;
  const [reinviting, setReinviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const reinvite = async () => {
    setReinviting(true);
    try {
      const res = await resendInvite(member.id);
      if (res.invite.link) setInviteLink(res.invite.link);
      else toast.success(`Invitation sent to ${member.email}`);
    } catch (err) {
      toast.error(errMsg(err, 'Could not send the invitation'));
    } finally {
      setReinviting(false);
    }
  };

  const levels = assignableLevels(actor);
  // L3 admins can change a person's level but never move them between ventures.
  const canMoveVenture = actor.accessLevel <= 2;

  const save = async () => {
    // Send only what changed: level and venture changes sign the person out everywhere.
    const patch: Record<string, unknown> = {};
    if (form.full_name.trim() !== member.full_name) patch.full_name = form.full_name.trim();
    if (form.phone !== (member.phone ?? '')) patch.phone = form.phone;
    if (form.department !== (member.department ?? '')) patch.department = form.department;
    if (form.designation !== (member.designation ?? '')) patch.designation = form.designation;
    if (form.is_active !== (member.is_active ? 1 : 0)) patch.is_active = form.is_active === 1;
    if (form.access_level !== member.access_level) patch.access_level = form.access_level;
    if (form.venture_id !== (member.venture_id ?? 0)) patch.venture_id = form.venture_id;
    if (Object.keys(patch).length === 0) {
      toast('No changes to save');
      return;
    }
    setSaving(true);
    try {
      const res = await updateUser(member.id, patch);
      if (!res.success) throw new Error(res.message);
      toast.success('Member updated');
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Could not update the member'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Remove ${member.full_name}?`,
      description: 'Their account and access will be revoked. Prefer marking them inactive if they have task or timesheet history.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await deleteUser(member.id);
      if (!res.success) throw new Error(res.message);
      toast.success('Member deleted');
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Could not delete the member'));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      title={member.full_name}
      description={[member.employee_id, member.designation, member.department].filter(Boolean).join(' · ')}
      footer={
        <>
          {canDelete(actor, member) && (
            <Button variant="danger" leadingIcon={<Trash2 size={16} aria-hidden="true" />} onClick={remove} className="mr-auto">Delete</Button>
          )}
          <Button variant="secondary" onClick={onClose}>{editable ? 'Cancel' : 'Close'}</Button>
          {editable && (
            <Button variant="primary" loading={saving} leadingIcon={<Check size={16} strokeWidth={2.5} aria-hidden="true" />} onClick={save}>Save</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {!editable && (
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-[13px] text-[var(--color-text-secondary)]">
            You can view this profile but not change it. People can only be managed by someone above their level.
          </p>
        )}

        <div role="tablist" aria-label="Member details" className="flex gap-6 border-b border-[var(--color-border)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`user-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`user-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-[13px] font-semibold transition-colors ${tab === t.id ? 'border-[var(--color-purple-glow)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <fieldset disabled={!editable} role="tabpanel" id="user-panel-profile" aria-labelledby="user-tab-profile" className="m-0 grid grid-cols-1 gap-5 border-0 p-0 sm:grid-cols-2">
            <TextField label="Full name" value={form.full_name} maxLength={100} onChange={(e) => set('full_name', e.target.value)} />
            <Field label="Status">
              {({ id }) => (
                <Select id={id} value={form.is_active} onChange={(e) => set('is_active', Number(e.target.value))}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive (cannot sign in)</option>
                </Select>
              )}
            </Field>
            <TextField label="Email" value={member.email} readOnly disabled />
            <TextField label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
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
                  <option value="">Select designation</option>
                  {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              )}
            </Field>
          </fieldset>
        )}

        {tab === 'profile' && canReinvite && (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className="m-0 text-[13px] text-[var(--color-text-secondary)]">
              {member.full_name} has not signed in yet. Send a fresh invitation if the email was lost or the link expired.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" loading={reinviting} leadingIcon={<Mail size={14} aria-hidden="true" />} onClick={reinvite}>Resend invite</Button>
            </div>
            {inviteLink && (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-[12px] text-[var(--color-text-muted)]">Email is not set up. Share this link yourself (valid 72 hours, shown once):</p>
                <input readOnly value={inviteLink} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-[12px] text-[var(--color-text-primary)]" />
                <Button variant="ghost" size="sm" leadingIcon={<Copy size={14} aria-hidden="true" />} onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success('Link copied'), () => toast.error('Copy failed'))}>Copy link</Button>
              </div>
            )}
          </div>
        )}

        {tab === 'access' && canRate && (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <p className={SECTION_LABEL}>Hourly rate</p>
            <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
              Used to cost timesheets, budgets and invoices unless a project sets its own rate. Without a rate, hours are reported but not costed. Visible to L1-L3 only.
            </p>
            <AsyncState loading={rate.loading} error={rate.error} onRetry={rate.refetch} what="rate" skeleton={<SkeletonText lines={1} />}>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <TextField label="Rate per hour" type="number" min={0} max={99999.99} step="0.01" inputMode="decimal" value={rateValue} onChange={(e) => setRateInput(e.target.value)} placeholder="Not set" />
                </div>
                <Button variant="secondary" loading={savingRate} disabled={rateInput === null} onClick={saveRate}>Save rate</Button>
              </div>
            </AsyncState>
          </div>
        )}

        {tab === 'access' && (
          <fieldset disabled={!editable} role="tabpanel" id="user-panel-access" aria-labelledby="user-tab-access" className="m-0 flex flex-col gap-6 border-0 p-0">
            <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              Level and venture changes apply immediately: the person is signed out everywhere and sees only the data their new scope allows.
            </p>
            <Field label="Venture" hint={form.access_level <= 2 ? 'Levels 1-2 belong to no venture.' : !canMoveVenture ? 'Only L1 and L2 can move people between ventures.' : undefined}>
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={form.access_level <= 2 ? 0 : form.venture_id}
                  disabled={!editable || !canMoveVenture || form.access_level <= 2}
                  onChange={(e) => set('venture_id', Number(e.target.value))}
                >
                  {form.access_level <= 2 && <option value={0}>All ventures</option>}
                  {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              )}
            </Field>
            <div>
              <p id="access-level-label" className={`${SECTION_LABEL} mb-3`}>Access level</p>
              <div role="group" aria-labelledby="access-level-label" className="flex flex-col gap-2">
                {LEVELS.map((level) => {
                  const allowed = levels.some((l) => l.level === level.level) || level.level === member.access_level;
                  const selected = form.access_level === level.level;
                  return (
                    <button
                      key={level.level}
                      type="button"
                      aria-pressed={selected}
                      disabled={!allowed || !editable}
                      onClick={() => setForm((f) => ({ ...f, access_level: level.level, venture_id: level.level <= 2 ? 0 : f.venture_id || ventures[0]?.id || 0 }))}
                      className={`flex w-full items-center gap-4 rounded-xl border-2 p-3 px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-cyan-500 bg-cyan-500/10' : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] enabled:hover:border-[var(--color-text-muted)]'}`}
                    >
                      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[14px] font-bold text-[var(--color-text-primary)]">L{level.level}</span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold text-[var(--color-text-primary)]">{level.name}</span>
                        <span className="block text-[12px] text-[var(--color-text-muted)]">{level.desc}</span>
                      </span>
                      {selected && <Check size={20} aria-hidden="true" className="ml-auto shrink-0 text-cyan-500" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>
        )}

        {tab === 'activity' && (
          <div role="tabpanel" id="user-panel-activity" aria-labelledby="user-tab-activity" className="flex flex-col gap-3">
            <h4 className="text-[14px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">Recent tasks</h4>
            <AsyncState
              loading={activity.loading}
              error={activity.error}
              onRetry={activity.refetch}
              what="activity"
              skeleton={<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"><SkeletonText lines={2} /></div>}
            >
              {(activity.data ?? []).length === 0 ? (
                <EmptyState icon={<Activity size={22} aria-hidden="true" />} title="No recent activity" description="Tasks assigned to or created by this member will appear here." />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {(activity.data ?? []).map((a) => (
                    <li key={a.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">{a.title}</span>
                        <Badge tone={a.status === 'completed' ? 'success' : a.status === 'in-progress' ? 'warning' : 'neutral'}>{a.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[12px] font-medium text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1.5"><Calendar size={14} aria-hidden="true" /> {new Date(a.updated_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5"><AlertCircle size={14} aria-hidden="true" /> <span className="capitalize">{a.priority}</span> priority</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AsyncState>
          </div>
        )}
      </div>
    </Modal>
  );
}
