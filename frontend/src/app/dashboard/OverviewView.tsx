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
  CheckCircle2, Loader2, Megaphone, Bell, LayoutDashboard
} from 'lucide-react';

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
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
        <p className="text-[var(--color-text-muted)] text-sm font-medium">Compiling analytics dashboard...</p>
      </div>
    );
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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={totalUsers} icon={Users} color="#8b5cf6" />
        <StatCard title="Active Tasks" value={inProgressTasks} icon={Clock} color="#06b6d4" />
        <StatCard title="Completed Tasks" value={completedTasks} icon={CheckCircle} color="#10b981" />
        <StatCard title="System Health" value="99.8%" icon={Activity} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Live Task Completion Velocity (7 Days)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={288} minWidth={0}>
              <LineChart data={analytics?.taskVelocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
                <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Budget Distribution by Venture</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
              <BarChart data={analytics?.budgetDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="venture" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} dx={-10} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--color-bg-secondary)' }} 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                  formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, 'Budget']}
                />
                <Bar dataKey="total_budget" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {(analytics?.budgetDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Active User Distribution</h3>
          <div className="h-60 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
              <PieChart>
                <Pie data={analytics?.userDistribution || []} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                  {(analytics?.userDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#8b5cf6'} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Recent System Activity</h3>
          <div className="flex flex-col gap-4">
            {(analytics?.recentActivity || []).length > 0 ? (
              (analytics?.recentActivity || []).slice(0, 5).map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shrink-0">
                    <Activity size={12} className="text-[var(--color-purple-glow)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{act.action}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{new Date(act.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-[12px] text-[var(--color-text-muted)]">No recent activity logs found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VentureDashboard({ currentUser, users, tasks, analytics }: { currentUser: User, users: any[], tasks: any[], analytics: any }) {
  const ventureSlug = currentUser.venture?.slug || 'dropwing';
  const ventureColor = currentUser.venture?.primaryColor || '#8b5cf6';
  
  const ventureUsers = users.filter(u => u.ventureId === ventureSlug || u.venture?.slug === ventureSlug);
  const ventureTasks = tasks.filter(t => t.ventureId === ventureSlug);
  
  const inProgress = ventureTasks.filter(t => t.status === 'in-progress').length;
  const completed = ventureTasks.filter(t => t.status === 'completed').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 p-6 rounded-xl border" style={{ background: `linear-gradient(135deg, ${ventureColor}05, transparent)`, borderColor: `${ventureColor}20` }}>
        <div className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0" style={{ background: 'var(--color-bg-card)', borderColor: `${ventureColor}40`, color: ventureColor }}>
          <LayoutDashboard size={24} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">{currentUser.venture?.name || 'Venture'} Overview</h2>
          <p className="text-[13px] text-[var(--color-text-muted)] mt-1">Managing your team and ongoing operations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Team Members" value={ventureUsers.length || 0} icon={Users} color={ventureColor} />
        <StatCard title="Active Projects" value={inProgress} icon={Activity} color="#f59e0b" />
        <StatCard title="Tasks Completed" value={completed} icon={CheckCircle} color="#10b981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Venture Task Velocity (7 Days)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
              <LineChart data={analytics?.taskVelocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
                <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={ventureColor} strokeWidth={2.5} dot={{ r: 4, fill: ventureColor, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Team Members</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(ventureUsers.length ? ventureUsers.slice(0, 6) : []).map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-muted)] transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-[var(--color-border)]" style={{ background: `${ventureColor}15`, color: ventureColor }}>
                  {u.fullName?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{u.fullName}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{u.designation || 'Staff'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Recent Venture Activity</h3>
          <div className="flex flex-col gap-4">
            {(analytics?.recentActivity || []).length > 0 ? (
              (analytics?.recentActivity || []).slice(0, 5).map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shrink-0">
                    <Activity size={12} style={{ color: ventureColor }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{act.action}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{new Date(act.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-[12px] text-[var(--color-text-muted)]">No recent activity logs found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalDashboard({ currentUser, tasks, analytics }: { currentUser: User, tasks: any[], analytics: any }) {
  const myTasks = tasks.filter(t => t.assignedToId === currentUser.id || t.assignedTo?.id === currentUser.id);
  const inProgress = myTasks.filter(t => t.status === 'in-progress');
  const todo = myTasks.filter(t => t.status === 'pending');

  const color = '#8b5cf6'; // Default primary color

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="My To-Do Tasks" value={todo.length} icon={CheckCircle} color="#f59e0b" />
        <StatCard title="In Progress" value={inProgress.length} icon={Clock} color="#06b6d4" />
        <StatCard title="Upcoming Deadlines" value={myTasks.filter(t => t.dueDate && new Date(t.dueDate) > new Date()).length} icon={Activity} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Personal Task Velocity (7 Days)</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
              <LineChart data={analytics?.taskVelocity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
                <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">My Priority Tasks</h3>
          {inProgress.length === 0 && todo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-bg-secondary)]">
              <CheckCircle size={32} className="text-[var(--color-text-muted)] mb-3" />
              <p className="text-[13px] font-medium text-[var(--color-text-muted)]">No pending tasks right now. Great job!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...inProgress, ...todo].slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-muted)] transition-colors">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">{t.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">{t.status}</span>
                      <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.priority === 'High' ? 'bg-rose-500' : t.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {t.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 tracking-wide">Announcements</h3>
          <div className="flex flex-col gap-4">
            {(analytics?.announcements || []).length > 0 ? (
              (analytics?.announcements).map((ann: any) => (
                <div key={ann.id} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <div className="flex items-center gap-1.5 mb-2">
                    {ann.type === 'update' ? <Megaphone size={14} className="text-[var(--color-purple-glow)]" /> : <Bell size={14} className="text-amber-500" />}
                    <div className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-text-muted)]">{ann.type}</div>
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1.5">{ann.title}</div>
                  <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">{ann.content}</div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-[12px] text-[var(--color-text-muted)]">No new announcements.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: React.ElementType, color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:border-[var(--color-text-muted)] transition-colors flex items-start justify-between">
      <div>
        <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">{title}</div>
        <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: `${color}10`, borderColor: `${color}30`, color }}>
        <Icon size={18} strokeWidth={2} />
      </div>
    </div>
  );
}
