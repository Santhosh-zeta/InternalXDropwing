'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getAnalytics } from '@/lib/api';
import { BarChart3, CheckCircle2, Users, Building2, DollarSign, RefreshCw, Lock, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface AnalyticsData {
  budgetDistribution: { venture: string; color: string; total_budget: number }[];
  taskVelocity: { name: string; completed: number }[];
  userDistribution: { name: string; value: number; color: string }[];
}

const CHART_STYLE = {
  contentStyle: { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 },
  labelStyle: { color: 'var(--color-text-muted)' },
};

const FALLBACK_VEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(n => ({ name: n, completed: 0 }));
const FALLBACK_MONTHLY = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(n => ({ name: n, tasks: 0, projects: 0 }));

const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: <BarChart3 size={15} /> },
  { id: 'tasks' as const, label: 'Task Velocity', icon: <CheckCircle2 size={15} /> },
  { id: 'ventures' as const, label: 'Ventures', icon: <Building2 size={15} /> },
  { id: 'team' as const, label: 'Team', icon: <Users size={15} /> },
];

function StatCard({ label, value, sub, c, icon, trend }: { label: string; value: string | number; sub?: string; c: string; icon: React.ReactNode; trend?: string }) {
  return (
    <div className="rounded-2xl p-5 border shadow-sm" style={{ background: `${c}12`, borderColor: `${c}28` }}>
      <div className="flex justify-between items-start mb-3">
        <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{label}</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: `${c}20`, color: c, borderColor: `${c}30` }}>{icon}</div>
      </div>
      <div className="text-3xl font-black leading-none" style={{ color: c }}>{value}</div>
      {sub && <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-2">{sub}</div>}
      {trend && <div className="text-[11px] font-bold mt-1" style={{ color: trend.startsWith('+') ? '#10b981' : '#f43f5e' }}>{trend} vs last period</div>}
    </div>
  );
}

