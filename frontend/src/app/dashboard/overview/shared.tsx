'use client';

import { Activity, LineChart as LineChartIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, EmptyState, Skeleton, SkeletonCard } from '@/components/ui';
import { describeSeries } from '@/lib/format';
import type { Analytics, Task, TeamMember } from '@/lib/types';

export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

export interface DashboardProps {
  users: TeamMember[];
  tasks: Task[];
  analytics: Analytics | null;
}

/** Skeleton shaped like the real dashboard: a tile row above a chart grid. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading overview…</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <Card>
        <Skeleton height={12} width="30%" />
        <Skeleton height={264} className="mt-6 rounded-[var(--radius-card)]" />
      </Card>
    </div>
  );
}

export function ActivityFeed({ items, accent }: { items: NonNullable<Analytics['recentActivity']>; accent: string }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Activity size={20} />}
        title="No activity yet"
        description="Actions taken across the workspace will show up here as they happen."
      />
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {items.map((act, i) => (
        <li key={act.id ?? i} className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          >
            <Activity size={12} style={{ color: accent }} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">{act.action}</div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {new Date(act.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Line chart of tasks completed per day, with an empty state and a spoken summary. */
export function VelocityChart({ data, color, height = 288 }: { data: Analytics['taskVelocity']; color: string; height?: number }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<LineChartIcon size={20} />}
        title="No velocity data yet"
        description="Once tasks start being completed, the last seven days of throughput appear here."
      />
    );
  }
  return (
    <div
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={`Line chart of tasks completed per day over the last 7 days: ${describeSeries(data, 'name', 'completed')}.`}
    >
      <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
          <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--color-text-primary)' }} />
          <Line type="monotone" dataKey="completed" name="Completed tasks" stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
