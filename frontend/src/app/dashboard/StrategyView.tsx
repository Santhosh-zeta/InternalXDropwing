'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getStrategyData } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, CheckCircle2, Circle, TrendingUp, ShieldAlert, AlertTriangle, Lock } from 'lucide-react';
import {
  Badge, Card, CardHeader, EmptyState, Skeleton, tint,
} from '@/components/ui';

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

/** Skeleton shaped like the OKR list and the two chart panels side by side. */
function StrategySkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading strategic data…</span>
      <div>
        <Skeleton height={28} width="40%" />
        <Skeleton height={14} width="60%" className="mt-2" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <Skeleton height={12} width="30%" />
              <Skeleton height={18} width="80%" className="mt-2" />
              <Skeleton height={8} className="mt-4 rounded-full" />
              <div className="mt-3 flex flex-col gap-2">
                <Skeleton height={12} width="90%" />
                <Skeleton height={12} width="75%" />
              </div>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <Skeleton height={14} width="60%" />
            <Skeleton height={240} className="mt-5 rounded-[var(--radius-card)]" />
          </Card>
          <Card>
            <Skeleton height={14} width="50%" />
            <Skeleton height={60} className="mt-3 rounded-[var(--radius-card)]" />
            <Skeleton height={60} className="mt-3 rounded-[var(--radius-card)]" />
            <Skeleton height={60} className="mt-3 rounded-[var(--radius-card)]" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function riskColor(severity: string): string {
  if (severity === 'HIGH' || severity === 'CRITICAL') return 'var(--color-rose)';
  if (severity === 'MEDIUM') return 'var(--color-amber)';
  return 'var(--color-emerald)';
}

function riskTone(severity: string): 'danger' | 'warning' | 'success' {
  if (severity === 'HIGH' || severity === 'CRITICAL') return 'danger';
  if (severity === 'MEDIUM') return 'warning';
  return 'success';
}

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
      <div
        className="rounded-2xl border border-dashed p-16 text-center"
        style={{ background: 'var(--color-bg-card)', borderColor: tint('var(--color-rose)', 20) }}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{
            background: tint('var(--color-rose)', 10),
            borderColor: tint('var(--color-rose)', 20),
            color: 'var(--color-rose)',
          }}
        >
          <Lock size={28} />
        </div>
        <h3 className="mb-2 text-base font-bold text-[var(--color-text-primary)]">Access Denied</h3>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          This view is restricted to Managing Directors (L2) and Super Admins.
        </p>
      </div>
    );
  }

  if (loading) {
    return <StrategySkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Corporate Strategy &amp; OKRs</h2>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
          High-level objectives, key results, and growth targets across all Dropwing ventures.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* OKRs Section */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Target size={18} aria-hidden="true" style={{ color: 'var(--color-purple-glow)' }} />
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Active Objectives (OKRs)</h3>
          </div>

          {okrs.length === 0 ? (
            <EmptyState
              icon={<Target size={20} />}
              title="No objectives defined yet"
              description="Add OKRs to your ventures and they will be tracked here."
            />
          ) : (
            okrs.map(okr => (
              <div
                key={okr.id}
                className="rounded-2xl border bg-[var(--color-bg-card)] p-5 shadow-sm"
                style={{ borderLeftWidth: '4px', borderLeftColor: okr.color }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div
                      className="mb-1 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: okr.color }}
                    >
                      {okr.venture_name}
                    </div>
                    <div className="text-base font-bold leading-snug text-[var(--color-text-primary)]">
                      {okr.objective}
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-xl font-black" style={{ color: okr.color }}>
                    {okr.progress}%
                  </div>
                </div>

                <div
                  role="progressbar"
                  aria-label={`${okr.objective} progress`}
                  aria-valuenow={okr.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mb-4 h-2 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${okr.progress}%`, background: okr.color }}
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  {(okr.keyResults || []).map((kr: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {kr.done
                        ? <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--color-emerald)' }} />
                        : <Circle size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
                      }
                      <span className={`flex-1 text-[13px] font-medium leading-snug ${kr.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                        {kr.text}
                      </span>
                      <Badge tone={kr.done ? 'success' : 'neutral'} dot>
                        {kr.done ? 'Done' : 'Open'}
                      </Badge>
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
          <Card>
            <CardHeader
              title="Projected vs Actual Revenue Growth ($M)"
              description="Quarterly targets versus actuals across all ventures."
            />
            <div
              className="h-[240px]"
              role="img"
              aria-label="Line chart comparing projected and actual revenue growth by quarter: Q1 target $400M actual $420M, Q2 target $500M actual $480M, Q3 target $650M actual $680M, Q4 target $800M projected only."
            >
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <LineChart data={GROWTH_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="quarter" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => `$${val}`} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                  <Line type="monotone" dataKey="target" name="Target" stroke="var(--color-text-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--color-emerald)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-emerald)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Strategic Risks */}
          <Card>
            <CardHeader
              title="High-Level Risks & Mitigations"
              description="Identified risks tracked across all ventures."
            />
            <div className="flex flex-col gap-3">
              {risks.length === 0 ? (
                <EmptyState
                  icon={<ShieldAlert size={20} />}
                  title="No critical risks identified"
                  description="Strategic risks and their mitigations will appear here once logged."
                />
              ) : (
                risks.map(risk => {
                  const c = riskColor(risk.severity);
                  return (
                    <div
                      key={risk.id}
                      className="rounded-xl border p-4"
                      style={{ background: tint(c, 8), borderColor: tint(c, 20) }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: c }}>
                          <AlertTriangle size={13} aria-hidden="true" />
                          {risk.risk_name}{risk.venture_name ? ` (${risk.venture_name})` : ''}
                        </span>
                        <Badge tone={riskTone(risk.severity)} dot>{risk.severity}</Badge>
                      </div>
                      <p className="text-[12px] font-medium leading-relaxed text-[var(--color-text-secondary)]">
                        Mitigation: {risk.mitigation}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