export default function ReportsView({ currentUser }: { currentUser: User }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'tasks' | 'ventures' | 'team'>('overview');
  const [range, setRange] = useState('7 Days');

  const color = currentUser.venture?.primaryColor || '#8b5cf6';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getAnalytics(); if (res.success) setData(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const vel = data?.taskVelocity?.length ? data.taskVelocity : FALLBACK_VEL;
  const totalVel = vel.reduce((s, d) => s + d.completed, 0);
  const users = data?.userDistribution || [];
  const totalUsers = users.reduce((s, d) => s + d.value, 0);
  const budgets = data?.budgetDistribution || [];
  const totalBudget = budgets.reduce((s, d) => s + (d.total_budget || 0), 0);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Controls */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2 bg-[var(--color-bg-secondary)] p-1.5 rounded-xl border border-[var(--color-border)]">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 transition-all border ${tab === t.id ? 'bg-[var(--color-bg-card)] border-[var(--color-border)] shadow-sm' : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-primary)]'}`}
              style={tab === t.id ? { color } : {}}
            >{t.icon} {t.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {['7 Days', '30 Days', '90 Days'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${range === r ? 'border-[var(--color-border)] bg-[var(--color-bg-card)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
              style={range === r ? { color } : {}}
            >{r}</button>
          ))}
          <button onClick={fetchData} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 text-[12px] font-bold">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
          <p className="text-[var(--color-text-muted)] font-medium text-sm">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tasks Completed" value={totalVel} sub={`Last ${range}`} c="#10b981" icon={<CheckCircle2 size={16} />} trend="+12%" />
            <StatCard label="Active Team" value={totalUsers} sub="Across ventures" c="#06b6d4" icon={<Users size={16} />} trend="+3" />
            {currentUser.accessLevel <= 4 && (
              <StatCard label="Total Budget" value={`₹${(totalBudget / 100000).toFixed(1)}L`} sub="Project budgets" c="#f59e0b" icon={<DollarSign size={16} />} />
            )}
            <StatCard label="Ventures" value={users.length || 4} sub="Operating units" c={color} icon={<Building2 size={16} />} />
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                <div className="font-bold text-[14px] text-[var(--color-text-primary)] mb-1">Monthly Performance</div>
                <div className="text-[12px] font-medium text-[var(--color-text-muted)] mb-5">Tasks &amp; projects completed over time</div>
                <ResponsiveContainer width="100%" height={220} minHeight={220} minWidth={0}>
                  <AreaChart data={data?.monthlyPerformance?.length ? data.monthlyPerformance : FALLBACK_MONTHLY}>
                    <defs>
                      <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} /><stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} labelStyle={CHART_STYLE.labelStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="tasks" stroke={color} fill="url(#ag1)" strokeWidth={2} name="Tasks" />
                    <Area type="monotone" dataKey="projects" stroke="#06b6d4" fill="url(#ag2)" strokeWidth={2} name="Projects" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                <div className="font-bold text-[14px] text-[var(--color-text-primary)] mb-1">Team Distribution</div>
                <div className="text-[12px] font-medium text-[var(--color-text-muted)] mb-5">Active members per venture</div>
                {users.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160} minHeight={160} minWidth={0}>
                      <PieChart>
                        <Pie data={users} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                          {users.map((e, i) => <Cell key={i} fill={e.color || color} />)}
                        </Pie>
                        <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-3">
                      {users.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: d.color || color }} />
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-[var(--color-text-muted)] text-[13px] font-medium">No team data yet</div>
                )}
              </div>
            </div>
          )}

          {/* Task Velocity */}
          {tab === 'tasks' && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-7 shadow-sm">
              <div className="font-bold text-[16px] text-[var(--color-text-primary)] mb-1">Task Completion Velocity</div>
              <div className="text-[13px] font-medium text-[var(--color-text-muted)] mb-6">{totalVel} tasks completed — last 7 days</div>
              <ResponsiveContainer width="100%" height={280} minHeight={280} minWidth={0}>
                <BarChart data={vel} barSize={38}>
                  <defs>
                    <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} /><stop offset="100%" stopColor={color} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle} labelStyle={CHART_STYLE.labelStyle} />
                  <Bar dataKey="completed" fill="url(#bg1)" radius={[8, 8, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-4 mt-6">
                {[
                  { label: 'Avg / Day', value: (totalVel / 7).toFixed(1), c: '#10b981' },
                  { label: 'Peak Day', value: Math.max(...vel.map(d => d.completed)), c: color },
                  { label: 'Status', value: totalVel > 0 ? '↑ Active' : '— Idle', c: totalVel > 0 ? '#10b981' : '#64748b' },
                ].map(s => (
                  <div key={s.label} className="text-center p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
                    <div className="text-2xl font-black" style={{ color: s.c }}>{s.value}</div>
                    <div className="text-[11px] font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ventures */}
          {tab === 'ventures' && (
            currentUser.accessLevel <= 4 ? (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-7 shadow-sm">
                <div className="font-bold text-[16px] text-[var(--color-text-primary)] mb-1">Budget Distribution</div>
                <div className="text-[13px] font-medium text-[var(--color-text-muted)] mb-6">Project budget per venture</div>
                {budgets.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240} minHeight={240} minWidth={0}>
                    <BarChart data={budgets} layout="vertical" barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="venture" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={130} />
                      <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Budget']} />
                      <Bar dataKey="total_budget" radius={[0, 8, 8, 0]}>
                        {budgets.map((e, i) => <Cell key={i} fill={e.color || color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-[var(--color-text-muted)] text-[13px] font-medium gap-2">
                    <Building2 size={32} className="opacity-30" />
                    <span>Create projects with budgets to see this chart.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
                <Lock size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-40" />
                <p className="text-[var(--color-text-secondary)] font-medium text-sm">Cross-venture analytics require L4 or higher access.</p>
              </div>
            )
          )}

          {/* Team */}
          {tab === 'team' && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-7 shadow-sm">
              <div className="font-bold text-[16px] text-[var(--color-text-primary)] mb-1">Team by Venture</div>
              <div className="text-[13px] font-medium text-[var(--color-text-muted)] mb-6">Active members across ventures</div>
              {users.length > 0 ? (
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
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Members">
                      {users.map((_, i) => <Cell key={i} fill={`url(#tg${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[var(--color-text-muted)] text-[13px] font-medium">No team data available</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
