'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ClipboardCheck, ListChecks, Megaphone, Plus } from 'lucide-react';
import { apiGet, createTask, errMsg, getNotifications, getTasks, updateTask } from '@/lib/api';
import { useApi, unwrapList } from '@/lib/useApi';
import type { Announcement, Envelope, Task } from '@/lib/types';
import type { User } from '@/lib/constants';
import { AsyncState, Badge, Button, Card, CardHeader, EmptyState, Input, Skeleton, StatCard, type BadgeTone } from '@/components/ui';
import { useView } from './useView';

const PRIORITY_TONE: Record<Task['priority'], BadgeTone> = { low: 'success', medium: 'info', high: 'warning', urgent: 'danger' };

interface PendingSheet { id: number; user_id: number; user_name: string; hours_worked: string; date: string; project_name: string | null; status: string }

const dayOf = (d: string | null | undefined) => (d ? d.slice(0, 10) : '');
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function greeting(hour: number) {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/**
 * "Today": what needs this person's attention right now. Everything here is
 * fetched through the same scoped endpoints the full pages use, so a person
 * only ever sees their own work, their venture's approvals and their
 * notifications.
 */
export default function HomeView({ currentUser }: { currentUser: User }) {
  const { setView } = useView();
  const level = currentUser.accessLevel;
  const canCreate = level <= 7;
  const canApprove = level <= 5;

  const [{ today, hour }] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return { today: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hour: d.getHours() };
  });

  const tasks = useApi('home-tasks', (s) => unwrapList(getTasks(s)));
  const notifications = useApi('home-notifications', async (s) => {
    const res = await getNotifications(s);
    return res.success ? res.data : [];
  });
  const sheets = useApi(canApprove ? 'home-sheets' : null, async (s) =>
    (await unwrapList(apiGet<Envelope<PendingSheet[]>>('/timesheets', s))).filter(
      (t) => t.status === 'pending' && t.user_id !== currentUser.id,
    ),
  );
  const news = useApi('home-news', async (s) => {
    const res = await apiGet<Envelope<{ announcements?: Announcement[] }>>('/platform-metrics', s);
    return res.data?.announcements ?? [];
  });

  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [adding, setAdding] = useState(false);

  const mine = (tasks.data ?? [])
    .filter((t) => t.status !== 'completed' && t.assignees?.some((a) => a.id === currentUser.id))
    .sort((a, b) => (dayOf(a.due_date) || '9999').localeCompare(dayOf(b.due_date) || '9999'));
  const overdue = mine.filter((t) => dayOf(t.due_date) && dayOf(t.due_date) < today);
  const dueToday = mine.filter((t) => dayOf(t.due_date) === today);
  const unread = (notifications.data ?? []).filter((n) => !n.is_read);

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await createTask({ title: name, assigned_to: [currentUser.id], due_date: due || undefined });
      if (!res.success) throw new Error(res.message);
      toast.success('Task added');
      setTitle('');
      setDue('');
      tasks.refetch();
    } catch (err) {
      toast.error(errMsg(err, 'Could not add the task'));
    } finally {
      setAdding(false);
    }
  };

  const complete = async (task: Task) => {
    tasks.setData((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status: 'completed' } : t)));
    try {
      const res = await updateTask(task.id, { status: 'completed' });
      if (!res.success) throw new Error(res.message);
      toast.success('Marked done');
    } catch (err) {
      toast.error(errMsg(err, 'Could not update the task'));
      tasks.refetch();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {greeting(hour)}, {currentUser.fullName.split(' ')[0]}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {currentUser.venture ? currentUser.venture.name : 'All ventures'} · {currentUser.levelName}
        </p>
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${canApprove ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <StatCard label="Due today" value={tasks.loading ? '–' : dueToday.length} icon={<CalendarClock size={20} />} accent="var(--color-cyan)" />
        <StatCard label="Overdue" value={tasks.loading ? '–' : overdue.length} icon={<AlertTriangle size={20} />} accent="var(--color-rose)" />
        {canApprove && (
          <StatCard label="Awaiting approval" value={sheets.loading ? '–' : (sheets.data?.length ?? 0)} icon={<ClipboardCheck size={20} />} accent="var(--color-amber)" />
        )}
        <StatCard label="Unread notifications" value={notifications.loading ? '–' : unread.length} icon={<Bell size={20} />} accent="var(--color-purple-glow)" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="My tasks"
            description="Open tasks assigned to you, soonest due first."
            action={<Button size="sm" variant="ghost" onClick={() => setView('tasks')}>All tasks</Button>}
          />

          {canCreate && (
            <form onSubmit={quickAdd} className="mb-4 flex flex-col gap-2 sm:flex-row" aria-label="Add a task for yourself">
              <Input
                aria-label="New task title"
                placeholder="Add a task for yourself…"
                value={title}
                maxLength={255}
                onChange={(e) => setTitle(e.target.value)}
                className="min-w-0 flex-1"
              />
              <Input aria-label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-44" />
              <Button type="submit" variant="primary" loading={adding} disabled={!title.trim()} leadingIcon={<Plus size={16} aria-hidden="true" />}>
                Add
              </Button>
            </form>
          )}

          <AsyncState
            loading={tasks.loading}
            error={tasks.error}
            onRetry={tasks.refetch}
            what="your tasks"
            skeleton={<div className="flex flex-col gap-3"><Skeleton height={44} /><Skeleton height={44} /><Skeleton height={44} /></div>}
          >
            {mine.length === 0 ? (
              <EmptyState
                icon={<ListChecks size={20} />}
                title="Nothing on your plate"
                description={canCreate ? 'Add a task above, or check the project board for work to pick up.' : 'Tasks assigned to you will show up here.'}
                className="border-0 py-8"
              />
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[var(--color-border)] p-0">
                {mine.slice(0, 8).map((t) => {
                  const d = dayOf(t.due_date);
                  const late = d !== '' && d < today;
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-2.5">
                      {canCreate && (
                        <button
                          type="button"
                          aria-label={`Mark "${t.title}" as done`}
                          onClick={() => complete(t)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-[var(--color-border)] text-transparent transition-colors hover:border-[var(--color-emerald)] hover:text-[var(--color-emerald)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-purple-glow)]"
                        >
                          <CheckCircle2 size={14} aria-hidden="true" />
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{t.title}</div>
                        <div className="truncate text-xs text-[var(--color-text-muted)]">{t.project_name || t.venture_name}</div>
                      </div>
                      <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                      <span className={`w-14 shrink-0 text-right text-xs font-semibold ${late ? 'text-[var(--color-rose)]' : 'text-[var(--color-text-muted)]'}`}>
                        {d ? (d === today ? 'Today' : fmtDay(d)) : 'No date'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </AsyncState>
        </Card>

        <div className="flex flex-col gap-6">
          {canApprove && (
            <Card>
              <CardHeader title="Waiting for you" description="Timesheets to approve." action={<Button size="sm" variant="ghost" onClick={() => setView('approvals')}>Open</Button>} />
              <AsyncState loading={sheets.loading} error={sheets.error} onRetry={sheets.refetch} what="approvals" skeleton={<Skeleton height={60} />}>
                {(sheets.data ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No timesheets are waiting for approval.</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {(sheets.data ?? []).slice(0, 4).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium text-[var(--color-text-primary)]">{s.user_name}</span>
                        <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{Number(s.hours_worked)}h · {fmtDay(dayOf(s.date))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AsyncState>
            </Card>
          )}

          <Card>
            <CardHeader title="Announcements" />
            <AsyncState loading={news.loading} error={news.error} onRetry={news.refetch} what="announcements" skeleton={<Skeleton height={60} />}>
              {(news.data ?? []).length === 0 ? (
                <EmptyState icon={<Megaphone size={20} />} title="No announcements" description="Company notices will appear here." className="border-0 py-6" />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {(news.data ?? []).slice(0, 3).map((a) => (
                    <li key={a.id}>
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{a.title}</div>
                      {(a.content || a.body) && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-text-muted)]">{a.content || a.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </AsyncState>
          </Card>
        </div>
      </div>
    </div>
  );
}
