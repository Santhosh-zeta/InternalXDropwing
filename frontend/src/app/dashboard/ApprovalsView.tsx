'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import {
  CheckCheck, ClipboardCheck, Clock, Lock, RotateCcw, Users,
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Skeleton, StatCard, tint, useConfirm,
} from '@/components/ui';

/**
 * Shape returned by `GET /api/timesheets`
 * (backend/src/controllers/timesheet.controller.js → getTimesheets).
 * `hours_worked` and `date` are the real column names; `hourly_rate` and
 * `total_cost` are computed server-side from the submitter's access level.
 */
interface PendingTimesheet {
  id: number;
  user_id: number;
  user_name: string;
  project_name: string | null;
  task_title: string | null;
  venture_name: string | null;
  venture_color: string | null;
  hours_worked: string;
  date: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  // Only sent to L<=3, and null when no rate is set for the person.
  hourly_rate?: number | null;
  total_cost?: number | null;
}

/** `PATCH /api/timesheets/:id/approve` accepts exactly these two values. */
type Decision = 'approved' | 'rejected';

const TH_CLASS = 'p-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]';

/** Parses a DATE (`YYYY-MM-DD`) or ISO timestamp without shifting the day. */
function parseApiDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const candidate = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const [year, month, day] = candidate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDay(raw: string): string {
  const date = parseApiDate(raw);
  return date
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
}

/**
 * Timesheets are logged per day, so the "period" a manager approves against is
 * the week the entry falls in. Derived from the entry's own date — the API has
 * no period field and none is invented here.
 */
