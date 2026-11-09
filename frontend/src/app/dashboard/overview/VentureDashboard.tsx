'use client';

import { Activity, CheckCircle, LayoutDashboard, Users } from 'lucide-react';
import { Card, CardHeader, EmptyState, StatCard, tint } from '@/components/ui';
import type { User } from '@/lib/constants';
import { ActivityFeed, VelocityChart, type DashboardProps } from './shared';

/** Overview for L3-L5: one venture. The API already scopes every list to it. */
export default function VentureDashboard({ currentUser, users, tasks, analytics }: DashboardProps & { currentUser: User }) {
  const ventureColor = currentUser.venture?.primaryColor || 'var(--color-purple-glow)';
  const velocity = analytics?.taskVelocity ?? [];
  const activity = analytics?.recentActivity ?? [];
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex items-center gap-4 rounded-[var(--radius-card)] border p-6"
        style={{ background: `linear-gradient(135deg, ${tint(ventureColor, 4)}, transparent)`, borderColor: tint(ventureColor, 12) }}
      >
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] border"
          style={{ background: 'var(--color-bg-card)', borderColor: tint(ventureColor, 25), color: ventureColor }}
        >
          <LayoutDashboard size={24} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold tracking-tight text-[var(--color-text-primary)]">{currentUser.venture?.name || 'Venture'} overview</h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Your team and ongoing work.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Team members" value={users.length} icon={<Users size={18} />} accent={ventureColor} />
        <StatCard label="Tasks in progress" value={inProgress} icon={<Activity size={18} />} accent="var(--color-amber)" />
        <StatCard label="Tasks completed" value={completed} icon={<CheckCircle size={18} />} accent="var(--color-emerald)" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader title="Task completion (7 days)" description="Tasks completed by this venture each day." />
          <VelocityChart data={velocity} color={ventureColor} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Team" description="People in this venture." />
          {users.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="No team members yet" description="Add people in the Team page and they will be listed here." />
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
              {users.slice(0, 6).map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-bold"
                    style={{ background: tint(ventureColor, 8), color: ventureColor }}
                  >
                    {u.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{u.full_name}</div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{u.designation || 'Staff'}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" description="The latest actions in this venture." />
          <ActivityFeed items={activity.slice(0, 5)} accent={ventureColor} />
        </Card>
      </div>
    </div>
  );
}
