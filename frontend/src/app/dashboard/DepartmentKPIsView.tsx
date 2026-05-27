'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import { Users, BarChart3, Trophy, Clock, RefreshCw, Loader2 } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CHART_STYLE = {
  contentStyle: { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 },
};

interface HeadcountRow { venture: string; color: string; slug: string; total: number; leadership: number; staff: number; interns: number; }
interface DeptRow { department: string; count: number; ventures: string; }
interface LevelRow { level_name: string; level_number: number; count: number; }
interface PerfRow { full_name: string; designation: string; department: string; venture: string; color: string; completed_tasks: number; total_tasks: number; completion_rate: number; }
interface TimesheetRow { venture: string; color: string; avg_hours: number; total_hours: number; members_logged: number; }
interface DeptKPI { department: string; venture: string; color: string; team_size: number; active_projects: number; total_tasks: number; completed_tasks: number; kpi_score: number; }
interface HRData { headcount: HeadcountRow[]; departments: DeptRow[]; levels: LevelRow[]; performance: PerfRow[]; timesheets: TimesheetRow[]; totals: { total_employees: number; leadership: number; staff: number; interns: number; }; }

const LEVEL_COLORS: Record<number, string> = { 1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed', 4: '#06b6d4', 5: '#f59e0b', 6: '#10b981', 7: '#6366f1', 8: '#94a3b8', 9: '#f43f5e' };

const TABS = [
  { id: 'headcount' as const, label: 'Headcount', icon: <Users size={15} /> },
  { id: 'kpis' as const, label: 'Dept KPIs', icon: <BarChart3 size={15} /> },
  { id: 'performance' as const, label: 'Top Performers', icon: <Trophy size={15} /> },
  { id: 'timesheets' as const, label: 'Hours & Effort', icon: <Clock size={15} /> },
];

function StatCard({ label, value, sub, c }: { label: string; value: string | number; sub?: string; c: string }) {
  return (
    <div className="rounded-2xl p-5 border shadow-sm" style={{ background: `${c}10`, borderColor: `${c}25` }}>
      <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">{label}</div>
      <div className="text-3xl font-black leading-none" style={{ color: c }}>{value}</div>
      {sub && <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-2">{sub}</div>}
    </div>
  );
}

function kpiColor(score: number) { return score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f43f5e'; }

export default function DepartmentKPIsView({ currentUser }: { currentUser: User }) {
  const [tab, setTab] = useState<'headcount' | 'kpis' | 'performance' | 'timesheets'>('headcount');
  const [hrData, setHrData] = useState<HRData | null>(null);
  const [kpiData, setKpiData] = useState<DeptKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const color = currentUser.accessLevel === 2 ? '#a78bfa' : '#06b6d4';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hrRes, kpiRes] = await Promise.all([api.get('/kpis/hr'), api.get('/kpis/department')]);
      if (hrRes.data.success) setHrData(hrRes.data.data);
      if (kpiRes.data.success) setKpiData(kpiRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totals = hrData?.totals;
  const headcount = hrData?.headcount || [];
  const departments = hrData?.departments || [];
  const performance = hrData?.performance || [];
  const timesheets = hrData?.timesheets || [];
  const levels = hrData?.levels || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
        <p className="text-[var(--color-text-muted)] font-medium text-sm">Loading HR data...</p>
      </div>
    );
  }

  const RANK_STYLES = [
    { bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)', label: '1st' },
    { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', label: '2nd' },
    { bg: 'linear-gradient(135deg,#cd7c2f,#92400e)', label: '3rd' },
  ];

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
        <button onClick={fetchData} className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-[13px] font-bold flex items-center gap-2 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI Summary */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Employees" value={totals.total_employees} sub="Active headcount" c={color} />
          <StatCard label="Leadership" value={totals.leadership} sub="L1–L4 across ventures" c="#8b5cf6" />
          <StatCard label="Staff" value={totals.staff} sub="L5–L7 employees" c="#10b981" />
          <StatCard label="Interns" value={totals.interns} sub="L8 trainees" c="#f59e0b" />
        </div>
      )}

      {/* Headcount Tab */}
      {tab === 'headcount' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
            <div className="font-bold text-[14px] text-[var(--color-text-primary)] mb-1">Headcount by Venture</div>
            <div className="text-[12px] font-medium text-[var(--color-text-muted)] mb-5">Active employees per company</div>
            {headcount.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180} minHeight={180} minWidth={0}>
                  <BarChart data={headcount} barSize={36}>
                    <defs>{headcount.map((h, i) => <linearGradient key={i} id={`hg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={h.color} stopOpacity={1} /><stop offset="100%" stopColor={h.color} stopOpacity={0.3} /></linearGradient>)}</defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="venture" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                    <Bar dataKey="total" radius={[8, 8, 0, 0]} name="Total">{headcount.map((_, i) => <Cell key={i} fill={`url(#hg${i})`} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-col gap-2.5">
                  {headcount.map(h => (
                    <div key={h.venture} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--color-border)]" style={{ background: `${h.color}0d` }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                        <span className="font-bold text-[13px] text-[var(--color-text-primary)]">{h.venture}</span>
                      </div>
                      <div className="flex gap-4">
                        {[{ label: 'Total', val: h.total, c: h.color }, { label: 'Lead', val: h.leadership, c: '#8b5cf6' }, { label: 'Staff', val: h.staff, c: '#10b981' }, { label: 'Intern', val: h.interns, c: '#f59e0b' }].map(s => (
                          <div key={s.label} className="text-center">
                            <div className="text-[14px] font-black" style={{ color: s.c }}>{s.val}</div>
                            <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="h-44 flex items-center justify-center text-[var(--color-text-muted)] text-[13px] font-medium">No headcount data</div>}
          </div>

          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
            <div className="font-bold text-[14px] text-[var(--color-text-primary)] mb-1">Access Level Distribution</div>
            <div className="text-[12px] font-medium text-[var(--color-text-muted)] mb-5">Employees per access tier</div>
            {levels.filter(l => l.count > 0).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160} minHeight={160} minWidth={0}>
                  <PieChart>
                    <Pie data={levels.filter(l => l.count > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                      {levels.filter(l => l.count > 0).map((l, i) => <Cell key={i} fill={LEVEL_COLORS[l.level_number] || color} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v, _n, p) => [Number(v ?? 0), p.payload.level_name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {levels.filter(l => l.count > 0).map(l => (
                    <div key={l.level_number} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: LEVEL_COLORS[l.level_number] || color }} />
                      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{l.level_name} ({l.count})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="h-44 flex items-center justify-center text-[var(--color-text-muted)] text-[13px] font-medium">No data available</div>}

            {departments.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Departments</div>
                <div className="flex flex-col gap-2">
                  {departments.slice(0, 8).map(d => (
                    <div key={d.department} className="flex justify-between items-center">
                      <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">{d.department}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(80, (d.count / (departments[0]?.count || 1)) * 80)}px`, background: color, opacity: 0.7 }} />
                        <span className="text-[12px] font-black min-w-[20px] text-right" style={{ color }}>{d.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dept KPIs */}
      {tab === 'kpis' && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="font-bold text-[15px] text-[var(--color-text-primary)]">Department KPI Scorecard</div>
            <div className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">Task completion rates per department — last 30 days</div>
          </div>
          {kpiData.length === 0 ? (
            <div className="p-16 text-center"><BarChart3 size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" /><p className="text-[var(--color-text-secondary)] font-medium">No KPI data yet. Assign tasks to start tracking.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                    {['Department', 'Venture', 'Team', 'Projects', 'Tasks', 'Completed', 'KPI Score'].map(h => (
                      <th key={h} className={`px-5 py-3.5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h === 'KPI Score' ? 'text-center' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpiData.map((d, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="px-5 py-4 font-bold text-[14px] text-[var(--color-text-primary)]">{d.department}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                          <span className="text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.venture}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.team_size}</td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.active_projects}</td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.total_tasks}</td>
                      <td className="px-5 py-4 text-[13px] font-black text-emerald-500">{d.completed_tasks}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-14 h-1.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${d.kpi_score || 0}%`, background: kpiColor(d.kpi_score || 0) }} />
                          </div>
                          <span className="text-[13px] font-black min-w-[36px]" style={{ color: kpiColor(d.kpi_score || 0) }}>{d.kpi_score || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top Performers */}
      {tab === 'performance' && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="font-bold text-[15px] text-[var(--color-text-primary)]">Top Performers — Last 30 Days</div>
            <div className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">Ranked by tasks completed</div>
          </div>
          {performance.length === 0 ? (
            <div className="p-16 text-center"><Trophy size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" /><p className="text-[var(--color-text-secondary)] font-medium">No performance data yet. Assign and complete tasks to see rankings.</p></div>
          ) : (
            <div className="p-5 flex flex-col gap-3">
              {performance.map((p, idx) => (
                <div key={idx}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-colors"
                  style={{ background: idx === 0 ? `${color}10` : 'var(--color-bg-secondary)', borderColor: idx === 0 ? `${color}30` : 'var(--color-border)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[13px] shrink-0 text-white"
                    style={{ background: idx < 3 ? RANK_STYLES[idx].bg : 'var(--color-border)' }}>
                    {idx < 3 ? RANK_STYLES[idx].label : `#${idx + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-[var(--color-text-primary)] truncate">{p.full_name}</div>
                    <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-0.5">{p.designation} • {p.department}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">{p.venture}</span>
                  </div>
                  <div className="text-center min-w-[56px]">
                    <div className="text-xl font-black text-emerald-500">{p.completed_tasks}</div>
                    <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Completed</div>
                  </div>
                  <div className="text-center min-w-[48px]">
                    <div className="text-[15px] font-black" style={{ color: kpiColor(p.completion_rate || 0) }}>{p.completion_rate || 0}%</div>
                    <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Rate</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hours & Effort */}
      {tab === 'timesheets' && (
        timesheets.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
            <Clock size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-[var(--color-text-secondary)] font-medium">No timesheet data found for the last 30 days.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
              <div className="font-bold text-[14px] text-[var(--color-text-primary)] mb-1">Hours Logged by Venture</div>
              <div className="text-[12px] font-medium text-[var(--color-text-muted)] mb-5">Last 30 days — total &amp; average hours</div>
              <ResponsiveContainer width="100%" height={200} minHeight={200} minWidth={0}>
                <BarChart data={timesheets} barSize={44}>
                  <defs>{timesheets.map((ts, i) => <linearGradient key={i} id={`tsg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ts.color} stopOpacity={1} /><stop offset="100%" stopColor={ts.color} stopOpacity={0.3} /></linearGradient>)}</defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="venture" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v) => [`${Number(v ?? 0)}h`, 'Total Hours']} />
                  <Bar dataKey="total_hours" radius={[8, 8, 0, 0]} name="Total Hours">{timesheets.map((_, i) => <Cell key={i} fill={`url(#tsg${i})`} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {timesheets.map(ts => (
                <div key={ts.venture} className="rounded-2xl p-5 border shadow-sm" style={{ background: `${ts.color}10`, borderColor: `${ts.color}25` }}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: ts.color }} />
                    <span className="font-bold text-[14px] text-[var(--color-text-primary)]">{ts.venture}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: 'Total', val: `${ts.total_hours}h`, c: ts.color }, { label: 'Avg', val: `${ts.avg_hours}h`, c: '#f59e0b' }, { label: 'Members', val: ts.members_logged, c: '#10b981' }].map(s => (
                      <div key={s.label} className="text-center p-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
                        <div className="text-[15px] font-black" style={{ color: s.c }}>{s.val}</div>
                        <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
