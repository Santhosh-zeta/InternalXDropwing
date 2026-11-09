'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Clock, DollarSign, RotateCcw, Timer } from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Field, Input, SkeletonTable, StatCard, Textarea,
  type BadgeTone,
} from '@/components/ui';

interface Timesheet {
  id: number;
  user_id: number;
  user_name: string;
  project_name: string | null;
  task_title: string | null;
  venture_name: string | null;
  venture_color: string | null;
  // Column names from the `timesheets` table — the API does `SELECT t.*` with
  // no aliasing, so these are `hours_worked` and `date`, not `hours`/`activity_date`.
  hours_worked: string;
  date: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  hourly_rate?: number | null;
  total_cost?: number | null;
  created_at: string;
}

interface Financials {
  byVenture: { name: string; hours: number; cost: number }[];
  global: { totalHours: number; totalCost: number };
}

/**
 * `date` is a DATE column and arrives as `YYYY-MM-DD` (or an ISO timestamp at
 * midnight UTC). Reading the calendar parts directly avoids the off-by-one day
 * that `new Date(value).toLocaleDateString()` produces west of UTC.
 */
function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const candidate = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return '—';
  const [year, month, day] = candidate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

const STATUS_TONE: Record<Timesheet['status'], BadgeTone> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'warning',
};

