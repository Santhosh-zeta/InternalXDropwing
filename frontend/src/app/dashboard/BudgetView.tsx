'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Package, Upload, Building, Zap,
  Wallet, FileText, TrendingUp, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, SkeletonCard, SkeletonTable, StatCard,
} from '@/components/ui';

const CHART_STYLE = {
  contentStyle: {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    color: 'var(--color-text-primary)',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
};

interface VentureBudget {
  id: number; venture: string; slug: string; color: string;
  allocated_budget: number; total_expenses: number; remaining: number;
  utilization: number; project_count: number;
}
interface BudgetTotals {
  total_budget: number; total_expenses: number; remaining: number;
  utilization: number; ventures: number; projects: number;
}
interface Expense {
  id: number; date: string; hours_worked: number; amount: number;
  description: string; status: string; employee: string; designation: string;
  department: string; venture: string; color: string; project_title: string;
}
interface MonthlyData { month: string; expenses: number; hours: number; }

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const healthLabel = (utilization: number) =>
  utilization > 85 ? 'At Risk' : utilization > 60 ? 'Moderate' : 'Healthy';

const healthColor = (utilization: number) =>
  utilization > 85 ? '#f43f5e' : utilization > 60 ? '#f59e0b' : '#10b981';

export default function BudgetView({ currentUser }: { currentUser: User }) {
  const [tab, setTab] = useState<'overview' | 'expenses' | 'trend'>('overview');
  const [ventures, setVentures] = useState<VentureBudget[]>([]);
  const [totals, setTotals] = useState<BudgetTotals | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVenture, setFilterVenture] = useState<string>('all');

  const color = currentUser.accessLevel === 2 ? '#8b5cf6' : '#06b6d4';
  const colorVar = currentUser.accessLevel === 2 ? 'var(--color-purple-glow)' : '#06b6d4';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, expRes, monthRes] = await Promise.all([
        api.get('/budget/summary'),
        api.get('/budget/expenses?limit=100'),
        api.get('/budget/monthly'),
      ]);
      if (summaryRes.data.success) {
        setVentures(summaryRes.data.data.ventures);
        setTotals(summaryRes.data.data.totals);
      }
      if (expRes.data.success) setExpenses(expRes.data.data);
      if (monthRes.data.success) setMonthly(monthRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredExpenses = filterVenture === 'all'
    ? expenses
    : expenses.filter(e => e.venture?.toLowerCase().includes(filterVenture.toLowerCase()));

  const TABS = [
    { id: 'overview' as const, label: 'Budget Overview', icon: <Wallet size={16} aria-hidden="true" /> },
    { id: 'expenses' as const, label: 'Expense Ledger', icon: <FileText size={16} aria-hidden="true" /> },
    { id: 'trend' as const, label: 'Spend Trend', icon: <TrendingUp size={16} aria-hidden="true" /> },
  ];

  // Charts are invisible to screen readers, so each container carries a text
  // alternative describing the same series the chart draws.
  const spendChartSummary = monthly.length === 0
    ? 'Monthly spend trend chart. No data available.'
    : `Area chart: monthly payroll expenditure. ${monthly.map(m => `${m.month}: ${fmt(m.expenses)}`).join('; ')}.`;

  const hoursChartSummary = monthly.length === 0
    ? 'Hours logged per month chart. No data available.'
    : `Bar chart: billable hours logged per month. ${monthly.map(m => `${m.month}: ${m.hours} hours`).join('; ')}.`;

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
        <span className="sr-only">Loading budget data…</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} columns={7} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div
          role="group"
          aria-label="Budget sections"
          className="flex gap-2 bg-[var(--color-bg-secondary)] p-1 rounded-[var(--radius-card)] border border-[var(--color-border)]"
        >
          {TABS.map(t => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? 'secondary' : 'ghost'}
              aria-pressed={tab === t.id}
              leadingIcon={t.icon}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? { color: colorVar } : {}}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-[var(--color-text-muted)] font-bold tracking-wide uppercase bg-[var(--color-bg-secondary)] px-3 py-1.5 rounded-[var(--radius-control)] border border-[var(--color-border)]">
            L{currentUser.accessLevel} — {currentUser.levelName}
          </span>
          <Button
            iconOnly
            aria-label="Refresh budget data"
            variant="secondary"
            size="sm"
            leadingIcon={<RefreshCw size={16} aria-hidden="true" />}
            onClick={fetchAll}
          />
        </div>
      </div>

      {/* KPI Row */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Total Budget"
            value={fmt(totals.total_budget)}
            delta={{ value: `${totals.projects} active projects`, direction: 'flat' }}
            accent="#10b981"
            icon={<Package size={18} />}
          />
          <StatCard
            label="Total Expenses"
            value={fmt(totals.total_expenses)}
            delta={{ value: 'Payroll + operational', direction: 'flat' }}
            accent="#f59e0b"
            icon={<Upload size={18} />}
          />
          <StatCard
            label="Remaining"
            value={fmt(totals.remaining)}
            delta={{ value: `${100 - totals.utilization}% headroom`, direction: 'flat' }}
            accent={totals.remaining < 0 ? '#f43f5e' : color}
            icon={<Building size={18} />}
          />
          <StatCard
            label="Utilization"
            value={`${totals.utilization}%`}
            delta={{ value: `${totals.ventures} ventures active`, direction: 'flat' }}
            accent={totals.utilization > 80 ? '#f43f5e' : '#10b981'}
            icon={<Zap size={18} />}
          />
        </div>
      )}

      {/* Budget Overview Tab */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          {ventures.length === 0 ? (
            <EmptyState
              icon={<AlertCircle size={22} aria-hidden="true" />}
              title="No budget data yet"
              description="Budgets appear here once projects are created with an allocated budget. Add a budget to a project to start tracking spend against it."
            />
          ) : (
            <Card padding="none" className="overflow-hidden shadow-sm">
              <div className="p-5 md:p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
                <div>
                  <h3 className="font-bold text-base text-[var(--color-text-primary)]">Budget vs Expenses by Venture</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">All values in INR • Expenses = payroll cost (₹50/hr)</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <caption className="sr-only">Allocated budget, expenses and utilization per venture</caption>
                  <thead>
                    <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                      {['Venture', 'Projects', 'Allocated Budget', 'Expenses', 'Remaining', 'Utilization', 'Health'].map(h => (
                        <th
                          key={h}
                          scope="col"
                          className={`p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h === 'Remaining' || h === 'Allocated Budget' || h === 'Expenses' ? 'text-right' : h === 'Utilization' || h === 'Health' ? 'text-center' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ventures.map((v) => (
                      <tr key={v.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <th scope="row" className="p-4 px-5 text-left font-normal">
                          <span className="flex items-center gap-3">
                            <span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0" style={{ background: v.color, boxShadow: `0 0 8px ${v.color}80` }} />
                            <span className="font-bold text-sm text-[var(--color-text-primary)]">{v.venture}</span>
                          </span>
                        </th>
                        <td className="p-4 px-5 text-[13px] font-medium text-[var(--color-text-secondary)]">{v.project_count}</td>
                        <td className="p-4 px-5 text-right text-[14px] font-bold text-[var(--color-text-primary)]">{fmt(v.allocated_budget)}</td>
                        <td className="p-4 px-5 text-right text-[14px] font-semibold text-amber-500">{fmt(v.total_expenses)}</td>
                        <td className="p-4 px-5 text-right text-[14px] font-bold" style={{ color: v.remaining < 0 ? '#f43f5e' : '#10b981' }}>{fmt(v.remaining)}</td>
                        <td className="p-4 px-5 text-center">
                          <div className="flex items-center gap-3 justify-center">
                            <div
                              role="progressbar"
                              aria-valuenow={v.utilization}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${v.venture} budget utilization`}
                              className="flex-1 h-2 rounded-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] max-w-[80px] overflow-hidden"
                            >
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, v.utilization)}%`, background: healthColor(v.utilization) }} />
                            </div>
                            <span className="text-[12px] font-bold" style={{ color: healthColor(v.utilization) }}>{v.utilization}%</span>
                          </div>
                        </td>
                        <td className="p-4 px-5 text-center">
                          <Badge color={healthColor(v.utilization)} dot>{healthLabel(v.utilization)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot>
                      <tr className="bg-[var(--color-bg-secondary)] border-t-2 border-[var(--color-border)]">
                        <th scope="row" className="p-5 text-left font-extrabold text-[13px] text-[var(--color-text-primary)] uppercase tracking-wider">Total</th>
                        <td className="p-5 font-bold text-[13px] text-[var(--color-text-secondary)]">{totals.projects}</td>
                        <td className="p-5 text-right font-extrabold text-[15px]" style={{ color: colorVar }}>{fmt(totals.total_budget)}</td>
                        <td className="p-5 text-right font-extrabold text-[15px] text-amber-500">{fmt(totals.total_expenses)}</td>
                        <td className="p-5 text-right font-extrabold text-[15px]" style={{ color: totals.remaining < 0 ? '#f43f5e' : '#10b981' }}>{fmt(totals.remaining)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="flex flex-col gap-4">
          {/* Filter */}
          <Card
            padding="none"
            role="group"
            aria-label="Filter expenses by venture"
            className="flex gap-2 flex-wrap p-2 shadow-sm"
          >
            {['all', ...ventures.map(v => v.venture)].map(v => (
              <Button
                key={v}
                size="sm"
                variant="ghost"
                aria-pressed={filterVenture === v}
                onClick={() => setFilterVenture(v)}
                className={filterVenture === v ? 'shadow-sm border' : ''}
                style={filterVenture === v ? { color: colorVar, background: `${color}15`, borderColor: `${color}40` } : {}}
              >
                {v === 'all' ? 'All Ventures' : v}
              </Button>
            ))}
          </Card>
          <Card padding="none" className="overflow-hidden shadow-sm">
            <div className="p-5 md:p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
              <h3 className="font-bold text-base text-[var(--color-text-primary)]">Expense Ledger</h3>
              <div className="text-xs font-semibold text-[var(--color-text-muted)] px-3 py-1 bg-[var(--color-bg-primary)] rounded-full border border-[var(--color-border)]">{filteredExpenses.length} entries</div>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<FileText size={22} aria-hidden="true" />}
                  title={filterVenture === 'all' ? 'No expense records yet' : `No expenses for ${filterVenture}`}
                  description={filterVenture === 'all'
                    ? 'Expenses are generated from approved timesheets. Approve pending hours in Timesheets and they will appear here.'
                    : 'No approved timesheet costs have been recorded against this venture yet.'}
                  action={filterVenture === 'all' ? undefined : (
                    <Button variant="secondary" onClick={() => setFilterVenture('all')}>
                      Show all ventures
                    </Button>
                  )}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <caption className="sr-only">Expense ledger entries</caption>
                  <thead>
                    <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                      {['Date', 'Employee', 'Venture', 'Project', 'Hours', 'Amount', 'Status'].map(h => (
                        <th
                          key={h}
                          scope="col"
                          className={`p-4 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h === 'Amount' || h === 'Hours' ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.slice(0, 50).map((exp, idx) => (
                      <tr key={exp.id || idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <td className="p-4 px-5 text-[12px] font-medium text-[var(--color-text-secondary)]">{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="p-4 px-5">
                          <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{exp.employee}</div>
                          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{exp.designation} • {exp.department}</div>
                        </td>
                        <td className="p-4 px-5">
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: exp.color, boxShadow: `0 0 6px ${exp.color}80` }} />
                            <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{exp.venture}</span>
                          </span>
                        </td>
                        <td className="p-4 px-5 text-[12px] font-medium text-[var(--color-text-secondary)] max-w-[180px] truncate">{exp.project_title || '—'}</td>
                        <td className="p-4 px-5 text-right text-[13px] font-bold text-[var(--color-text-primary)]">{exp.hours_worked}h</td>
                        <td className="p-4 px-5 text-right text-[13px] font-extrabold text-amber-500">{fmt(exp.amount)}</td>
                        <td className="p-4 px-5">
                          <Badge tone={exp.status === 'approved' ? 'success' : 'warning'} dot>{exp.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Spend Trend Tab */}
      {tab === 'trend' && (
        <div className="flex flex-col gap-6">
          {monthly.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={22} aria-hidden="true" />}
              title="No spend history yet"
              description="Monthly spend and hours charts appear once approved timesheets exist for at least one month."
            />
          ) : (
            <>
              <Card padding="none" className="p-6 md:p-8 shadow-sm" style={{ borderColor: `${color}40` }}>
                <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1">Monthly Spend Trend</h3>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-8">Payroll expenditure over the last 6 months</p>
                <div
                  role="img"
                  aria-label={spendChartSummary}
                  className="w-full h-[260px] relative -ml-4 md:ml-0"
                >
                  <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={0}>
                    <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} dx={-10} />
                      <Tooltip contentStyle={CHART_STYLE.contentStyle} itemStyle={{ fontWeight: 700, color: 'var(--color-text-primary)' }} formatter={(v) => [fmt(Number(v ?? 0)), 'Expenses']} />
                      <Area type="monotone" dataKey="expenses" stroke={color} fill="url(#budgetGrad)" strokeWidth={3} name="Expenses" activeDot={{ r: 6, fill: color, stroke: 'var(--color-bg-card)', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card padding="none" className="p-6 md:p-8 shadow-sm">
                <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1">Hours Logged Per Month</h3>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-8">Total billable hours across all team members</p>
                <div
                  role="img"
                  aria-label={hoursChartSummary}
                  className="w-full h-[220px] relative -ml-4 md:ml-0"
                >
                  <ResponsiveContainer width="100%" height="100%" minHeight={220} minWidth={0}>
                    <BarChart data={monthly} barSize={32} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip cursor={{ fill: 'var(--color-bg-secondary)' }} contentStyle={CHART_STYLE.contentStyle} itemStyle={{ fontWeight: 700, color: 'var(--color-text-primary)' }} formatter={(v) => [`${Number(v ?? 0)}h`, 'Hours']} />
                      <Bar dataKey="hours" fill="url(#hoursGrad)" radius={[6, 6, 0, 0]} name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
