'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Modal, Skeleton, tint } from '@/components/ui';
import { CalendarTask, ProjectSummary, ProjectMilestone, CalendarTimesheet, EventKind, CalendarEvent, KIND_META, PRIORITY_VARS, WEEKDAYS, dateKeyOf, dateKeyFromApi, parseDateKey, addDays, startOfWeek, startOfMonth, daysInMonth, formatLongDate } from './calendar/model';

/* ── Loading shape ─────────────────────────────────────────────────────── */

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading scheduled work…</span>
      <div>
        <Skeleton height={28} width="35%" />
        <Skeleton height={14} width="55%" className="mt-2" />
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3.5">
          <Skeleton height={14} width={120} />
          <Skeleton height={14} width={90} />
        </div>
        <div className="grid grid-cols-7 gap-px bg-[var(--color-border)] p-px">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="min-h-[84px] bg-[var(--color-bg-card)] p-2 sm:min-h-[112px]">
              <Skeleton height={10} width={18} />
              <Skeleton height={8} className="mt-3" />
              <Skeleton height={8} width="70%" className="mt-1.5" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── View ──────────────────────────────────────────────────────────────── */

export default function CalendarView({ currentUser }: { currentUser: User }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const todayKey = dateKeyOf(new Date());

  /**
   * No synchronous `setState` here: the effect below calls this on mount while
   * `loading` already starts true, and `retry` handles the visible reset for a
   * manual retry. Flipping state synchronously inside an effect cascades an
   * extra render pass.
   */
  const loadSchedule = useCallback(async () => {
    try {
      const [tasksRes, projectsRes, timesheetsRes] = await Promise.all([
        api.get<{ success: boolean; data: CalendarTask[] }>('/tasks'),
        api.get<{ success: boolean; data: ProjectSummary[] }>('/projects'),
        api.get<{ success: boolean; data: CalendarTimesheet[] }>('/timesheets'),
      ]);

      const collected: CalendarEvent[] = [];

      for (const task of tasksRes.data?.data ?? []) {
        const dateKey = dateKeyFromApi(task.due_date);
        if (!dateKey) continue;
        collected.push({
          key: `task-${task.id}`,
          kind: 'task',
          dateKey,
          title: task.title,
          detail: [task.project_name, task.venture_name].filter(Boolean).join(' · ') || undefined,
          accent: PRIORITY_VARS[task.priority] ?? 'var(--color-purple-glow)',
          settled: task.status === 'completed',
        });
      }

      for (const entry of timesheetsRes.data?.data ?? []) {
        const dateKey = dateKeyFromApi(entry.date);
        if (!dateKey) continue;
        const context = [entry.project_name, entry.task_title].filter(Boolean).join(' › ');
        collected.push({
          key: `timesheet-${entry.id}`,
          kind: 'timesheet',
          dateKey,
          title: `${entry.hours_worked}h — ${entry.user_name}`,
          detail: context || entry.notes || undefined,
          accent: 'var(--color-emerald)',
          settled: entry.status === 'approved',
        });
      }

      // Milestones live on the project detail endpoint only, so they need one
      // request per project. `allSettled` keeps a single forbidden or deleted
      // project from emptying the whole calendar.
      const projects = projectsRes.data?.data ?? [];
      if (projects.length > 0) {
        const details = await Promise.allSettled(
          projects.map(project =>
            api.get<{ success: boolean; data: { milestones?: ProjectMilestone[] } }>(
              `/projects/${project.id}`,
            ),
          ),
        );

        details.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;
          const project = projects[index];
          for (const milestone of result.value.data?.data?.milestones ?? []) {
            const dateKey = dateKeyFromApi(milestone.due_date);
            if (!dateKey) continue;
            collected.push({
              key: `milestone-${milestone.id}`,
              kind: 'milestone',
              dateKey,
              title: milestone.title,
              detail: project.name,
              accent: 'var(--color-cyan)',
              settled: milestone.status === 'completed',
            });
          }
        });
      }

      setEvents(collected);
      setError(null);
    } catch {
      setError('Could not load your schedule. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
  // The loader's first statement is an `await`, so no setState runs
  // synchronously here — the rule cannot see past the async boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSchedule();
  }, [loadSchedule]);

  /** dateKey → events, so a cell lookup is O(1) instead of scanning every event. */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.dateKey);
      if (bucket) bucket.push(event);
      else map.set(event.dateKey, [event]);
    }
    return map;
  }, [events]);

  const visibleDays = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => dateKeyOf(addDays(start, i)));
    }

    const first = startOfMonth(cursor);
    const gridStart = startOfWeek(first);
    const cellCount = Math.ceil((first.getDay() + daysInMonth(cursor)) / 7) * 7;
    return Array.from({ length: cellCount }, (_, i) => dateKeyOf(addDays(gridStart, i)));
  }, [cursor, mode]);

  const periodLabel = useMemo(() => {
    if (mode === 'month') {
      return cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', sameMonth ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [cursor, mode]);

  const step = (direction: -1 | 1) => {
    setCursor(previous =>
      mode === 'month'
        ? new Date(previous.getFullYear(), previous.getMonth() + direction, 1)
        : addDays(previous, direction * 7),
    );
  };

  const goToToday = () => {
    const now = new Date();
    setCursor(now);
    setSelectedDay(dateKeyOf(now));
  };

  const periodEventCount = visibleDays.reduce(
    (total, key) => total + (eventsByDay.get(key)?.length ?? 0),
    0,
  );

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  const header = (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Calendar</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Task due dates, project milestones and logged hours
        {currentUser.venture ? ` across ${currentUser.venture.name}` : ' across every venture'}.
      </p>
    </div>
  );

  if (loading) {
    return <CalendarSkeleton />;
  }

  if (error) {
    return (
      <div className="pb-10">
        {header}
        <EmptyState
          tone="error"
          icon={<CalendarDays size={22} aria-hidden="true" />}
          title="Schedule unavailable"
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

      <Card padding="none" className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <Button
              iconOnly
              aria-label={mode === 'month' ? 'Previous month' : 'Previous week'}
              variant="ghost"
              size="sm"
              onClick={() => step(-1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <h3 className="min-w-0 truncate px-1 text-[15px] font-bold text-[var(--color-text-primary)]">
              {periodLabel}
            </h3>
            <Button
              iconOnly
              aria-label={mode === 'month' ? 'Next month' : 'Next week'}
              variant="ghost"
              size="sm"
              onClick={() => step(1)}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-0.5">
              {(['month', 'week'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={mode === option}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize transition-colors ${
                    mode === option
                      ? 'bg-[var(--color-purple-glow)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
        </div>

        {/* Grid — a month is genuinely tabular, so screen readers get row and
            column context from a real table rather than a wall of buttons. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] table-fixed border-collapse">
            <caption className="sr-only">
              {`Scheduled work for ${periodLabel}. ${periodEventCount} item${periodEventCount === 1 ? '' : 's'} in view.`}
            </caption>
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                {WEEKDAYS.map(day => (
                  <th
                    key={day.long}
                    scope="col"
                    className="px-1 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]"
                  >
                    <span className="sr-only">{day.long}</span>
                    <span aria-hidden="true" className="hidden sm:inline">{day.short}</span>
                    <span aria-hidden="true" className="sm:hidden">{day.narrow}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: visibleDays.length / 7 }, (_, week) => (
                <tr key={week}>
                  {visibleDays.slice(week * 7, week * 7 + 7).map(key => {
                    const dayEvents = eventsByDay.get(key) ?? [];
                    const date = parseDateKey(key);
                    const isToday = key === todayKey;
                    const inPeriod = mode === 'week' || date.getMonth() === cursor.getMonth();
                    const isSelected = key === selectedDay;

                    return (
                      <td
                        key={key}
                        className="border-b border-r border-[var(--color-border)] p-0 align-top last:border-r-0"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDay(key)}
                          aria-current={isToday ? 'date' : undefined}
                          aria-label={`${formatLongDate(key)} — ${dayEvents.length} scheduled item${dayEvents.length === 1 ? '' : 's'}`}
                          className={`flex h-full w-full flex-col items-stretch gap-1 p-1.5 text-left transition-colors sm:p-2 ${
                            mode === 'week' ? 'min-h-[180px]' : 'min-h-[84px] sm:min-h-[116px]'
                          } ${inPeriod ? 'bg-[var(--color-bg-card)]' : 'bg-[var(--color-bg-secondary)]/40'} ${
                            isSelected ? 'ring-1 ring-inset ring-[var(--color-purple-glow)]' : ''
                          } hover:bg-[var(--color-bg-card-hover)]`}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              isToday
                                ? 'bg-[var(--color-purple-glow)] text-white'
                                : inPeriod
                                  ? 'text-[var(--color-text-primary)]'
                                  : 'text-[var(--color-text-muted)]'
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {/* Chips need horizontal room; below `sm` the grid is
                              ~46px per column, so dots stand in for them. */}
                          {dayEvents.length > 0 && (
                            <>
                              <span aria-hidden="true" className="flex flex-wrap gap-1 sm:hidden">
                                {dayEvents.slice(0, 4).map(event => (
                                  <span
                                    key={event.key}
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: event.accent, opacity: event.settled ? 0.4 : 1 }}
                                  />
                                ))}
                              </span>

                              <span aria-hidden="true" className="hidden flex-col gap-1 sm:flex">
                                {dayEvents.slice(0, 3).map(event => (
                                  <span
                                    key={event.key}
                                    className={`block truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                      event.settled ? 'line-through opacity-60' : ''
                                    }`}
                                    style={{
                                      background: tint(event.accent, 12),
                                      color: event.accent,
                                      borderColor: tint(event.accent, 30),
                                    }}
                                  >
                                    {event.title}
                                  </span>
                                ))}
                                {dayEvents.length > 3 && (
                                  <span className="px-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                                    +{dayEvents.length - 3} more
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
          {(Object.keys(KIND_META) as EventKind[]).map(kind => {
            const meta = KIND_META[kind];
            return (
              <span key={kind} className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                <meta.icon size={12} aria-hidden="true" />
                {meta.label}
              </span>
            );
          })}
          <span className="ml-auto text-[11px] font-semibold text-[var(--color-text-muted)]" aria-live="polite">
            {periodEventCount} item{periodEventCount === 1 ? '' : 's'} this {mode}
          </span>
        </div>
      </Card>

      {events.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<CalendarDays size={22} aria-hidden="true" />}
            title="Nothing is scheduled yet"
            description="Task due dates, project milestones and approved hours appear on this calendar as soon as they are recorded."
          />
        </div>
      )}

      <Modal
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatLongDate(selectedDay) : ''}
        description={`${selectedEvents.length} scheduled item${selectedEvents.length === 1 ? '' : 's'}`}
        size="md"
      >
        {selectedEvents.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={20} aria-hidden="true" />}
            title="Nothing on this day"
            description="No task is due, no milestone lands and no hours were logged against this date."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {selectedEvents.map(event => {
              const meta = KIND_META[event.kind];
              return (
                <li
                  key={event.key}
                  className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border"
                    style={{
                      background: tint(event.accent, 10),
                      borderColor: tint(event.accent, 25),
                      color: event.accent,
                    }}
                  >
                    <meta.icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[13px] font-semibold text-[var(--color-text-primary)] ${
                        event.settled ? 'line-through opacity-70' : ''
                      }`}
                    >
                      {event.title}
                    </p>
                    {event.detail && (
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{event.detail}</p>
                    )}
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