export default function TimesheetsView({ currentUser }: { currentUser: User }) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [hours, setHours] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hoursInputRef = useRef<HTMLInputElement>(null);

  const loadTimesheets = useCallback(async () => {
    try {
      const response = await api.get('/timesheets');
      if (!response.data?.success) throw new Error('Request was not successful');
      setTimesheets(response.data.data ?? []);
      setError(null);
    } catch {
      setError('Could not load timesheets. Check your connection and try again.');
      setLoading(false);
      return;
    }

    // Financials are a separate endpoint with its own authorisation. A failure
    // here must not report the timesheets — already loaded — as failed.
    if (currentUser.accessLevel <= 5) {
      try {
        const finRes = await api.get('/timesheets/financials');
        if (finRes.data?.success) setFinancials(finRes.data.data);
      } catch {
        setFinancials(null);
      }
    }

    setLoading(false);
  }, [currentUser.accessLevel]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void loadTimesheets();
  }, [loadTimesheets]);

  useEffect(() => {
    // The loader's first statement is an `await`, so no setState runs
    // synchronously here — the rule cannot see past the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTimesheets();
  }, [loadTimesheets]);

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || parseFloat(hours) <= 0) return toast.error('Enter valid hours');

    try {
      setSubmitting(true);
      const response = await api.post('/timesheets', {
        hours: parseFloat(hours),
        activityDate,
        notes
      });
      if (response.data.success) {
        toast.success('Hours logged successfully');
        setHours('');
        setNotes('');
        void loadTimesheets();
      } else {
        toast.error(response.data.message || 'Failed to log hours');
      }
    } catch (err) {
      toast.error('Error logging hours');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const response = await api.patch(`/timesheets/${id}/approve`, { status });
      if (response.data.success) {
        toast.success(`Timesheet ${status}`);
        void loadTimesheets();
      } else {
        toast.error(response.data.message || 'Update failed');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const isExecutive = currentUser.accessLevel <= 5;
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  const columnCount = isExecutive ? 7 : 4;

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)]">
          {isExecutive ? 'Timesheets & Approvals' : 'My Timesheets'}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {isExecutive ? 'Review team hours, approve logs, and track labor costs.' : 'Log your daily hours and track your billable time.'}
        </p>
      </div>

      {isExecutive && financials && (
        <div className="grid gap-4 mb-8 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
          <StatCard
            label="Total Billable Hours"
            value={`${financials.global.totalHours.toFixed(1)}h`}
            accent="var(--color-emerald)"
            icon={<Clock size={18} />}
          />
          <StatCard
            label="Total Labor Cost"
            value={formatCurrency(financials.global.totalCost)}
            accent="var(--color-purple-glow)"
            icon={<DollarSign size={18} />}
          />
          {financials.byVenture.map(v => (
            <StatCard
              key={v.name}
              label={v.name}
              value={formatCurrency(v.cost)}
              accent="var(--color-text-secondary)"
              delta={{ value: `${v.hours.toFixed(1)} hours`, direction: 'flat' }}
            />
          ))}
        </div>
      )}

      <div className={`flex gap-6 items-start ${isExecutive ? 'flex-col' : 'flex-row flex-wrap lg:flex-nowrap'}`}>

        {/* Log Hours Form (Left side for staff) */}
        {!isExecutive && (
          <Card padding="none" className="p-6 w-[320px] shrink-0 sticky top-6">
            <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-5">Log Activity</h3>
            <form onSubmit={handleLogHours} className="flex flex-col gap-4">
              <Field label="Date" required>
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    type="date"
                    required
                    value={activityDate}
                    onChange={e => setActivityDate(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Hours" hint="Between 0.5 and 24, in half-hour steps." required>
                {({ id, describedBy }) => (
                  <Input
                    ref={hoursInputRef}
                    id={id}
                    aria-describedby={describedBy}
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    placeholder="e.g. 4.5"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Notes" required>
                {({ id, describedBy }) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    rows={3}
                    required
                    placeholder="What did you work on?"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" variant="primary" fullWidth loading={submitting}>
                {submitting ? 'Logging...' : 'Submit Timesheet'}
              </Button>
            </form>
          </Card>
        )}

        {/* Timesheets List */}
        <div className="flex-1 w-full min-w-0">
          <Card padding="none" className="overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {isExecutive ? 'Recent Timesheets' : 'Your History'}
              </h3>
            </div>

            {loading ? (
              <SkeletonTable rows={6} columns={columnCount} />
            ) : error ? (
              <div className="p-6">
                <EmptyState
                  tone="error"
                  icon={<Timer size={22} aria-hidden="true" />}
                  title="Timesheets unavailable"
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
            ) : timesheets.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Timer size={22} aria-hidden="true" />}
                  title={isExecutive ? 'No timesheets submitted yet' : 'No hours logged yet'}
                  description={isExecutive
                    ? 'Once your team logs hours against their projects, entries will appear here for approval and cost tracking.'
                    : 'Log your first day of work using the form beside this list. Approved hours feed into your venture’s labour costs.'}
                  action={isExecutive ? undefined : (
                    <Button variant="primary" onClick={() => hoursInputRef.current?.focus()}>
                      Log your first hours
                    </Button>
                  )}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">
                    {isExecutive ? 'Recent timesheets submitted by your team' : 'Your submitted timesheets'}
                  </caption>
                  <thead>
                    <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                      <th scope="col" className="p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Date</th>
                      {isExecutive && <th scope="col" className="p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Employee</th>}
                      <th scope="col" className="p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Work Done</th>
                      <th scope="col" className="p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Hours</th>
                      {isExecutive && <th scope="col" className="p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Est. Cost</th>}
                      <th scope="col" className="p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Status</th>
                      {isExecutive && <th scope="col" className="p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)] text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map(t => (
                      <tr key={t.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-secondary)]">
                        <td className="p-4 text-[13px] text-[var(--color-text-primary)]">
                          {formatDate(t.date)}
                        </td>
                        {isExecutive && (
                          <td className="p-4">
                            <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.user_name}</div>
                            <div className="text-[11px]" style={{ color: t.venture_color || 'var(--color-text-muted)' }}>{t.venture_name || 'Global'}</div>
                          </td>
                        )}
                        <td className="p-4 max-w-[200px]">
                          <div className="text-[13px] text-[var(--color-text-primary)] whitespace-nowrap overflow-hidden text-ellipsis">{t.notes}</div>
                          {(t.project_name || t.task_title) && (
                            <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                              {t.project_name} {t.task_title && `› ${t.task_title}`}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-[13px] font-bold text-[var(--color-text-primary)]">
                          {t.hours_worked}h
                        </td>
                        {isExecutive && (
                          <td className="p-4 text-[13px] text-[var(--color-text-secondary)]">
                            {t.total_cost == null || t.hourly_rate == null
                              ? <span className="text-[var(--color-text-muted)]">{t.hourly_rate === undefined ? '—' : 'no rate set'}</span>
                              : <>{formatCurrency(t.total_cost)} <span className="text-[10px] text-[var(--color-text-muted)]">({formatCurrency(t.hourly_rate)}/h)</span></>}
                          </td>
                        )}
                        <td className="p-4">
                          <Badge tone={STATUS_TONE[t.status]} dot>{t.status.toUpperCase()}</Badge>
                        </td>
                        {isExecutive && (
                          <td className="p-4 text-right">
                            {t.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusUpdate(t.id, 'approved')}
                                  aria-label={`Approve timesheet for ${t.user_name} on ${formatDate(t.date)}`}
                                  className="border border-[var(--color-emerald)]/30 bg-[var(--color-emerald)]/10 text-[var(--color-emerald)] hover:bg-[var(--color-emerald)]/20 hover:text-[var(--color-emerald)]"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusUpdate(t.id, 'rejected')}
                                  aria-label={`Reject timesheet for ${t.user_name} on ${formatDate(t.date)}`}
                                  className="border border-[var(--color-rose)]/30 bg-[var(--color-rose)]/10 text-[var(--color-rose)] hover:bg-[var(--color-rose)]/20 hover:text-[var(--color-rose)]"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
