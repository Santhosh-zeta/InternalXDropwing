'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, UserCheck, X } from 'lucide-react';
import { deleteUser, errMsg, updateUser } from '@/lib/api';
import type { TeamMember, Venture } from '@/lib/types';
import type { User } from '@/lib/constants';
import { Button, Select, useConfirm } from '@/components/ui';
import { assignableLevels } from './constants';

interface RowProps {
  member: TeamMember;
  actor: User;
  ventures: Venture[];
  onDone: () => void;
}

function PendingRow({ member, actor, ventures, onDone }: RowProps) {
  const confirm = useConfirm();
  const levels = assignableLevels(actor);
  const [level, setLevel] = useState(
    levels.some((l) => l.level === member.access_level) ? member.access_level : (levels.find((l) => l.level === 7)?.level ?? levels[0]?.level ?? 7),
  );
  const [venture, setVenture] = useState(member.venture_id ?? 0);
  const [busy, setBusy] = useState(false);
  const global = level <= 2;
  const ready = global || venture > 0;

  const approve = async () => {
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { is_active: true, access_level: level };
      if (!global) patch.venture_id = venture;
      const res = await updateUser(member.id, patch);
      if (!res.success) throw new Error(res.message);
      toast.success(`${member.full_name} approved`);
      onDone();
    } catch (err) {
      toast.error(errMsg(err, 'Could not approve the account'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    const ok = await confirm({
      title: `Reject ${member.full_name}?`,
      description: 'The account request is deleted and they cannot sign in.',
      confirmLabel: 'Reject',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await deleteUser(member.id);
      if (!res.success) throw new Error(res.message);
      toast.success('Request rejected');
      onDone();
    } catch (err) {
      toast.error(errMsg(err, 'Could not reject the request'));
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 last:border-0 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{member.full_name}</div>
        <div className="truncate text-xs text-[var(--color-text-muted)]">
          {member.email}
          {member.created_at ? ` · requested ${new Date(member.created_at).toLocaleDateString()}` : ''}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label={`Access level for ${member.full_name}`} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="h-auto w-auto min-w-40 py-2">
          {levels.map((l) => <option key={l.level} value={l.level}>L{l.level} {l.name}</option>)}
        </Select>
        <Select aria-label={`Venture for ${member.full_name}`} value={global ? 0 : venture} disabled={global} onChange={(e) => setVenture(Number(e.target.value))} className="h-auto w-auto min-w-40 py-2">
          {global ? <option value={0}>All ventures</option> : <option value={0}>Choose a venture…</option>}
          {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
        <Button variant="primary" size="sm" loading={busy} disabled={!ready} leadingIcon={<Check size={14} aria-hidden="true" />} onClick={approve}>Approve</Button>
        <Button variant="ghost" size="sm" disabled={busy} leadingIcon={<X size={14} aria-hidden="true" />} onClick={reject}>Reject</Button>
      </div>
    </li>
  );
}

/** Self-registered accounts waiting for L1/L2. Approving needs a venture (levels 3-9), exactly as the server requires. */
export default function PendingApprovals({ pending, actor, ventures, onChanged }: { pending: TeamMember[]; actor: User; ventures: Venture[]; onChanged: () => void }) {
  if (pending.length === 0) return null;
  return (
    <section aria-labelledby="pending-heading" className="overflow-hidden rounded-2xl border border-amber-500/30 bg-[var(--color-bg-card)] shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-amber-500/10 px-4 py-3">
        <UserCheck size={16} aria-hidden="true" className="text-amber-500" />
        <h3 id="pending-heading" className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">Waiting for approval ({pending.length})</h3>
      </div>
      <ul className="m-0 list-none p-0">
        {pending.map((m) => <PendingRow key={m.id} member={m} actor={actor} ventures={ventures} onDone={onChanged} />)}
      </ul>
    </section>
  );
}
