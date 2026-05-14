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

  const StatCard = ({ label, value, sub, c, icon }: { label: string; value: string; sub?: string; c: string; icon: React.ReactNode }) => (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm" style={{ borderTop: `4px solid ${c}` }}>
      <div className="flex justify-between items-start mb-3">
        <div className="text-[11px] text-[var(--color-text-muted)] font-bold tracking-wider uppercase">{label}</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${c}15`, color: c }}>{icon}</div>
      </div>
      <div className="text-3xl font-extrabold leading-tight mb-1" style={{ color: c }}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-muted)] font-medium">{sub}</div>}
    </div>
  );

  const TABS = [
    { id: 'overview' as const, label: 'Budget Overview', icon: <Wallet size={16} /> },
    { id: 'expenses' as const, label: 'Expense Ledger', icon: <FileText size={16} /> },
    { id: 'trend' as const, label: 'Spend Trend', icon: <TrendingUp size={16} /> },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-[120px] rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2 bg-[var(--color-bg-secondary)] p-1 rounded-xl border border-[var(--color-border)]">
          {TABS.map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                tab === t.id 
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-transparent'
              }`}
              style={tab === t.id ? { color: colorVar } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-[var(--color-text-muted)] font-bold tracking-wide uppercase bg-[var(--color-bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
            L{currentUser.accessLevel} — {currentUser.levelName}
          </span>
          <button 
            onClick={fetchAll} 
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Total Budget" value={fmt(totals.total_budget)} sub={`${totals.projects} active projects`} c="#10b981" icon={<Package size={18} />} />
          <StatCard label="Total Expenses" value={fmt(totals.total_expenses)} sub="Payroll + operational" c="#f59e0b" icon={<Upload size={18} />} />
          <StatCard label="Remaining" value={fmt(totals.remaining)} sub={`${100 - totals.utilization}% headroom`} c={totals.remaining < 0 ? '#f43f5e' : color} icon={<Building size={18} />} />
          <StatCard label="Utilization" value={`${totals.utilization}%`} sub={`${totals.ventures} ventures active`} c={totals.utilization > 80 ? '#f43f5e' : '#10b981'} icon={<Zap size={18} />} />
        </div>
      )}

      {/* Budget Overview Tab */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          {ventures.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" />
              <p className="text-[var(--color-text-secondary)] font-medium">No budget data yet. Create projects with budgets to track financials.</p>
            </div>
          ) : (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 md:p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
                <div>
                  <div className="font-bold text-base text-[var(--color-text-primary)]">Budget vs Expenses by Venture</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">All values in INR • Expenses = payroll cost (₹50/hr)</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                      {['Venture', 'Projects', 'Allocated Budget', 'Expenses', 'Remaining', 'Utilization', 'Health'].map(h => (
                        <th key={h} className={`p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h === 'Remaining' || h === 'Allocated Budget' || h === 'Expenses' ? 'text-right' : h === 'Utilization' || h === 'Health' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ventures.map((v, idx) => (
                      <tr key={v.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <td className="p-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: v.color, boxShadow: `0 0 8px ${v.color}80` }} />
                            <span className="font-bold text-sm text-[var(--color-text-primary)]">{v.venture}</span>
                          </div>
                        </td>
                        <td className="p-4 px-5 text-[13px] font-medium text-[var(--color-text-secondary)]">{v.project_count}</td>
                        <td className="p-4 px-5 text-right text-[14px] font-bold text-[var(--color-text-primary)]">{fmt(v.allocated_budget)}</td>
                        <td className="p-4 px-5 text-right text-[14px] font-semibold text-amber-500">{fmt(v.total_expenses)}</td>
                        <td className="p-4 px-5 text-right text-[14px] font-bold" style={{ color: v.remaining < 0 ? '#f43f5e' : '#10b981' }}>{fmt(v.remaining)}</td>
                        <td className="p-4 px-5 text-center">
                          <div className="flex items-center gap-3 justify-center">
                            <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] max-w-[80px] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, v.utilization)}%`, background: v.utilization > 85 ? '#f43f5e' : v.utilization > 60 ? '#f59e0b' : '#10b981' }} />
                            </div>
                            <span className="text-[12px] font-bold" style={{ color: v.utilization > 85 ? '#f43f5e' : v.utilization > 60 ? '#f59e0b' : '#10b981' }}>{v.utilization}%</span>
                          </div>
                        </td>
                        <td className="p-4 px-5 text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border" style={{ background: v.utilization > 85 ? 'rgba(244,63,94,0.1)' : v.utilization > 60 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: v.utilization > 85 ? '#f43f5e' : v.utilization > 60 ? '#f59e0b' : '#10b981', borderColor: v.utilization > 85 ? 'rgba(244,63,94,0.2)' : v.utilization > 60 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)' }}>
                            {v.utilization > 85 ? 'At Risk' : v.utilization > 60 ? 'Moderate' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot>
                      <tr className="bg-[var(--color-bg-secondary)] border-t-2 border-[var(--color-border)]">
                        <td className="p-5 font-extrabold text-[13px] text-[var(--color-text-primary)] uppercase tracking-wider">Total</td>
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
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="flex flex-col gap-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap bg-[var(--color-bg-card)] p-2 rounded-2xl border border-[var(--color-border)] shadow-sm">
            {['all', ...ventures.map(v => v.venture)].map(v => (
              <button 
                key={v} 
                onClick={() => setFilterVenture(v)} 
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filterVenture === v 
                    ? 'shadow-sm' 
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                }`}
                style={filterVenture === v ? { color: colorVar, background: `${color}15`, borderColor: `${color}40` } : {}}
              >
                {v === 'all' ? 'All Ventures' : v}
              </button>
            ))}
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 md:p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
              <div className="font-bold text-base text-[var(--color-text-primary)]">Expense Ledger</div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)] px-3 py-1 bg-[var(--color-bg-primary)] rounded-full border border-[var(--color-border)]">{filteredExpenses.length} entries</div>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="p-16 text-center text-[var(--color-text-muted)]">
                <FileText size={40} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium">No expense records yet. Approve timesheets to generate expense data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                      {['Date', 'Employee', 'Venture', 'Project', 'Hours', 'Amount', 'Status'].map(h => (
                        <th key={h} className={`p-4 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h === 'Amount' || h === 'Hours' ? 'text-right' : 'text-left'}`}>{h}</th>
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
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: exp.color, boxShadow: `0 0 6px ${exp.color}80` }} />
                            <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{exp.venture}</span>
                          </span>
                        </td>
                        <td className="p-4 px-5 text-[12px] font-medium text-[var(--color-text-secondary)] max-w-[180px] truncate">{exp.project_title || '—'}</td>
                        <td className="p-4 px-5 text-right text-[13px] font-bold text-[var(--color-text-primary)]">{exp.hours_worked}h</td>
                        <td className="p-4 px-5 text-right text-[13px] font-extrabold text-amber-500">{fmt(exp.amount)}</td>
                        <td className="p-4 px-5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${exp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                            {exp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spend Trend Tab */}
      {tab === 'trend' && (
        <div className="flex flex-col gap-6">
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 md:p-8 border shadow-sm" style={{ borderColor: `${color}40` }}>
            <div className="font-bold text-lg text-[var(--color-text-primary)] mb-1">Monthly Spend Trend</div>
            <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-8">Payroll expenditure over the last 6 months</div>
            <div className="w-full h-[260px] relative -ml-4 md:ml-0">
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
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 md:p-8 border border-[var(--color-border)] shadow-sm">
            <div className="font-bold text-lg text-[var(--color-text-primary)] mb-1">Hours Logged Per Month</div>
            <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-8">Total billable hours across all team members</div>
            <div className="w-full h-[220px] relative -ml-4 md:ml-0">
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
          </div>
        </div>
      )}
    </div>
  );
}