function formatWeek(raw: string): string {
  const date = parseApiDate(raw);
  if (!date) return '';
  const monday = new Date(date);
  // getDay(): 0 = Sunday. Shift back to the Monday that opens the week.
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `Week of ${monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function ApprovalsSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the approval queue…</span>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <Skeleton height={10} width="50%" />
            <Skeleton height={22} width="35%" className="mt-3" />
          </Card>
        ))}
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-5">
          <Skeleton height={14} width="30%" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
            <Skeleton circle width={32} height={32} />
            <Skeleton height={12} width="22%" />
            <Skeleton height={12} width="18%" />
            <Skeleton height={12} width="14%" />
            <Skeleton height={12} width="20%" className="ml-auto" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function ApprovalsView({ currentUser }: { currentUser: User }) {
  // `updateStatus` rejects anyone at level 6 or below, so the queue is
  // meaningless for them. Mirrors backend/src/controllers/timesheet.controller.js.
  const canApprove = currentUser.accessLevel <= 5;

  const [timesheets, setTimesheets] = useState<PendingTimesheet[]>([]);
  // Seeded from the gate so the no-access branch never flashes a skeleton and
  // the effect below never has to flip loading synchronously.
  const [loading, setLoading] = useState(canApprove);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [status, setStatus] = useState('');

  const confirm = useConfirm();

  const loadQueue = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: PendingTimesheet[] }>('/timesheets');
      if (!response.data?.success) {
        throw new Error('Request was not successful');
      }
      setTimesheets(response.data.data ?? []);
      setError(null);
    } catch {
      setError('Could not load the approval queue. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
  // The loader's first statement is an `await`, so no setState runs
  // synchronously here — the rule cannot see past the async boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canApprove) void loadQueue();
  }, [canApprove, loadQueue]);

  const pending = useMemo(
    () => timesheets.filter(entry => entry.status === 'pending'),
    [timesheets],
  );

  const totals = useMemo(() => ({
    hours: pending.reduce((sum, entry) => sum + (parseFloat(entry.hours_worked) || 0), 0),
    cost: pending.reduce((sum, entry) => sum + (Number(entry.total_cost) || 0), 0),
    people: new Set(pending.map(entry => entry.user_id)).size,
  }), [pending]);

  /**
   * Flips the row locally first so the queue responds instantly, then rolls the
   * row back to `pending` if the PATCH fails. Returns success so the bulk path
   * can count outcomes without duplicating the logic.
   */
  const decide = useCallback(async (entry: PendingTimesheet, decision: Decision): Promise<boolean> => {
    setBusyIds(previous => [...previous, entry.id]);
    setTimesheets(previous =>
      previous.map(row => (row.id === entry.id ? { ...row, status: decision } : row)),
    );

    try {
      const response = await api.patch<{ success: boolean; message?: string }>(
        `/timesheets/${entry.id}/approve`,
        { status: decision },
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Update rejected');
      }
      return true;
    } catch {
      setTimesheets(previous =>
        previous.map(row => (row.id === entry.id ? { ...row, status: 'pending' } : row)),
      );
      return false;
    } finally {
      setBusyIds(previous => previous.filter(id => id !== entry.id));
    }
  }, []);

  const handleDecision = async (entry: PendingTimesheet, decision: Decision) => {
    const succeeded = await decide(entry, decision);
    if (succeeded) {
      setStatus(`Timesheet for ${entry.user_name} ${decision}.`);
      toast.success(`Timesheet ${decision}`);
    } else {
      setStatus(`Could not ${decision === 'approved' ? 'approve' : 'reject'} the timesheet for ${entry.user_name}. It is still pending.`);
      toast.error(`Could not ${decision === 'approved' ? 'approve' : 'reject'} that timesheet`);
    }
  };

  const handleBulkApprove = async () => {
    const queue = [...pending];
    if (queue.length === 0) return;

    const confirmed = await confirm({
      title: `Approve ${queue.length} timesheet${queue.length === 1 ? '' : 's'}?`,
      description: `This approves every pending entry in the queue — ${totals.hours.toFixed(1)} hours from ${totals.people} ${totals.people === 1 ? 'person' : 'people'}. Approved hours feed straight into labour costs.`,
      confirmLabel: 'Approve all',
    });
    if (!confirmed) return;

    setBulkRunning(true);
    setStatus(`Approving ${queue.length} timesheets…`);

    const results = await Promise.all(queue.map(entry => decide(entry, 'approved')));
    const approved = results.filter(Boolean).length;
    const failed = results.length - approved;

    setBulkRunning(false);

    if (failed === 0) {
      setStatus(`Approved all ${approved} timesheets.`);
      toast.success(`Approved ${approved} timesheet${approved === 1 ? '' : 's'}`);
    } else {
      setStatus(`Approved ${approved} of ${results.length}. ${failed} stayed pending.`);
      toast.error(`${failed} timesheet${failed === 1 ? '' : 's'} could not be approved`);
    }
  };

  if (!canApprove) {
    return (
      <div
        className="rounded-2xl border border-dashed p-10 text-center sm:p-16"
        style={{ background: 'var(--color-bg-card)', borderColor: tint('var(--color-rose)', 20) }}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{
            background: tint('var(--color-rose)', 10),
            borderColor: tint('var(--color-rose)', 20),
            color: 'var(--color-rose)',
          }}
        >
          <Lock size={28} />
        </div>
        <h3 className="mb-2 text-base font-bold text-[var(--color-text-primary)]">Access Denied</h3>
        <p className="mx-auto max-w-md text-sm font-medium text-[var(--color-text-secondary)]">
          Approving timesheets is restricted to Managers (L5) and above. You are signed in as{' '}
          {currentUser.levelName} (L{currentUser.accessLevel}). Your own submitted hours are in the
          Timesheets module.
        </p>
      </div>
    );
  }

  const header = (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Approvals</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Timesheets waiting on your decision
          {currentUser.venture ? ` in ${currentUser.venture.name}` : ' across every venture'}.
        </p>
      </div>
      {pending.length > 0 && (
        <Button
          variant="primary"
          leadingIcon={<CheckCheck size={16} aria-hidden="true" />}
          loading={bulkRunning}
          onClick={handleBulkApprove}
        >
          Approve all ({pending.length})
        </Button>
      )}
    </div>
  );

  if (loading) {
    return <ApprovalsSkeleton />;
  }

  if (error) {
    return (
      <div className="pb-10">
        {header}
        <EmptyState
          tone="error"
          icon={<ClipboardCheck size={22} aria-hidden="true" />}
          title="Approval queue unavailable"
          description={error}
          action={
            <Button
              variant="primary"
              leadingIcon={<RotateCcw size={16} aria-hidden="true" />}
              onClick={retry}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-10">
      {header}

      {/* Announces the outcome of an approval to assistive tech, which a toast
          alone does not do reliably. */}
      <p aria-live="polite" className="sr-only">{status}</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting approval"
          value={pending.length}
          accent="var(--color-amber)"
          icon={<ClipboardCheck size={18} />}
        />
        <StatCard
          label="Hours pending"
          value={`${totals.hours.toFixed(1)}h`}
          accent="var(--color-cyan)"
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Submitters"
          value={totals.people}
          accent="var(--color-purple-glow)"
          icon={<Users size={18} />}
          delta={pending.length > 0 && totals.cost > 0 ? { value: `${currency(totals.cost)} of labour cost`, direction: 'flat' } : undefined}
        />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-5">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">Pending queue</h3>
        </div>

        {pending.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<CheckCheck size={22} aria-hidden="true" />}
              title="Nothing waiting on you"
              description="Every timesheet submitted to you has been reviewed. New submissions land here automatically."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">Timesheets pending your approval</caption>
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <th scope="col" className={TH_CLASS}>Requester</th>
                  <th scope="col" className={TH_CLASS}>Period</th>
                  <th scope="col" className={TH_CLASS}>Hours</th>
                  <th scope="col" className={TH_CLASS}>Project</th>
                  <th scope="col" className={`${TH_CLASS} text-right`}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(entry => {
                  const busy = busyIds.includes(entry.id);
                  const when = formatDay(entry.date);
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-bg-secondary)]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[11px] font-bold"
                            style={{
                              background: tint(entry.venture_color || 'var(--color-purple-glow)', 12),
                              color: entry.venture_color || 'var(--color-purple-glow)',
                            }}
                          >
                            {entry.user_name?.charAt(0) || '?'}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                              {entry.user_name}
                            </span>
                            <span
                              className="block truncate text-[11px]"
                              style={{ color: entry.venture_color || 'var(--color-text-muted)' }}
                            >
                              {entry.venture_name || 'Global'}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-[13px] text-[var(--color-text-primary)]">{when}</div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {formatWeek(entry.date)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-[13px] font-bold text-[var(--color-text-primary)]">
                          {entry.hours_worked}h
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {entry.total_cost == null ? '—' : currency(entry.total_cost)}
                        </div>
                      </td>
                      <td className="max-w-[220px] p-4">
                        <div className="truncate text-[13px] text-[var(--color-text-primary)]">
                          {entry.project_name || 'No project'}
                        </div>
                        {(entry.task_title || entry.notes) && (
                          <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                            {entry.task_title || entry.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Badge tone="warning" dot>Pending</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busy}
                            disabled={bulkRunning}
                            onClick={() => handleDecision(entry, 'approved')}
                            aria-label={`Approve ${entry.hours_worked} hours for ${entry.user_name} on ${when}`}
                            className="border border-[var(--color-emerald)]/30 bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] hover:bg-[var(--color-emerald)]/20 hover:text-[var(--color-emerald)]"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy || bulkRunning}
                            onClick={() => handleDecision(entry, 'rejected')}
                            aria-label={`Reject ${entry.hours_worked} hours for ${entry.user_name} on ${when}`}
                            className="border border-[var(--color-rose)]/30 bg-[var(--color-rose)]/10 text-[var(--color-rose)] hover:bg-[var(--color-rose)]/20 hover:text-[var(--color-rose)]"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
