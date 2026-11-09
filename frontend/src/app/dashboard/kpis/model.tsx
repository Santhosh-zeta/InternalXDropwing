import { Users, BarChart3, Trophy, Clock } from 'lucide-react';
import { Card, Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui';

export const CHART_STYLE = {
  contentStyle: { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 },
};

/** Axis labels follow the theme rather than a fixed slate grey. */
export const AXIS_TICK = { fontSize: 11, fill: 'var(--color-text-muted)' };
export const AXIS_TICK_SM = { fontSize: 10, fill: 'var(--color-text-muted)' };

export interface HeadcountRow { venture: string; color: string; slug: string; total: number; leadership: number; staff: number; interns: number; }
export interface DeptRow { department: string; count: number; ventures: string; }
export interface LevelRow { level_name: string; level_number: number; count: number; }
export interface PerfRow { full_name: string; designation: string; department: string; venture: string; color: string; completed_tasks: number; total_tasks: number; completion_rate: number; }
export interface TimesheetRow { venture: string; color: string; avg_hours: number; total_hours: number; members_logged: number; }
export interface DeptKPI { department: string; venture: string; color: string; team_size: number; active_projects: number; total_tasks: number; completed_tasks: number; kpi_score: number; }
export interface HRData { headcount: HeadcountRow[]; departments: DeptRow[]; levels: LevelRow[]; performance: PerfRow[]; timesheets: TimesheetRow[]; totals: { total_employees: number; leadership: number; staff: number; interns: number; }; }

/**
 * Access-level palette. These are design colours, not venture data, so they
 * are expressed as tokens and adapt to the light theme. L7 has no dedicated
 * token, so it is mixed from two that do.
 */
export const LEVEL_COLORS: Record<number, string> = {
  1: 'var(--color-purple-glow)',
  2: 'var(--color-purple-light)',
  3: 'var(--color-purple-dark)',
  4: 'var(--color-cyan)',
  5: 'var(--color-amber)',
  6: 'var(--color-emerald)',
  7: 'color-mix(in srgb, var(--color-purple-glow) 60%, var(--color-cyan))',
  8: 'var(--color-text-secondary)',
  9: 'var(--color-rose)',
};

export const TABS = [
  { id: 'headcount' as const, label: 'Headcount', icon: <Users size={15} aria-hidden="true" /> },
  { id: 'kpis' as const, label: 'Dept KPIs', icon: <BarChart3 size={15} aria-hidden="true" /> },
  { id: 'performance' as const, label: 'Top Performers', icon: <Trophy size={15} aria-hidden="true" /> },
  { id: 'timesheets' as const, label: 'Hours & Effort', icon: <Clock size={15} aria-hidden="true" /> },
];

export function kpiColor(score: number) {
  return score >= 70 ? 'var(--color-emerald)' : score >= 40 ? 'var(--color-amber)' : 'var(--color-rose)';
}

/** Skeleton shaped like the tile row plus the two headcount panels. */
export function KPISkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading HR data…</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <Skeleton height={14} width="45%" />
            <Skeleton height={10} width="60%" className="mt-2" />
            <Skeleton height={180} className="mt-5 rounded-[var(--radius-card)]" />
          </Card>
        ))}
      </div>
      <SkeletonTable rows={4} columns={5} />
    </div>
  );
}

/**
 * Gold / silver / bronze, derived from tokens so the ranks stay legible
 * in the light theme instead of being fixed dark-theme hexes.
 */
export const RANK_STYLES = [
  {
    bg: 'linear-gradient(135deg, color-mix(in srgb, var(--color-amber) 70%, white), var(--color-amber))',
    label: '1st',
  },
  {
    bg: 'linear-gradient(135deg, var(--color-text-secondary), var(--color-text-muted))',
    label: '2nd',
  },
  {
    bg: 'linear-gradient(135deg, color-mix(in srgb, var(--color-amber) 55%, var(--color-rose)), color-mix(in srgb, var(--color-amber) 45%, black))',
    label: '3rd',
  },
];
