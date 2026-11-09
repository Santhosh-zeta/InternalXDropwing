'use client';

import { Activity, CheckCircle, Clock, HardDrive, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, EmptyState, StatCard } from '@/components/ui';
import { describeSeries, formatCompact, formatMoney } from '@/lib/format';
import { ActivityFeed, TOOLTIP_STYLE, VelocityChart, type DashboardProps } from './shared';

/** Overview for L1/L2: every venture. */
export default function GlobalDashboard({ users, tasks, analytics }: DashboardProps) {
  const count = (status: string) => tasks.filter((t) => t.status === status).length;
  const velocity = analytics?.taskVelocity ?? [];
  const budgets = analytics?.budgetDistribution ?? [];
  const distribution = analytics?.userDistribution ?? [];
  const activity = analytics?.recentActivity ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="People" value={users.length} icon={<Users size={18} />} accent="var(--color-purple-glow)" />
        <StatCard label="In progress" value={count('in-progress')} icon={<Clock size={18} />} accent="var(--color-cyan)" />
        <StatCard label="Completed" value={count('completed')} icon={<CheckCircle size={18} />} accent="var(--color-emerald)" />
        <StatCard label="Pending" value={count('pending')} icon={<Activity size={18} />} accent="var(--color-amber)" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-3">
          <CardHeader title="Task completion (7 days)" description="Tasks marked complete each day this week." />
          <VelocityChart data={velocity} color="var(--color-purple-glow)" />
        </Card>

        <Card>
          <CardHeader title="Budget by venture" description="Total project budget per venture." />
          {budgets.length === 0 ? (
            <EmptyState icon={<HardDrive size={20} />} title="No budgets recorded" description="Add a budget to a project and each venture's share shows up here." />
          ) : (
            <div className="h-60 w-full" role="img" aria-label={`Bar chart of project budget by venture: ${describeSeries(budgets, 'venture', 'total_budget', formatMoney)}.`}>
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <BarChart data={budgets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="venture" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompact} dx={-4} />
                  <Tooltip cursor={{ fill: 'var(--color-bg-secondary)' }} contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatMoney(value), 'Budget']} />
                  <Bar dataKey="total_budget" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {budgets.map((entry, i) => (
                      <Cell key={i} fill={entry.color || 'var(--color-purple-glow)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="People by venture" description="Active accounts per venture." />
          {distribution.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="No people to chart" description="Add people to ventures and their distribution appears here." />
          ) : (
            <div className="relative flex h-60 w-full items-center justify-center" role="img" aria-label={`Donut chart of active users by venture: ${describeSeries(distribution, 'name', 'value')}.`}>
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <PieChart>
                  <Pie data={distribution} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                    {distribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color || 'var(--color-purple-glow)'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" description="The latest audited actions." />
          <ActivityFeed items={activity.slice(0, 5)} accent="var(--color-purple-glow)" />
        </Card>
      </div>
    </div>
  );
}
