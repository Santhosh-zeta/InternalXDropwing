'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Sparkles } from 'lucide-react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  createTasksFromNotes, proposeTasksFromNotes, type NoteDraft, type NotesProposal,
} from '@/lib/api';
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';

interface Row extends NoteDraft {
  key: number;
  include: boolean;
  assigneeId: string;
  projectId: string;
  error?: string;
  created?: boolean;
}

const errorText = (err: unknown) =>
  (isAxiosError(err) && err.response?.data?.message) || 'Something went wrong. Please try again.';

/**
 * Paste meeting notes, review the drafts the assistant proposes, then create
 * only the ones you confirm. Nothing is created until "Create tasks".
 */
export default function NotesToTasksModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [proposal, setProposal] = useState<NotesProposal | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  const reset = () => { setNotes(''); setProposal(null); setRows([]); setError(''); };
  const close = () => { onClose(); reset(); };

  const analyse = async () => {
    setError('');
    setLoading(true);
    try {
      const p = await proposeTasksFromNotes(notes);
      setProposal(p);
      setRows(p.drafts.map((d, i) => ({
        ...d, key: i, include: true,
        assigneeId: d.assignee ? String(d.assignee.id) : '',
        projectId: d.project ? String(d.project.id) : '',
      })));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const patch = (key: number, change: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const selected = rows.filter((r) => r.include && !r.created);
  const blocked = selected.some((r) => !r.title.trim() || !r.assigneeId);

  const create = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await createTasksFromNotes(selected.map((r) => ({
        title: r.title.trim(),
        assigned_to: Number(r.assigneeId),
        project_id: r.projectId ? Number(r.projectId) : null,
        due_date: r.due_date || null,
        priority: r.priority || null,
        description: r.description,
      })));
      setRows((all) => {
        const byIndex = new Map(selected.map((r, i) => [r.key, res.results[i]]));
        return all.map((r) => {
          const out = byIndex.get(r.key);
          if (!out) return r;
          return out.ok ? { ...r, created: true, error: undefined } : { ...r, error: out.error || 'Could not create this task.' };
        });
      });
      if (res.created) { toast.success(`${res.created} task${res.created === 1 ? '' : 's'} created`); onCreated?.(); }
      if (res.failed) setError(`${res.failed} could not be created. Fix them below and try again.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setCreating(false);
    }
  };

  const allDone = rows.length > 0 && rows.every((r) => r.created || !r.include);

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Notes to tasks"
      description={proposal ? 'Review the drafts. Nothing is created until you press Create.' : 'Paste meeting notes or a stand-up summary. The assistant proposes tasks for you to review.'}
      closeOnBackdrop={!loading && !creating}
      footer={
        !proposal ? (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={analyse} loading={loading} disabled={notes.trim().length < 10} leadingIcon={<Sparkles size={15} aria-hidden="true" />}>
              Find action items
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={reset} disabled={creating}>Start over</Button>
            {allDone ? (
              <Button onClick={close}>Done</Button>
            ) : (
              <Button onClick={create} loading={creating} disabled={selected.length === 0 || blocked}>
                Create {selected.length} task{selected.length === 1 ? '' : 's'}
              </Button>
            )}
          </>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--color-rose)]/30 bg-[var(--color-rose)]/5 px-3 py-2 text-[13px] text-[var(--color-rose)]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      {!proposal ? (
        <Field label="Meeting notes" hint="People and projects are matched only among those you manage. Up to 12,000 characters.">
          {({ id, describedBy }) => (
            <Textarea id={id} aria-describedby={describedBy} rows={12} value={notes} maxLength={12000} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Priya will send the revised quote to the client by Friday. Arjun to fix the login bug, high priority…" />
          )}
        </Field>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center text-[var(--color-text-secondary)]">
          <ClipboardList size={28} className="mb-3 text-[var(--color-text-muted)]" aria-hidden="true" />
          <p className="text-[13px]">No action items found in those notes.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.key} className={`rounded-xl border p-4 ${r.created ? 'border-[var(--color-emerald)]/40 bg-[var(--color-emerald)]/5' : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'}`}>
              <div className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={r.include}
                  disabled={r.created}
                  onChange={(e) => patch(r.key, { include: e.target.checked })}
                  aria-label={`Include "${r.title}"`}
                  className="mt-3 h-4 w-4 shrink-0 accent-[var(--color-purple-glow)]"
                />
                <div className="min-w-0 flex-1">
                  <Input value={r.title} disabled={r.created || !r.include} aria-label="Task title" maxLength={255} onChange={(e) => patch(r.key, { title: e.target.value })} />
                </div>
                {r.created && <Badge tone="success" dot><CheckCircle2 size={11} aria-hidden="true" /> Created</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select aria-label="Assignee" value={r.assigneeId} disabled={r.created || !r.include} onChange={(e) => patch(r.key, { assigneeId: e.target.value })}>
                  <option value="">Assignee…</option>
                  {[...r.assignee_candidates, ...(proposal?.people.filter((p) => !r.assignee_candidates.some((c) => c.id === p.id)) ?? [])].map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <Select aria-label="Project" value={r.projectId} disabled={r.created || !r.include} onChange={(e) => patch(r.key, { projectId: e.target.value })}>
                  <option value="">No project</option>
                  {proposal?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <Input type="date" aria-label="Due date" value={r.due_date ?? ''} disabled={r.created || !r.include} onChange={(e) => patch(r.key, { due_date: e.target.value || null })} />
                <Select aria-label="Priority" value={r.priority ?? ''} disabled={r.created || !r.include} onChange={(e) => patch(r.key, { priority: (e.target.value || null) as Row['priority'] })}>
                  <option value="">Priority: normal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
              {r.include && !r.created && r.warnings.map((w) => (
                <p key={w} className="mt-2 flex items-start gap-1.5 text-[12px] text-[var(--color-amber)]">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" /> {w}
                </p>
              ))}
              {r.error && <p role="alert" className="mt-2 text-[12px] text-[var(--color-rose)]">{r.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
