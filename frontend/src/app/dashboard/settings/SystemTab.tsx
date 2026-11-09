'use client';

import { RefreshCw } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { Envelope } from '@/lib/types';
import { AsyncState, Badge, Button, Card, CardHeader, SkeletonTable, type BadgeTone } from '@/components/ui';

interface SystemCheck {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'missing';
  detail: string;
  fix: string;
}
interface SystemStatus {
  generatedAt: string;
  environment: string;
  summary: { ok: number; warn: number; missing: number };
  checks: SystemCheck[];
}

const TONE: Record<SystemCheck['status'], BadgeTone> = { ok: 'success', warn: 'warning', missing: 'danger' };
const LABEL: Record<SystemCheck['status'], string> = { ok: 'OK', warn: 'Warning', missing: 'Missing' };

/** Configuration self-check (Super Admin / MD only): what is set up, what is not, and how to fix it. Never shows secret values. */
export default function SystemTab() {
  const status = useApi('system-status', async (signal) => {
    const res = await apiGet<Envelope<SystemStatus>>('/admin/system-status', signal);
    if (!res.success || !res.data) throw new Error(res.message || 'Could not load the system status');
    return res.data;
  });
  const report = status.data;

  return (
    <Card>
      <CardHeader
        title="System status"
        description="Whether this installation is configured. Settings are environment variables on the server; secret values are never shown here."
        action={
          <Button size="sm" variant="secondary" loading={status.fetching} leadingIcon={<RefreshCw size={14} aria-hidden="true" />} onClick={status.refetch}>
            Re-check
          </Button>
        }
      />
      <AsyncState loading={status.loading} error={status.error} onRetry={status.refetch} what="system status" skeleton={<SkeletonTable rows={6} columns={2} />}>
        {report && (
          <>
            <p className="mb-4 text-[13px] text-[var(--color-text-secondary)]" aria-live="polite">
              {report.summary.ok} ok, {report.summary.warn} warning{report.summary.warn === 1 ? '' : 's'}, {report.summary.missing} missing ({report.environment})
            </p>
            <ul className="divide-y divide-[var(--color-border)]">
              {report.checks.map((c) => (
                <li key={c.id} className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-start sm:gap-4">
                  <div className="shrink-0 sm:w-24"><Badge tone={TONE[c.status]} dot>{LABEL[c.status]}</Badge></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[var(--color-text-primary)]">{c.label}</div>
                    <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{c.detail}</div>
                    {c.status !== 'ok' && c.fix && (
                      <div className="mt-1 break-words text-[12px] text-[var(--color-text-muted)]"><span className="font-bold">Fix:</span> {c.fix}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </AsyncState>
    </Card>
  );
}
