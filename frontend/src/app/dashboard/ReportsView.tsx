'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getAnalytics } from '@/lib/api';
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
  contentStyle: {
    background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#e2e8f0', fontSize: 12,
  },
  labelStyle: { color: '#94a3b8' },
};

const MONTHLY = [
  { name: 'Jan', tasks: 24, projects: 3 }, { name: 'Feb', tasks: 36, projects: 5 },
  { name: 'Mar', tasks: 28, projects: 4 }, { name: 'Apr', tasks: 52, projects: 7 },
  { name: 'May', tasks: 44, projects: 6 }, { name: 'Jun', tasks: 61, projects: 8 },
];

const FALLBACK_VEL = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(n => ({ name: n, completed: 0 }));

export default function ReportsView({ currentUser }: { currentUser: User }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview'|'tasks'|'ventures'|'team'>('overview');
  const [range, setRange] = useState('7 Days');

  const color = currentUser.venture?.primaryColor || '#8b5cf6';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalytics();
      if (res.success) setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const vel = data?.taskVelocity?.length ? data.taskVelocity : FALLBACK_VEL;
  const totalVel = vel.reduce((s, d) => s + d.completed, 0);
  const users = data?.userDistribution || [];
  const totalUsers = users.reduce((s, d) => s + d.value, 0);
  const budgets = data?.budgetDistribution || [];
  const totalBudget = budgets.reduce((s, d) => s + (d.total_budget || 0), 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tasks', label: 'Task Velocity', icon: '✅' },
    { id: 'ventures', label: 'Ventures', icon: '🏢' },
    { id: 'team', label: 'Team', icon: '👥' },
  ] as const;

  const StatCard = ({ label, value, sub, c, icon, trend }: { label: string; value: string|number; sub?: string; c: string; icon: string; trend?: string }) => (
    <div style={{ background: `${c}15`, border: `1px solid ${c}30`, borderRadius: 16, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 18, width: 34, height: 34, borderRadius: 10, background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: c, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>{sub}</div>}
      {trend && <div style={{ fontSize: 11, color: trend.startsWith('+') ? '#10b981' : '#f43f5e', fontWeight: 700, marginTop: 4 }}>{trend} vs last period</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 14px', borderRadius: 10, border: tab === t.id ? `1px solid ${color}40` : '1px solid transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
              background: tab === t.id ? `${color}20` : 'rgba(255,255,255,0.04)',
              color: tab === t.id ? color : 'var(--color-text-muted)',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['7 Days','30 Days','90 Days'].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '6px 10px', borderRadius: 8, border: `1px solid ${range === r ? color+'40' : 'transparent'}`,
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: range === r ? `${color}18` : 'transparent',
              color: range === r ? color : 'var(--color-text-muted)',
            }}>{r}</button>
          ))}
          <button onClick={fetchData} style={{
            padding: '7px 12px', borderRadius: 8, border: `1px solid ${color}40`,
            background: `${color}18`, color, cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>↻</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 110, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <StatCard label="Tasks Completed" value={totalVel} sub={`Last ${range}`} c="#10b981" icon="✅" trend="+12%" />
            <StatCard label="Active Team" value={totalUsers} sub="Across ventures" c="#06b6d4" icon="👥" trend="+3" />
            {currentUser.accessLevel <= 4 && (
              <StatCard label="Total Budget" value={`₹${(totalBudget/100000).toFixed(1)}L`} sub="Project budgets" c="#f59e0b" icon="💰" />
            )}
            <StatCard label="Ventures" value={users.length || 4} sub="Operating units" c={color} icon="🏢" />
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="glass" style={{ borderRadius: 20, padding: 24, border: `1px solid ${color}20` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Monthly Performance</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Tasks & projects completed over time</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={MONTHLY}>
                    <defs>
                      <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} labelStyle={CHART_STYLE.labelStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="tasks" stroke={color} fill="url(#ag1)" strokeWidth={2} name="Tasks" />
                    <Area type="monotone" dataKey="projects" stroke="#06b6d4" fill="url(#ag2)" strokeWidth={2} name="Projects" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="glass" style={{ borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Team Distribution</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Active members per venture</div>
                {users.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={users} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                          {users.map((e, i) => <Cell key={i} fill={e.color || color} />)}
                        </Pie>
                        <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 12 }}>
                      {users.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color || color }} />
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                    No team data yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Task Velocity */}
          {tab === 'tasks' && (
            <div className="glass" style={{ borderRadius: 20, padding: 28, border: `1px solid ${color}20` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Task Completion Velocity</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>{totalVel} tasks completed — last 7 days</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={vel} barSize={38}>
                  <defs>
                    <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle} labelStyle={CHART_STYLE.labelStyle} />
                  <Bar dataKey="completed" fill="url(#bg1)" radius={[8,8,0,0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
                {[
                  { label: 'Avg / Day', value: (totalVel/7).toFixed(1), c: '#10b981' },
                  { label: 'Peak Day', value: Math.max(...vel.map(d => d.completed)), c: color },
                  { label: 'Status', value: totalVel > 0 ? '↑ Active' : '— Idle', c: totalVel > 0 ? '#10b981' : '#64748b' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ventures */}
          {tab === 'ventures' && (
            currentUser.accessLevel <= 4 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="glass" style={{ borderRadius: 20, padding: 28, border: `1px solid ${color}20` }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Budget Distribution</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>Project budget per venture</div>
                  {budgets.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={budgets} layout="vertical" barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="venture" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={130} />
                        <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Budget']} />
                        <Bar dataKey="total_budget" radius={[0,8,8,0]}>
                          {budgets.map((e, i) => <Cell key={i} fill={e.color || color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 32 }}>📊</span>
                      <span>Create projects with budgets to see this chart.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass" style={{ borderRadius: 16, padding: 40, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cross-venture analytics require L4 or higher access.</p>
              </div>
            )
          )}

          {/* Team */}
          {tab === 'team' && (
            <div className="glass" style={{ borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Team by Venture</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>Active members across ventures</div>
              {users.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={users} barSize={50}>
                    <defs>
                      {users.map((d, i) => (
                        <linearGradient key={i} id={`tg${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={d.color || color} stopOpacity={1} />
                          <stop offset="100%" stopColor={d.color || color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                    <Bar dataKey="value" radius={[8,8,0,0]} name="Members">
                      {users.map((_, i) => <Cell key={i} fill={`url(#tg${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No team data available</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
