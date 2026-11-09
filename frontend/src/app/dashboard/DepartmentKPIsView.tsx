'use client';

import { useState } from 'react';
import { User } from '@/lib/constants';
import { apiGet } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { describeSeries } from '@/lib/format';
import type { Envelope } from '@/lib/types';
import { Users, BarChart3, Trophy, Clock, RefreshCw, ShieldCheck, Briefcase, GraduationCap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button, Card, CardHeader, StatCard, EmptyState, cn, tint } from '@/components/ui';
import { CHART_STYLE, AXIS_TICK, AXIS_TICK_SM, DeptKPI, HRData, LEVEL_COLORS, TABS, kpiColor, KPISkeleton, RANK_STYLES } from './kpis/model';

export default function DepartmentKPIsView({ currentUser }: { currentUser: User }) {
  const [tab, setTab] = useState<'headcount' | 'kpis' | 'performance' | 'timesheets'>('headcount');
  const color = currentUser.accessLevel === 2 ? 'var(--color-purple-light)' : 'var(--color-cyan)';

  const { data, loading, error, refetch: fetchData } = useApi('kpis', async (signal) => {
    const [hr, kpi] = await Promise.all([
      apiGet<Envelope<HRData>>('/kpis/hr', signal),
      apiGet<Envelope<DeptKPI[]>>('/kpis/department', signal),
    ]);
    if (!hr.success) throw new Error(hr.message || 'Could not load department data');
    return { hr: hr.data, kpis: kpi.success ? kpi.data : [] };
  });
  const hrData = data?.hr ?? null;
  const kpiData = data?.kpis ?? [];

  const totals = hrData?.totals;
  const headcount = hrData?.headcount || [];
  const departments = hrData?.departments || [];
  const performance = hrData?.performance || [];
  const timesheets = hrData?.timesheets || [];
  const levels = hrData?.levels || [];
  const activeLevels = levels.filter(l => l.count > 0);
  const maxDeptCount = departments[0]?.count || 1;

  if (loading) {
    return <KPISkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        tone="error"
        icon={<BarChart3 size={22} aria-hidden="true" />}
        title="Department data unavailable"
        description={error}
        action={
          <Button variant="primary" leadingIcon={<RefreshCw size={16} aria-hidden="true" />} onClick={fetchData}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="HR report section"
          className="flex max-w-full flex-wrap gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1.5"
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
        <Button
          variant="secondary"
          onClick={fetchData}
          loading={loading}
          leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Summary */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Employees"
            value={totals.total_employees}
            accent={color}
            icon={<Users size={18} />}
            delta={{ value: 'Active headcount', direction: 'flat' }}
          />
          <StatCard
            label="Leadership"
            value={totals.leadership}
            accent="var(--color-purple-glow)"
            icon={<ShieldCheck size={18} />}
            delta={{ value: 'L1–L4 across ventures', direction: 'flat' }}
          />
          <StatCard
            label="Staff"
            value={totals.staff}
            accent="var(--color-emerald)"
            icon={<Briefcase size={18} />}
            delta={{ value: 'L5–L7 employees', direction: 'flat' }}
          />
          <StatCard
            label="Interns"
            value={totals.interns}
            accent="var(--color-amber)"
            icon={<GraduationCap size={18} />}
            delta={{ value: 'L8 trainees', direction: 'flat' }}
          />
        </div>
      )}

      {/* Headcount Tab */}
      {tab === 'headcount' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Headcount by Venture" description="Active employees per company" />
            {headcount.length > 0 ? (
              <>
                <div
                  role="img"
                  aria-label={`Bar chart of active employees per venture: ${describeSeries(headcount, 'venture', 'total')}.`}
                >
                  <ResponsiveContainer width="100%" height={180} minHeight={180} minWidth={0}>
                    <BarChart data={headcount} barSize={36}>
                      <defs>{headcount.map((h, i) => <linearGradient key={i} id={`hg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={h.color} stopOpacity={1} /><stop offset="100%" stopColor={h.color} stopOpacity={0.3} /></linearGradient>)}</defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="venture" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} name="Total">{headcount.map((_, i) => <Cell key={i} fill={`url(#hg${i})`} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {headcount.map(h => (
                    <li
                      key={h.venture}
                      className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] px-4 py-3"
                      style={{ background: tint(h.color, 5) }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: h.color }} />
                        <span className="text-[13px] font-bold text-[var(--color-text-primary)]">{h.venture}</span>
                      </div>
                      <div className="flex gap-4">
                        {[
                          { label: 'Total', val: h.total, c: h.color },
                          { label: 'Lead', val: h.leadership, c: 'var(--color-purple-glow)' },
                          { label: 'Staff', val: h.staff, c: 'var(--color-emerald)' },
                          { label: 'Intern', val: h.interns, c: 'var(--color-amber)' },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <div className="text-[14px] font-black" style={{ color: s.c }}>{s.val}</div>
                            <div className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                icon={<Users size={20} />}
                title="No headcount data"
                description="Once employees are assigned to ventures, headcount is charted here."
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Access Level Distribution" description="Employees per access tier" />
            {activeLevels.length > 0 ? (
              <>
                <div
                  role="img"
                  aria-label={`Donut chart of employees per access tier: ${describeSeries(activeLevels, 'level_name', 'count')}.`}
                >
                  <ResponsiveContainer width="100%" height={160} minHeight={160} minWidth={0}>
                    <PieChart>
                      <Pie data={activeLevels} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                        {activeLevels.map((l, i) => <Cell key={i} fill={LEVEL_COLORS[l.level_number] || color} />)}
                      </Pie>
                      <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v, _n, p) => [Number(v ?? 0), p.payload.level_name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2.5">
                  {activeLevels.map(l => (
                    <li key={l.level_number} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: LEVEL_COLORS[l.level_number] || color }} />
                      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{l.level_name} ({l.count})</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                icon={<BarChart3 size={20} />}
                title="No access tiers to show"
                description="Employees appear here once they are assigned an access level."
              />
            )}

            {departments.length > 0 && (
              <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Departments</div>
                <ul className="flex flex-col gap-2">
                  {departments.slice(0, 8).map(d => (
                    <li key={d.department} className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">{d.department}</span>
                      <div className="flex items-center gap-2">
                        <div
                          role="progressbar"
                          aria-label={`${d.department} headcount`}
                          aria-valuenow={d.count}
                          aria-valuemin={0}
                          aria-valuemax={maxDeptCount}
                          aria-valuetext={`${d.count} people`}
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.min(80, (d.count / maxDeptCount) * 80)}px`, background: color, opacity: 0.7 }}
                        />
                        <span className="min-w-[20px] text-right text-[12px] font-black" style={{ color }}>{d.count}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Dept KPIs */}
      {tab === 'kpis' && (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
            <div className="text-[15px] font-bold text-[var(--color-text-primary)]">Department KPI Scorecard</div>
            <div className="mt-0.5 text-[12px] font-medium text-[var(--color-text-muted)]">Task completion rates per department — last 30 days</div>
          </div>
          {kpiData.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={<BarChart3 size={20} />}
              title="No KPI data yet"
              description="Assign tasks to a department and its completion rate starts tracking here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Department KPI scorecard: team size, active projects, tasks, completed tasks and KPI score per department, last 30 days.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    {['Department', 'Venture', 'Team', 'Projects', 'Tasks', 'Completed', 'KPI Score'].map(h => (
                      <th
                        key={h}
                        scope="col"
                        className={cn(
                          'px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]',
                          h === 'KPI Score' && 'text-center',
                        )}
                      >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpiData.map((d, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-secondary)]">
                      <th scope="row" className="px-5 py-4 text-left text-[14px] font-bold text-[var(--color-text-primary)]">{d.department}</th>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                          <span className="text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.venture}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.team_size}</td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.active_projects}</td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.total_tasks}</td>
                      <td className="px-5 py-4 text-[13px] font-black text-[var(--color-emerald)]">{d.completed_tasks}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            role="progressbar"
                            aria-label={`${d.department} KPI score`}
                            aria-valuenow={d.kpi_score || 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="h-1.5 w-14 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                          >
                            <div className="h-full rounded-full" style={{ width: `${d.kpi_score || 0}%`, background: kpiColor(d.kpi_score || 0) }} />
                          </div>
                          <span className="min-w-[36px] text-[13px] font-black" style={{ color: kpiColor(d.kpi_score || 0) }}>{d.kpi_score || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Top Performers */}
      {tab === 'performance' && (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
            <div className="text-[15px] font-bold text-[var(--color-text-primary)]">Top Performers — Last 30 Days</div>
            <div className="mt-0.5 text-[12px] font-medium text-[var(--color-text-muted)]">Ranked by tasks completed</div>
          </div>
          {performance.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={<Trophy size={20} />}
              title="No performance data yet"
              description="Assign and complete tasks and the leaderboard fills in here."
            />
          ) : (
            <ol className="flex flex-col gap-3 p-5">
              {performance.map((p, idx) => (
                <li key={idx}
                  className="flex items-center gap-4 rounded-[var(--radius-card)] border px-5 py-4 transition-colors"
                  style={{
                    background: idx === 0 ? tint(color, 6) : 'var(--color-bg-secondary)',
                    borderColor: idx === 0 ? tint(color, 19) : 'var(--color-border)',
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[13px] font-black text-white"
                    style={{ background: idx < 3 ? RANK_STYLES[idx].bg : 'var(--color-border)' }}>
                    {idx < 3 ? RANK_STYLES[idx].label : `#${idx + 1}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-[var(--color-text-primary)]">{p.full_name}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">{p.designation} • {p.department}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">{p.venture}</span>
                  </div>
                  <div className="min-w-[56px] text-center">
                    <div className="text-xl font-black text-[var(--color-emerald)]">{p.completed_tasks}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Completed</div>
                  </div>
                  <div className="min-w-[48px] text-center">
                    <div className="text-[15px] font-black" style={{ color: kpiColor(p.completion_rate || 0) }}>{p.completion_rate || 0}%</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Rate</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {/* Hours & Effort */}
      {tab === 'timesheets' && (
        timesheets.length === 0 ? (
          <EmptyState
            icon={<Clock size={20} />}
            title="No timesheet data"
            description="Nothing was logged in the last 30 days. Hours appear here once the team starts filling timesheets."
          />
        ) : (
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader title="Hours Logged by Venture" description="Last 30 days — total & average hours" />
              <div
                role="img"
                aria-label={`Bar chart of total hours logged per venture in the last 30 days: ${describeSeries(timesheets, 'venture', 'total_hours', (v) => `${Number(v ?? 0)} hours`)}.`}
              >
                <ResponsiveContainer width="100%" height={200} minHeight={200} minWidth={0}>
                  <BarChart data={timesheets} barSize={44}>
                    <defs>{timesheets.map((ts, i) => <linearGradient key={i} id={`tsg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ts.color} stopOpacity={1} /><stop offset="100%" stopColor={ts.color} stopOpacity={0.3} /></linearGradient>)}</defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="venture" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v) => [`${Number(v ?? 0)}h`, 'Total Hours']} />
                    <Bar dataKey="total_hours" radius={[8, 8, 0, 0]} name="Total Hours">{timesheets.map((_, i) => <Cell key={i} fill={`url(#tsg${i})`} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {timesheets.map(ts => (
                <div
                  key={ts.venture}
                  className="rounded-[var(--radius-card)] border p-5"
                  style={{ background: tint(ts.color, 6), borderColor: tint(ts.color, 15) }}
                >
                  <div className="mb-4 flex items-center gap-2.5">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: ts.color }} />
                    <span className="text-[14px] font-bold text-[var(--color-text-primary)]">{ts.venture}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total', val: `${ts.total_hours}h`, c: ts.color },
                      { label: 'Avg', val: `${ts.avg_hours}h`, c: 'var(--color-amber)' },
                      { label: 'Members', val: ts.members_logged, c: 'var(--color-emerald)' },
                    ].map(s => (
                      <div key={s.label} className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-center">
                        <div className="text-[15px] font-black" style={{ color: s.c }}>{s.val}</div>
                        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</div>
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
