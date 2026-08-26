'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getStrategyData } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Target, CheckCircle2, Circle, TrendingUp, ShieldAlert, AlertTriangle, Lock, Loader2 } from 'lucide-react';

interface StrategyViewProps {
  currentUser: User;
}

const CHART_STYLE = {
  contentStyle: { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-primary)', fontSize: 12 },
};

const GROWTH_DATA = [
  { quarter: 'Q1', target: 400, actual: 420 },
  { quarter: 'Q2', target: 500, actual: 480 },
  { quarter: 'Q3', target: 650, actual: 680 },
  { quarter: 'Q4', target: 800, actual: null },
];

export default function StrategyView({ currentUser }: StrategyViewProps) {
  const [okrs, setOkrs] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStrategyData();
      if (res.success) {
        setOkrs(res.data.okrs);
        setRisks(res.data.risks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser.accessLevel <= 2) {
      fetchData();
    }
  }, [fetchData, currentUser.accessLevel]);

  if (currentUser.accessLevel > 2) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-rose-500" />
        </div>
        <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">Access Denied</h3>
        <p className="text-[var(--color-text-secondary)] text-sm font-medium">This view is restricted to Managing Directors (L2) and Super Admins.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
        <p className="text-[var(--color-text-muted)] font-medium text-sm">Synchronizing strategic directives...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Corporate Strategy &amp; OKRs</h2>
        <p className="text-[var(--color-text-secondary)] text-sm font-medium mt-1">
          High-level objectives, key results, and growth targets across all Dropwing ventures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OKRs Section */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-[var(--color-purple-glow)]" />
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Active Objectives (OKRs)</h3>
          </div>

          {okrs.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center text-[var(--color-text-muted)] text-sm">
              No objectives defined yet.
            </div>
          ) : (
            okrs.map(okr => (
              <div
                key={okr.id}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm"
                style={{ borderLeftWidth: '4px', borderLeftColor: okr.color }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color: okr.color }}>{okr.venture_name}</div>
                    <div className="text-base font-bold text-[var(--color-text-primary)] leading-snug">{okr.objective}</div>
                  </div>
                  <div className="text-xl font-black ml-4 shrink-0" style={{ color: okr.color }}>{okr.progress}%</div>
                </div>

                <div className="h-2 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${okr.progress}%`, background: okr.color }}
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  {(okr.keyResults || []).map((kr: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {kr.done
                        ? <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                        : <Circle size={15} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                      }
                      <span className={`text-[13px] font-medium leading-snug ${kr.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                        {kr.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Charts & Metrics */}
        <div className="flex flex-col gap-6">
          {/* Revenue Growth Chart */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-emerald-500" />
              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Projected vs Actual Revenue Growth ($M)</h3>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <LineChart data={GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="quarter" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => `$${val}`} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="target" name="Target" stroke="var(--color-text-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strategic Risks */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert size={16} className="text-[var(--color-purple-glow)]" />
              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">High-Level Risks &amp; Mitigations</h3>
            </div>
            <div className="flex flex-col gap-3">
              {risks.length === 0 ? (
                <div className="text-[var(--color-text-muted)] text-[12px] text-center py-4">No critical risks identified.</div>
              ) : (
                risks.map(risk => {
                  const isHigh = risk.severity === 'HIGH' || risk.severity === 'CRITICAL';
                  const colorClass = isHigh ? 'rose' : risk.severity === 'MEDIUM' ? 'amber' : 'emerald';
                  const hex = isHigh ? '#f43f5e' : risk.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';

                  return (
                    <div key={risk.id} className={`p-4 rounded-xl border`} style={{ background: `${hex}10`, borderColor: `${hex}30` }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[13px] font-bold flex items-center gap-2" style={{ color: hex }}>
                          <AlertTriangle size={13} /> {risk.risk_name} {risk.venture_name ? `(${risk.venture_name})` : ''}
                        </span>
                        <span className="text-[10px] font-black tracking-widest" style={{ color: hex }}>{risk.severity}</span>
                      </div>
                      <p className="text-[12px] font-medium text-[var(--color-text-secondary)] leading-relaxed">
                        Mitigation: {risk.mitigation}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
