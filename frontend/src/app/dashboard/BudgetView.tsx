'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import api from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CHART_STYLE = {
  contentStyle: {
    background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#e2e8f0', fontSize: 12,
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

  const color = currentUser.accessLevel === 2 ? '#a78bfa' : '#06b6d4';

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

  const StatCard = ({ label, value, sub, c, icon }: { label: string; value: string; sub?: string; c: string; icon: string }) => (
    <div style={{ background: `${c}12`, border: `1px solid ${c}28`, borderRadius: 16, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: c, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );

  const TABS = [
    { id: 'overview' as const, label: 'Budget Overview', icon: '💰' },
    { id: 'expenses' as const, label: 'Expense Ledger', icon: '🧾' },
    { id: 'trend' as const, label: 'Spend Trend', icon: '📈' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: 110, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Controls */}
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: 1 }}>
            L{currentUser.accessLevel} — {currentUser.levelName}
          </span>
          <button onClick={fetchAll} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${color}40`, background: `${color}18`, color, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>↻</button>
        </div>
      </div>

      {/* KPI Row */}
      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard label="Total Budget" value={fmt(totals.total_budget)} sub={`${totals.projects} active projects`} c="#10b981" icon="📦" />
          <StatCard label="Total Expenses" value={fmt(totals.total_expenses)} sub="Payroll + operational" c="#f59e0b" icon="📤" />
          <StatCard label="Remaining" value={fmt(totals.remaining)} sub={`${100 - totals.utilization}% headroom`} c={totals.remaining < 0 ? '#f43f5e' : color} icon="🏦" />
          <StatCard label="Utilization" value={`${totals.utilization}%`} sub={`${totals.ventures} ventures active`} c={totals.utilization > 80 ? '#f43f5e' : '#10b981'} icon="⚡" />
        </div>
      )}

      {/* Budget Overview Tab */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ventures.length === 0 ? (
            <div className="glass" style={{ borderRadius: 16, padding: 60, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>📊</div>
              <p style={{ color: 'var(--color-text-muted)' }}>No budget data yet. Create projects with budgets to track financials.</p>
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Budget vs Expenses by Venture</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>All values in INR • Expenses = payroll cost (₹50/hr)</div>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    {['Venture', 'Projects', 'Allocated Budget', 'Expenses', 'Remaining', 'Utilization', 'Health'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: h === 'Remaining' || h === 'Allocated Budget' || h === 'Expenses' ? 'right' : h === 'Utilization' || h === 'Health' ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventures.map((v, idx) => (
                    <tr key={v.id} style={{ borderTop: '1px solid var(--color-border)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{v.venture}</span>
                        </div>
                      </td>
                      <td style={{ padding: '18px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{v.project_count}</td>
                      <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(v.allocated_budget)}</td>
                      <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#f59e0b' }}>{fmt(v.total_expenses)}</td>
                      <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: v.remaining < 0 ? '#f43f5e' : '#10b981' }}>{fmt(v.remaining)}</td>
                      <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', maxWidth: 80, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, v.utilization)}%`, height: '100%', borderRadius: 4, background: v.utilization > 85 ? '#f43f5e' : v.utilization > 60 ? '#f59e0b' : '#10b981', transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: v.utilization > 85 ? '#f43f5e' : v.utilization > 60 ? '#f59e0b' : '#10b981' }}>{v.utilization}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: v.utilization > 85 ? 'rgba(244,63,94,0.15)' : v.utilization > 60 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: v.utilization > 85 ? '#f43f5e' : v.utilization > 60 ? '#f59e0b' : '#10b981' }}>
                          {v.utilization > 85 ? '⚠ At Risk' : v.utilization > 60 ? '◔ Moderate' : '✓ Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--color-border)', background: `${color}08` }}>
                      <td style={{ padding: '16px 20px', fontWeight: 800, fontSize: 14, color: 'var(--color-text-primary)' }}>TOTAL</td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)' }}>{totals.projects}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: color }}>{fmt(totals.total_budget)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#f59e0b' }}>{fmt(totals.total_expenses)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: totals.remaining < 0 ? '#f43f5e' : '#10b981' }}>{fmt(totals.remaining)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', ...ventures.map(v => v.venture)].map(v => (
              <button key={v} onClick={() => setFilterVenture(v)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: filterVenture === v ? `${color}25` : 'rgba(255,255,255,0.05)',
                color: filterVenture === v ? color : 'var(--color-text-muted)',
                outline: filterVenture === v ? `1px solid ${color}40` : 'none',
              }}>{v === 'all' ? '🌐 All Ventures' : v}</button>
            ))}
          </div>
          <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Expense Ledger</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{filteredExpenses.length} entries</div>
            </div>
            {filteredExpenses.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🧾</div>
                <p>No expense records yet. Approve timesheets to generate expense data.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    {['Date', 'Employee', 'Venture', 'Project', 'Hours', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: h === 'Amount' || h === 'Hours' ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.slice(0, 50).map((exp, idx) => (
                    <tr key={exp.id || idx} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{exp.employee}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{exp.designation} • {exp.department}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: exp.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{exp.venture}</span>
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.project_title || '—'}</td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{exp.hours_worked}h</td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{fmt(exp.amount)}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: exp.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: exp.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                          {exp.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Spend Trend Tab */}
      {tab === 'trend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass" style={{ borderRadius: 20, padding: 28, border: `1px solid ${color}20` }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>Monthly Spend Trend</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 24 }}>Payroll expenditure over the last 6 months</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v: number) => [fmt(v), 'Expenses']} />
                <Area type="monotone" dataKey="expenses" stroke={color} fill="url(#budgetGrad)" strokeWidth={2.5} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass" style={{ borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4 }}>Hours Logged Per Month</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 24 }}>Total billable hours across all team members</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barSize={40}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v: number) => [`${v}h`, 'Hours']} />
                <Bar dataKey="hours" fill="url(#hoursGrad)" radius={[8, 8, 0, 0]} name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
