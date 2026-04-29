'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CHART_STYLE = {
  contentStyle: { background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#e2e8f0', fontSize: 12 },
};

interface HeadcountRow { venture: string; color: string; slug: string; total: number; leadership: number; staff: number; interns: number; }
interface DeptRow { department: string; count: number; ventures: string; }
interface LevelRow { level_name: string; level_number: number; count: number; }
interface PerfRow { full_name: string; designation: string; department: string; venture: string; color: string; completed_tasks: number; total_tasks: number; completion_rate: number; }
interface TimesheetRow { venture: string; color: string; avg_hours: number; total_hours: number; members_logged: number; }
interface DeptKPI { department: string; venture: string; color: string; team_size: number; active_projects: number; total_tasks: number; completed_tasks: number; kpi_score: number; }

interface HRData {
  headcount: HeadcountRow[];
  departments: DeptRow[];
  levels: LevelRow[];
  performance: PerfRow[];
  timesheets: TimesheetRow[];
  totals: { total_employees: number; leadership: number; staff: number; interns: number; };
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed', 4: '#06b6d4',
  5: '#f59e0b', 6: '#10b981', 7: '#6366f1', 8: '#94a3b8', 9: '#f43f5e',
};

export default function DepartmentKPIsView({ currentUser }: { currentUser: User }) {
  const [tab, setTab] = useState<'headcount' | 'kpis' | 'performance' | 'timesheets'>('headcount');
  const [hrData, setHrData] = useState<HRData | null>(null);
  const [kpiData, setKpiData] = useState<DeptKPI[]>([]);
  const [loading, setLoading] = useState(true);

  const color = currentUser.accessLevel === 2 ? '#a78bfa' : '#06b6d4';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hrRes, kpiRes] = await Promise.all([
        api.get('/kpis/hr'),
        api.get('/kpis/department'),
      ]);
      if (hrRes.data.success) setHrData(hrRes.data.data);
      if (kpiRes.data.success) setKpiData(kpiRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const TABS = [
    { id: 'headcount' as const, label: 'Headcount', icon: '👥' },
    { id: 'kpis' as const, label: 'Dept KPIs', icon: '📊' },
    { id: 'performance' as const, label: 'Top Performers', icon: '🏆' },
    { id: 'timesheets' as const, label: 'Hours & Effort', icon: '⏱️' },
  ];

  const StatCard = ({ label, value, sub, c }: { label: string; value: string | number; sub?: string; c: string }) => (
    <div style={{ background: `${c}12`, border: `1px solid ${c}28`, borderRadius: 16, padding: '20px 24px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: c, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: 110, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />)}
      </div>
    );
  }

  const totals = hrData?.totals;
  const headcount = hrData?.headcount || [];
  const departments = hrData?.departments || [];
  const performance = hrData?.performance || [];
  const timesheets = hrData?.timesheets || [];
  const levels = hrData?.levels || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 16px', borderRadius: 10, border: tab === t.id ? `1px solid ${color}40` : '1px solid transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
              background: tab === t.id ? `${color}20` : 'rgba(255,255,255,0.04)',
              color: tab === t.id ? color : 'var(--color-text-muted)',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
        <button onClick={fetchData} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${color}40`, background: `${color}18`, color, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>↻ Refresh</button>
      </div>

      {/* KPI Summary Row */}
      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <StatCard label="Total Employees" value={totals.total_employees} sub="Active headcount" c={color} />
          <StatCard label="Leadership" value={totals.leadership} sub="L1–L4 across ventures" c="#8b5cf6" />
          <StatCard label="Staff" value={totals.staff} sub="L5–L7 employees" c="#10b981" />
          <StatCard label="Interns" value={totals.interns} sub="L8 trainees" c="#f59e0b" />
        </div>
      )}

      {/* Headcount Tab */}
      {tab === 'headcount' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Headcount by Venture */}
          <div className="glass" style={{ borderRadius: 20, padding: 24, border: `1px solid ${color}20` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 4 }}>Headcount by Venture</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Active employees per company</div>
            {headcount.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={headcount} barSize={36}>
                    <defs>
                      {headcount.map((h, i) => (
                        <linearGradient key={i} id={`hg${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={h.color} stopOpacity={1} />
                          <stop offset="100%" stopColor={h.color} stopOpacity={0.3} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="venture" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                    <Bar dataKey="total" radius={[8, 8, 0, 0]} name="Total">
                      {headcount.map((_, i) => <Cell key={i} fill={`url(#hg${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {headcount.map(h => (
                    <div key={h.venture} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${h.color}0d`, borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.color }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{h.venture}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        {[{ label: 'Total', val: h.total, c: h.color }, { label: 'Leadership', val: h.leadership, c: '#8b5cf6' }, { label: 'Staff', val: h.staff, c: '#10b981' }, { label: 'Interns', val: h.interns, c: '#f59e0b' }].map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.val}</div>
                            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No headcount data</div>
            )}
          </div>

          {/* Access Level Distribution */}
          <div className="glass" style={{ borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 4 }}>Access Level Distribution</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Employees per access tier</div>
            {levels.filter(l => l.count > 0).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={levels.filter(l => l.count > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                      {levels.filter(l => l.count > 0).map((l, i) => <Cell key={i} fill={LEVEL_COLORS[l.level_number] || color} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v: number, n: string, p: { payload: LevelRow }) => [v, p.payload.level_name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {levels.filter(l => l.count > 0).map(l => (
                    <div key={l.level_number} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLORS[l.level_number] || color }} />
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{l.level_name} ({l.count})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No data available</div>
            )}

            {/* Departments mini-list */}
            {departments.length > 0 && (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Departments</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {departments.slice(0, 8).map(d => (
                    <div key={d.department} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{d.department}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: `${Math.min(100, (d.count / (departments[0]?.count || 1)) * 80)}px`, height: 4, borderRadius: 2, background: color, opacity: 0.7 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 20, textAlign: 'right' }}>{d.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dept KPIs Tab */}
      {tab === 'kpis' && (
        <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${color}20` }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Department KPI Scorecard</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Task completion rates per department — last 30 days</div>
            </div>
          </div>
          {kpiData.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📋</div>
              <p>No KPI data yet. Assign tasks to team members to start tracking performance.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Department', 'Venture', 'Team', 'Projects', 'Tasks', 'Completed', 'KPI Score'].map(h => (
                    <th key={h} style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: h === 'KPI Score' ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpiData.map((d, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 18px', fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{d.department}</td>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.venture}</span>
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.team_size}</td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.active_projects}</td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.total_tasks}</td>
                    <td style={{ padding: '16px 18px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{d.completed_tasks}</td>
                    <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <div style={{ width: 60, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${d.kpi_score || 0}%`, height: '100%', background: (d.kpi_score || 0) >= 70 ? '#10b981' : (d.kpi_score || 0) >= 40 ? '#f59e0b' : '#f43f5e', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: (d.kpi_score || 0) >= 70 ? '#10b981' : (d.kpi_score || 0) >= 40 ? '#f59e0b' : '#f43f5e', minWidth: 36 }}>{d.kpi_score || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Top Performers Tab */}
      {tab === 'performance' && (
        <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${color}20` }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Top Performers — Last 30 Days</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Ranked by tasks completed</div>
          </div>
          {performance.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🏆</div>
              <p>No performance data yet. Assign and complete tasks to see rankings.</p>
            </div>
          ) : (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {performance.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: idx === 0 ? `${color}12` : 'rgba(255,255,255,0.03)', borderRadius: 12, border: idx === 0 ? `1px solid ${color}30` : '1px solid transparent' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: idx < 3 ? ['linear-gradient(135deg,#fbbf24,#f59e0b)', 'linear-gradient(135deg,#94a3b8,#64748b)', 'linear-gradient(135deg,#cd7c2f,#92400e)'][idx] : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: idx < 3 ? 18 : 14, fontWeight: 800, color: idx < 3 ? '#fff' : 'var(--color-text-muted)', flexShrink: 0 }}>
                    {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx+1}`}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.designation} • {p.department}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.venture}</span>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{p.completed_tasks}</div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>COMPLETED</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: (p.completion_rate || 0) >= 70 ? '#10b981' : '#f59e0b' }}>{p.completion_rate || 0}%</div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>RATE</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hours & Effort Tab */}
      {tab === 'timesheets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {timesheets.length === 0 ? (
            <div className="glass" style={{ borderRadius: 16, padding: 60, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>⏱️</div>
              <p style={{ color: 'var(--color-text-muted)' }}>No timesheet data found for the last 30 days.</p>
            </div>
          ) : (
            <>
              <div className="glass" style={{ borderRadius: 20, padding: 28, border: `1px solid ${color}20` }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 4 }}>Hours Logged by Venture</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Last 30 days — total & average hours</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={timesheets} barSize={44}>
                    <defs>
                      {timesheets.map((ts, i) => (
                        <linearGradient key={i} id={`tsg${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ts.color} stopOpacity={1} />
                          <stop offset="100%" stopColor={ts.color} stopOpacity={0.3} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="venture" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v: number) => [`${v}h`, 'Total Hours']} />
                    <Bar dataKey="total_hours" radius={[8, 8, 0, 0]} name="Total Hours">
                      {timesheets.map((_, i) => <Cell key={i} fill={`url(#tsg${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {timesheets.map(ts => (
                  <div key={ts.venture} style={{ background: `${ts.color}12`, border: `1px solid ${ts.color}25`, borderRadius: 16, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: ts.color }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{ts.venture}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[{ label: 'Total hrs', val: `${ts.total_hours}h`, c: ts.color }, { label: 'Avg hrs', val: `${ts.avg_hours}h`, c: '#f59e0b' }, { label: 'Members', val: ts.members_logged, c: '#10b981' }].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: String(s.c) }}>{s.val}</div>
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: 0.5, marginTop: 2 }}>{s.label.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
