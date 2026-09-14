'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getAnalytics } from '@/lib/api';
import { BarChart3, CheckCircle2, Users, Building2, DollarSign, RefreshCw, Lock } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Button, Card, CardHeader, StatCard, EmptyState, Skeleton, SkeletonCard, cn,
} from '@/components/ui';

interface AnalyticsData {
  budgetDistribution: { venture: string; color: string; total_budget: number }[];
  monthlyPerformance?: { name: string; tasks: number; projects: number }[];
  taskVelocity: { name: string; completed: number }[];
  userDistribution: { name: string; value: number; color: string }[];
}

const CHART_STYLE = {
  contentStyle: { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 },
  labelStyle: { color: 'var(--color-text-muted)' },
};

/** Axis and legend text pick up the theme instead of a fixed slate grey. */
const AXIS_TICK = { fontSize: 11, fill: 'var(--color-text-muted)' };
const AXIS_TICK_LG = { fontSize: 12, fill: 'var(--color-text-muted)' };
const AXIS_TICK_CATEGORY = { fontSize: 12, fill: 'var(--color-text-secondary)' };

const FALLBACK_VEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(n => ({ name: n, completed: 0 }));
const FALLBACK_MONTHLY = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(n => ({ name: n, tasks: 0, projects: 0 }));

const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: <BarChart3 size={15} aria-hidden="true" /> },
  { id: 'tasks' as const, label: 'Task Velocity', icon: <CheckCircle2 size={15} aria-hidden="true" /> },
  { id: 'ventures' as const, label: 'Ventures', icon: <Building2 size={15} aria-hidden="true" /> },
  { id: 'team' as const, label: 'Team', icon: <Users size={15} aria-hidden="true" /> },
];

const rupees = (value: any) => `₹${Number(value ?? 0).toLocaleString()}`;

/** Renders a chart series as a sentence for screen readers. */
function describeSeries(
  rows: any[],
  labelKey: string,
  valueKey: string,
  format?: (value: any) => string,
): string {
  return rows
    .map((row) => `${row?.[labelKey] ?? 'Unknown'} ${format ? format(row?.[valueKey]) : row?.[valueKey] ?? 0}`)
    .join(', ');
}

