'use client';

import { useState, useEffect } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getTasks, getUsers, getAnalytics } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, Legend
} from 'recharts';
import {
  Users, Clock, CheckCircle, Activity,
  Rocket, HardDrive, LineChart as LineChartIcon, Settings2,
  CheckCircle2, Megaphone, Bell, LayoutDashboard
} from 'lucide-react';
import {
  Card, CardHeader, StatCard, EmptyState, Skeleton, SkeletonCard, tint,
} from '@/components/ui';

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

/** Builds a spoken summary of a chart series, e.g. "Mon 4, Tue 6, Wed 2". */
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

const money = (value: any) => `$${Number(value ?? 0).toLocaleString()}`;

/** Skeleton shaped like the real dashboard: a tile row above a chart grid. */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Compiling analytics dashboard…</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <Card>
        <Skeleton height={12} width="30%" />
        <Skeleton height={264} className="mt-6 rounded-[var(--radius-card)]" />
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <Skeleton height={12} width="45%" />
            <Skeleton height={200} className="mt-6 rounded-[var(--radius-card)]" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ items, accent }: { items: any[]; accent: string }) {
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
    <ul className="flex flex-col gap-4">
      {items.map((act: any, i: number) => (
        <li key={i} className="flex items-start gap-3">
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

export default function OverviewView({ currentUser }: { currentUser: User }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTasks().catch(() => ({ success: false, data: [] })),
      getUsers().catch(() => ({ success: false, data: [] })),
      getAnalytics().catch(() => ({ success: false, data: null }))
    ]).then(([tasksRes, usersRes, analyticsRes]) => {
      setTasks(tasksRes?.data || []);
      setUsers(usersRes?.data || []);
      setAnalytics(analyticsRes?.data || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (currentUser.accessLevel <= 2) {
    return <GlobalDashboard users={users} tasks={tasks} analytics={analytics} />;
  }

  if (currentUser.accessLevel >= 3 && currentUser.accessLevel <= 5) {
    return <VentureDashboard currentUser={currentUser} users={users} tasks={tasks} analytics={analytics} />;
  }

  return <PersonalDashboard currentUser={currentUser} tasks={tasks} analytics={analytics} />;
}

function GlobalDashboard({ users, tasks, analytics }: { users: any[], tasks: any[], analytics: any }) {
  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;

  const velocity = analytics?.taskVelocity || [];
  const budgets = analytics?.budgetDistribution || [];
  const distribution = analytics?.userDistribution || [];
  const activity = analytics?.recentActivity || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={totalUsers} icon={<Users size={18} />} accent="var(--color-purple-glow)" />
        <StatCard label="Active Tasks" value={inProgressTasks} icon={<Clock size={18} />} accent="var(--color-cyan)" />
        <StatCard label="Completed Tasks" value={completedTasks} icon={<CheckCircle size={18} />} accent="var(--color-emerald)" />
        <StatCard label="System Health" value="99.8%" icon={<Activity size={18} />} accent="var(--color-amber)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Live Task Completion Velocity (7 Days)"
            description="Tasks marked complete each day this week."
          />
          {velocity.length === 0 ? (
            <EmptyState
              icon={<LineChartIcon size={20} />}
              title="No velocity data yet"
              description="Once tasks start being completed, the last seven days of throughput appear here."
            />
          ) : (
            <div
              className="h-72 w-full"
              role="img"
              aria-label={`Line chart of tasks completed per day over the last 7 days: ${describeSeries(velocity, 'name', 'completed')}.`}
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={288} minWidth={0}>
                <LineChart data={velocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                  <RechartsTooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: 'var(--color-text-primary)' }}
                  />
                  <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="var(--color-purple-glow)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-purple-glow)', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader title="Budget Distribution by Venture" description="Total project budget per operating unit." />
          {budgets.length === 0 ? (
            <EmptyState
              icon={<HardDrive size={20} />}
              title="No budgets recorded"
              description="Add a budget to a project and each venture's share shows up here."
            />
          ) : (
            <div
              className="h-60 w-full"
              role="img"
              aria-label={`Bar chart of project budget by venture: ${describeSeries(budgets, 'venture', 'total_budget', money)}.`}
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <BarChart data={budgets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="venture" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} dx={-10} />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--color-bg-secondary)' }}
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, 'Budget']}
                  />
                  <Bar dataKey="total_budget" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {budgets.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || 'var(--color-purple-glow)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader title="Active User Distribution" description="Where the team currently sits." />
          {distribution.length === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              title="No people to chart"
              description="Invite teammates and their distribution across ventures appears here."
            />
          ) : (
            <div
              className="relative flex h-60 w-full items-center justify-center"
              role="img"
              aria-label={`Donut chart of active users by venture: ${describeSeries(distribution, 'name', 'value')}.`}
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <PieChart>
                  <Pie data={distribution} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                    {distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || 'var(--color-purple-glow)'} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader title="Recent System Activity" description="The latest audited actions." />
          <ActivityFeed items={activity.slice(0, 5)} accent="var(--color-purple-glow)" />
        </Card>
      </div>
    </div>
  );
}

function VentureDashboard({ currentUser, users, tasks, analytics }: { currentUser: User, users: any[], tasks: any[], analytics: any }) {
  const ventureSlug = currentUser.venture?.slug || 'dropwing';
  const ventureColor = currentUser.venture?.primaryColor || 'var(--color-purple-glow)';

  const ventureUsers = users.filter(u => u.ventureId === ventureSlug || u.venture?.slug === ventureSlug);
  const ventureTasks = tasks.filter(t => t.ventureId === ventureSlug);

  const inProgress = ventureTasks.filter(t => t.status === 'in-progress').length;
  const completed = ventureTasks.filter(t => t.status === 'completed').length;

  const velocity = analytics?.taskVelocity || [];
  const activity = analytics?.recentActivity || [];

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex items-center gap-4 rounded-[var(--radius-card)] border p-6"
        style={{
          background: `linear-gradient(135deg, ${tint(ventureColor, 4)}, transparent)`,
          borderColor: tint(ventureColor, 12),
        }}
      >
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] border"
          style={{ background: 'var(--color-bg-card)', borderColor: tint(ventureColor, 25), color: ventureColor }}
        >
          <LayoutDashboard size={24} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">{currentUser.venture?.name || 'Venture'} Overview</h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Managing your team and ongoing operations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Team Members" value={ventureUsers.length || 0} icon={<Users size={18} />} accent={ventureColor} />
        <StatCard label="Active Projects" value={inProgress} icon={<Activity size={18} />} accent="var(--color-amber)" />
        <StatCard label="Tasks Completed" value={completed} icon={<CheckCircle size={18} />} accent="var(--color-emerald)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader title="Venture Task Velocity (7 Days)" description="Tasks completed by this venture each day." />
          {velocity.length === 0 ? (
            <EmptyState
              icon={<LineChartIcon size={20} />}
              title="No velocity data yet"
              description="Complete a few tasks and this week's throughput will be charted here."
            />
          ) : (
            <div
              className="h-72 w-full"
              role="img"
              aria-label={`Line chart of tasks completed per day over the last 7 days: ${describeSeries(velocity, 'name', 'completed')}.`}
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
                <LineChart data={velocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                  <RechartsTooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: 'var(--color-text-primary)' }}
                  />
                  <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={ventureColor} strokeWidth={2.5} dot={{ r: 4, fill: ventureColor, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Team Members" description="People currently assigned to this venture." />
          {ventureUsers.length === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              title="No team members yet"
              description="Nobody is assigned to this venture. Add people and they will be listed here."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ventureUsers.slice(0, 6).map((u, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 transition-colors hover:border-[var(--color-border-hover)]">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-bold"
                    style={{ background: tint(ventureColor, 8), color: ventureColor }}
                  >
                    {u.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{u.fullName}</div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{u.designation || 'Staff'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Recent Venture Activity" description="The latest actions in this venture." />
          <ActivityFeed items={activity.slice(0, 5)} accent={ventureColor} />
        </Card>
      </div>
    </div>
  );
}

function PersonalDashboard({ currentUser, tasks, analytics }: { currentUser: User, tasks: any[], analytics: any }) {
  const myTasks = tasks.filter(t => t.assignedToId === currentUser.id || t.assignedTo?.id === currentUser.id);
  const inProgress = myTasks.filter(t => t.status === 'in-progress');
  const todo = myTasks.filter(t => t.status === 'pending');

  const color = 'var(--color-purple-glow)'; // Default primary color

  const velocity = analytics?.taskVelocity || [];
  const announcements = analytics?.announcements || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="My To-Do Tasks" value={todo.length} icon={<CheckCircle size={18} />} accent="var(--color-amber)" />
        <StatCard label="In Progress" value={inProgress.length} icon={<Clock size={18} />} accent="var(--color-cyan)" />
        <StatCard label="Upcoming Deadlines" value={myTasks.filter(t => t.dueDate && new Date(t.dueDate) > new Date()).length} icon={<Activity size={18} />} accent="var(--color-rose)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader title="Personal Task Velocity (7 Days)" description="Your own completions, day by day." />
          {velocity.length === 0 ? (
            <EmptyState
              icon={<LineChartIcon size={20} />}
              title="No velocity data yet"
              description="Complete a task and your weekly throughput will be charted here."
            />
          ) : (
            <div
              className="h-60 w-full"
              role="img"
              aria-label={`Line chart of tasks completed per day over the last 7 days: ${describeSeries(velocity, 'name', 'completed')}.`}
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
                <LineChart data={velocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                  <RechartsTooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: 'var(--color-text-primary)' }}
                  />
                  <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="My Priority Tasks" description="What is open and in flight for you." />
          {inProgress.length === 0 && todo.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={20} />}
              title="Nothing pending"
              description="No tasks are open or in progress right now. Great job!"
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {[...inProgress, ...todo].slice(0, 5).map(t => (
                <li key={t.id} className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5 transition-colors hover:border-[var(--color-border-hover)]">
                  <div>
                    <div className="mb-1 text-[13px] font-semibold text-[var(--color-text-primary)]">{t.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">{t.status}</span>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background:
                              t.priority === 'High'
                                ? 'var(--color-rose)'
                                : t.priority === 'Medium'
                                  ? 'var(--color-amber)'
                                  : 'var(--color-emerald)',
                          }}
                        />
                        {t.priority} Priority
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Announcements" description="Company-wide notices." />
          {announcements.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={20} />}
              title="No announcements"
              description="Company updates and notices will appear here when they are published."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {announcements.map((ann: any) => (
                <div key={ann.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    {ann.type === 'update'
                      ? <Megaphone size={14} aria-hidden="true" style={{ color: 'var(--color-purple-glow)' }} />
                      : <Bell size={14} aria-hidden="true" style={{ color: 'var(--color-amber)' }} />}
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{ann.type}</div>
                  </div>
                  <div className="mb-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">{ann.title}</div>
                  <div className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{ann.content}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
