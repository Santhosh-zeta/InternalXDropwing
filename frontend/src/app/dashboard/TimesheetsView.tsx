'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Timer } from 'lucide-react';
import api, { apiGet, errMsg } from '@/lib/api';
import { unwrapList, useApi } from '@/lib/useApi';
import type { Envelope } from '@/lib/types';
import { AsyncState, Badge, Button, Card, EmptyState, Field, Input, SkeletonTable, Textarea, type BadgeTone } from '@/components/ui';

/** `GET /api/timesheets` for a staff member: their own rows only. */
interface Timesheet {
  id: number;
  project_name: string | null;
  task_title: string | null;
  hours_worked: string;
  date: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
}

const STATUS_TONE: Record<Timesheet['status'], BadgeTone> = { approved: 'success', rejected: 'danger', pending: 'warning' };
const TH = 'p-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]';

/**
 * `date` is a DATE column and arrives as `YYYY-MM-DD` (or an ISO timestamp at
 * midnight UTC). Reading the calendar parts directly avoids the off-by-one day
 * that `new Date(value).toLocaleDateString()` produces west of UTC.
 */
function formatDate(raw: string | null | undefined): string {
  const candidate = String(raw ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return '-';
  const [year, month, day] = candidate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

/** Staff timesheets (L6-L8): log hours and follow their approval. Managers approve under Approvals. */
export default function TimesheetsView() {
  const sheets = useApi('timesheets', (s) => unwrapList(apiGet<Envelope<Timesheet[]>>('/timesheets', s)));
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hoursRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(hours);
    if (!(value > 0)) return toast.error('Enter valid hours');
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message?: string }>('/timesheets', { hours: value, activityDate: date, notes });
      if (!res.data.success) throw new Error(res.data.message);
      toast.success('Hours logged');
      setHours('');
      setNotes('');
      sheets.refetch();
    } catch (err) {
      toast.error(errMsg(err, 'Could not log hours'));
    } finally {
      setSubmitting(false);
    }
  };

  const rows = sheets.data ?? [];

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)]">My timesheets</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Log your daily hours. A manager approves them.</p>
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <Card className="w-full shrink-0 p-6 lg:sticky lg:top-6 lg:w-[320px]">
          <h3 className="mb-5 text-base font-bold text-[var(--color-text-primary)]">Log hours</h3>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Date" required>
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
            <Field label="Hours" hint="Between 0.5 and 24, in half-hour steps." required>
              {({ id, describedBy }) => (
                <Input ref={hoursRef} id={id} aria-describedby={describedBy} type="number" step="0.5" min="0.5" max="24" required placeholder="e.g. 4.5" value={hours} onChange={(e) => setHours(e.target.value)} />
              )}
            </Field>
            <Field label="Notes" required>
              {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={3} required placeholder="What did you work on?" value={notes} onChange={(e) => setNotes(e.target.value)} />}
            </Field>
            <Button type="submit" variant="primary" fullWidth loading={submitting}>Submit</Button>
          </form>
        </Card>

        <div className="w-full min-w-0 flex-1">
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-5">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">Your history</h3>
            </div>
            <AsyncState loading={sheets.loading} error={sheets.error} onRetry={sheets.refetch} what="timesheets" skeleton={<SkeletonTable rows={6} columns={4} />}>
              {rows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Timer size={22} aria-hidden="true" />}
                    title="No hours logged yet"
                    description="Log your first day of work with the form. Approved hours feed into your venture's labour costs."
                    action={<Button variant="primary" onClick={() => hoursRef.current?.focus()}>Log your first hours</Button>}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <caption className="sr-only">Your submitted timesheets</caption>
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                        <th scope="col" className={TH}>Date</th>
                        <th scope="col" className={TH}>Work done</th>
                        <th scope="col" className={TH}>Hours</th>
                        <th scope="col" className={TH}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((t) => (
                        <tr key={t.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-secondary)]">
                          <td className="p-4 text-[13px] text-[var(--color-text-primary)]">{formatDate(t.date)}</td>
                          <td className="max-w-[240px] p-4">
                            <div className="truncate text-[13px] text-[var(--color-text-primary)]">{t.notes}</div>
                            {(t.project_name || t.task_title) && (
                              <div className="mt-1 truncate text-[11px] text-[var(--color-text-muted)]">{t.project_name} {t.task_title && `› ${t.task_title}`}</div>
                            )}
                          </td>
                          <td className="p-4 text-[13px] font-bold text-[var(--color-text-primary)]">{t.hours_worked}h</td>
                          <td className="p-4"><Badge tone={STATUS_TONE[t.status]} dot>{t.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AsyncState>
          </Card>
        </div>
      </div>
    </div>
  );
}
