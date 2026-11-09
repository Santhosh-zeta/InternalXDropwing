import { CheckSquare, Flag, Clock4 } from 'lucide-react';
import type { BadgeTone } from '@/components/ui';

/* ── API shapes ────────────────────────────────────────────────────────────
   Every field below is returned by the real controller:
   - tasks:      backend/src/controllers/task.controller.js  (getTasks)
   - projects:   backend/src/routes/project.routes.js        (GET /, GET /:id)
   - timesheets: backend/src/controllers/timesheet.controller.js (getTimesheets)
   Nothing is invented — the calendar only renders what the API supplies. */

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CalendarTask {
  id: number;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: TaskPriority;
  due_date: string | null;
  project_name: string | null;
  venture_name: string | null;
}

export interface ProjectSummary {
  id: number;
  name: string;
}

export interface ProjectMilestone {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'pending' | 'completed';
}

export interface CalendarTimesheet {
  id: number;
  hours_worked: string;
  date: string | null;
  notes: string;
  user_name: string;
  project_name: string | null;
  task_title: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

/* ── Event model ───────────────────────────────────────────────────────── */

export type EventKind = 'task' | 'milestone' | 'timesheet';

export interface CalendarEvent {
  key: string;
  kind: EventKind;
  /** Local YYYY-MM-DD the event sits on. */
  dateKey: string;
  title: string;
  detail?: string;
  accent: string;
  /** Done/approved items render dimmed and struck through. */
  settled: boolean;
}

export const KIND_META: Record<EventKind, { label: string; tone: BadgeTone; icon: typeof CheckSquare }> = {
  task: { label: 'Task due', tone: 'brand', icon: CheckSquare },
  milestone: { label: 'Milestone', tone: 'info', icon: Flag },
  timesheet: { label: 'Hours logged', tone: 'success', icon: Clock4 },
};

export const PRIORITY_VARS: Record<TaskPriority, string> = {
  low: 'var(--color-emerald)',
  medium: 'var(--color-cyan)',
  high: 'var(--color-amber)',
  urgent: 'var(--color-rose)',
};

export const WEEKDAYS = [
  { long: 'Sunday', short: 'Sun', narrow: 'S' },
  { long: 'Monday', short: 'Mon', narrow: 'M' },
  { long: 'Tuesday', short: 'Tue', narrow: 'T' },
  { long: 'Wednesday', short: 'Wed', narrow: 'W' },
  { long: 'Thursday', short: 'Thu', narrow: 'T' },
  { long: 'Friday', short: 'Fri', narrow: 'F' },
  { long: 'Saturday', short: 'Sat', narrow: 'S' },
];

/* ── Date math (no dependency — the app ships none and does not need one) ── */

/** Local calendar key for a Date, e.g. 2026-09-13. Never uses UTC. */
export function dateKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * API dates arrive either as a bare `YYYY-MM-DD` (DATE columns) or as an ISO
 * timestamp (`due_date` is a TIMESTAMP). Both start with the calendar date the
 * row was written with, so the leading 10 characters are the key — parsing
 * through `new Date()` would shift the day for anyone west of UTC.
 */
export function dateKeyFromApi(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const candidate = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function formatLongDate(key: string): string {
  return parseDateKey(key).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