/** Skeleton mirroring the KPI tile row plus the chart panels beneath it. */
function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading analytics…</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <Skeleton height={14} width="40%" />
            <Skeleton height={10} width="60%" className="mt-2" />
            <Skeleton height={220} className="mt-5 rounded-[var(--radius-card)]" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ReportsView({ currentUser }: { currentUser: User }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'tasks' | 'ventures' | 'team'>('overview');
  const [range, setRange] = useState('7 Days');

  const color = currentUser.venture?.primaryColor || 'var(--color-purple-glow)';

  const rangeInDays = range === '90 Days' ? 90 : range === '30 Days' ? 30 : 7;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalytics(rangeInDays);
      if (!res.success) throw new Error('Request was not successful');
      setData(res.data);
      setError(null);
    } catch {
      setError('Could not load report data. Check your connection and try again.');
    }
    finally { setLoading(false); }
  }, [rangeInDays]);

  useEffect(() => { fetchData(); }, [fetchData, rangeInDays]);

  const vel = data?.taskVelocity?.length ? data.taskVelocity : FALLBACK_VEL;
  const hasVel = Boolean(data?.taskVelocity?.length);
  const monthly = data?.monthlyPerformance?.length ? data.monthlyPerformance : FALLBACK_MONTHLY;
  const hasMonthly = Boolean(data?.monthlyPerformance?.length);
  const totalVel = vel.reduce((s, d) => s + d.completed, 0);
  const users = data?.userDistribution || [];
  const totalUsers = users.reduce((s, d) => s + d.value, 0);
  const budgets = data?.budgetDistribution || [];
  const totalBudget = budgets.reduce((s, d) => s + (d.total_budget || 0), 0);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Report section"
          className="flex gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1.5"
        >
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-control)] border px-4 py-2 text-[13px] font-bold transition-all',
                tab === t.id
                  ? 'border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              )}
              style={tab === t.id ? { color } : {}}
            >{t.icon} {t.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Reporting period" className="flex items-center gap-2">
            {['7 Days', '30 Days', '90 Days'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  'rounded-[var(--radius-control)] border px-3 py-1.5 text-[12px] font-bold transition-all',
                  range === r
                    ? 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                )}
                style={range === r ? { color } : {}}
              >{r}</button>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchData}
            loading={loading}
            leadingIcon={<RefreshCw size={13} aria-hidden="true" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <ReportsSkeleton />
      ) : error ? (
        <EmptyState
          tone="error"
          icon={<BarChart3 size={22} aria-hidden="true" />}
          title="Reports unavailable"
          description={error}
          action={
            <Button variant="primary" leadingIcon={<RefreshCw size={16} aria-hidden="true" />} onClick={fetchData}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* The "+12%"/"+3 across ventures" deltas these two cards used to
                carry were fixed strings with no backing figure — no endpoint
                reports a prior-period comparison, so they are dropped rather
                than faked. */}
            <StatCard
              label="Tasks Completed"
              value={totalVel}
              accent="var(--color-emerald)"
              icon={<CheckCircle2 size={16} />}
            />
            <StatCard
              label="Active Team"
              value={totalUsers}
              accent="var(--color-cyan)"
              icon={<Users size={16} />}
            />
            {currentUser.accessLevel <= 4 && (
              <StatCard
                label="Total Budget"
                value={`₹${(totalBudget / 100000).toFixed(1)}L`}
                accent="var(--color-amber)"
                icon={<DollarSign size={16} />}
                delta={{ value: 'Project budgets', direction: 'flat' }}
              />
            )}
            {/* `users` here is analytics userDistribution grouped by venture
                — its length undercounts any venture with zero active users,
                and the `|| 4` fallback silently showed a made-up figure
                whenever analytics returned nothing at all. VENTURES is the
                app's real, static list of operating units. */}
            <StatCard
              label="Ventures"
              value={VENTURES.length}
              accent={color}
              icon={<Building2 size={16} />}
              delta={{ value: 'Operating units', direction: 'flat' }}
            />
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader title="Monthly Performance" description="Tasks & projects completed over time" />
                {hasMonthly ? (
                  <div
                    role="img"
                    aria-label={`Area chart of tasks and projects completed by month. Tasks: ${describeSeries(monthly, 'name', 'tasks')}. Projects: ${describeSeries(monthly, 'name', 'projects')}.`}
                  >
                    <ResponsiveContainer width="100%" height={220} minHeight={220} minWidth={0}>
                      <AreaChart data={monthly}>
                        <defs>
                          <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} /><stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={CHART_STYLE.contentStyle} labelStyle={CHART_STYLE.labelStyle} />
                        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }} />
                        <Area type="monotone" dataKey="tasks" stroke={color} fill="url(#ag1)" strokeWidth={2} name="Tasks" />
                        <Area type="monotone" dataKey="projects" stroke="var(--color-cyan)" fill="url(#ag2)" strokeWidth={2} name="Projects" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={<BarChart3 size={20} />}
                    title="No monthly history yet"
                    description="Once tasks and projects are completed, month-over-month trends appear here."
                  />
                )}
              </Card>
              <Card>
                <CardHeader title="Team Distribution" description="Active members per venture" />
                {users.length > 0 ? (
                  <>
                    <div
                      role="img"
                      aria-label={`Donut chart of active members per venture: ${describeSeries(users, 'name', 'value')}.`}
                    >
                      <ResponsiveContainer width="100%" height={160} minHeight={160} minWidth={0}>
                        <PieChart>
                          <Pie data={users} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                            {users.map((e, i) => <Cell key={i} fill={e.color || color} />)}
                          </Pie>
                          <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 flex flex-wrap justify-center gap-3">
                      {users.map((d, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: d.color || color }} />
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{d.name} ({d.value})</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyState
                    icon={<Users size={20} />}
                    title="No team data yet"
                    description="Add people to a venture and their distribution shows up here."
                  />
                )}
              </Card>
            </div>
          )}

          {/* Task Velocity */}
          {tab === 'tasks' && (
            <Card padding="lg">
              <CardHeader
                title="Task Completion Velocity"
                description={`${totalVel} tasks completed — last ${rangeInDays} days`}
              />
              {hasVel ? (
                <div
                  role="img"
                  aria-label={`Bar chart of tasks completed per day over the last ${rangeInDays} days: ${describeSeries(vel, 'name', 'completed')}.`}
                >
                  <ResponsiveContainer width="100%" height={280} minHeight={280} minWidth={0}>
                    <BarChart data={vel} barSize={38}>
                      <defs>
                        <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1} /><stop offset="100%" stopColor={color} stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={AXIS_TICK_LG} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK_LG} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_STYLE.contentStyle} labelStyle={CHART_STYLE.labelStyle} />
                      <Bar dataKey="completed" fill="url(#bg1)" radius={[8, 8, 0, 0]} name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={<CheckCircle2 size={20} />}
                  title="Nothing completed in this period"
                  description="Complete a task, or widen the reporting period, to see velocity here."
                />
              )}
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: 'Avg / Day', value: (totalVel / 7).toFixed(1), c: 'var(--color-emerald)' },
                  { label: 'Peak Day', value: Math.max(...vel.map(d => d.completed)), c: color },
                  { label: 'Status', value: totalVel > 0 ? '↑ Active' : '— Idle', c: totalVel > 0 ? 'var(--color-emerald)' : 'var(--color-text-muted)' },
                ].map(s => (
                  <div key={s.label} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-center">
                    <div className="text-2xl font-black" style={{ color: s.c }}>{s.value}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Ventures */}
          {tab === 'ventures' && (
            currentUser.accessLevel <= 4 ? (
              <Card padding="lg">
                <CardHeader title="Budget Distribution" description="Project budget per venture" />
                {budgets.length > 0 ? (
                  <div
                    role="img"
                    aria-label={`Horizontal bar chart of project budget per venture: ${describeSeries(budgets, 'venture', 'total_budget', rupees)}.`}
                  >
                    <ResponsiveContainer width="100%" height={240} minHeight={240} minWidth={0}>
                      <BarChart data={budgets} layout="vertical" barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="venture" tick={AXIS_TICK_CATEGORY} axisLine={false} tickLine={false} width={130} />
                        <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v) => [`₹${Number(v ?? 0).toLocaleString()}`, 'Budget']} />
                        <Bar dataKey="total_budget" radius={[0, 8, 8, 0]}>
                          {budgets.map((e, i) => <Cell key={i} fill={e.color || color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Building2 size={20} />}
                    title="No budgets to compare"
                    description="Create projects with budgets to see how spend is distributed across ventures."
                  />
                )}
              </Card>
            ) : (
              <EmptyState
                icon={<Lock size={20} />}
                title="Restricted view"
                description="Cross-venture analytics require L4 or higher access. Ask an administrator if you need it."
              />
            )
          )}

          {/* Team */}
          {tab === 'team' && (
            <Card padding="lg">
              <CardHeader title="Team by Venture" description="Active members across ventures" />
              {users.length > 0 ? (
                <div
                  role="img"
                  aria-label={`Bar chart of active members by venture: ${describeSeries(users, 'name', 'value')}.`}
                >
                  <ResponsiveContainer width="100%" height={260} minHeight={260} minWidth={0}>
                    <BarChart data={users} barSize={50}>
                      <defs>
                        {users.map((d, i) => (
                          <linearGradient key={i} id={`tg${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={d.color || color} stopOpacity={1} />
                            <stop offset="100%" stopColor={d.color || color} stopOpacity={0.4} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Members">
                        {users.map((_, i) => <Cell key={i} fill={`url(#tg${i})`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={<Users size={20} />}
                  title="No team data available"
                  description="Once people are assigned to ventures, headcount is charted here."
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
