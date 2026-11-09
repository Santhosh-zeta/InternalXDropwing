'use client';

import { useState } from 'react';
import { getAuditLogs } from '@/lib/api';
import { unwrapList, useApi } from '@/lib/useApi';
import {
  ShieldCheck, Search, Server,
  Database, UserCircle2, Briefcase, FileCode2,
} from 'lucide-react';
import { AsyncState, Badge, EmptyState, SkeletonTable, type BadgeTone } from '@/components/ui';

export default function AuditLogsView() {
  const logs = useApi('audit-logs', (sig) => unwrapList(getAuditLogs(sig)));
  const [search, setSearch] = useState('');

  const filteredLogs = (logs.data ?? []).filter(log => {
    const s = search.toLowerCase();
    return (
      (log.user_name || '').toLowerCase().includes(s) ||
      (log.action_type || '').toLowerCase().includes(s) ||
      (log.entity_type || '').toLowerCase().includes(s)
    );
  });

  const ACTION_TONE: Record<string, BadgeTone> = {
    CREATE: 'success',
    DELETE: 'danger',
    UPDATE: 'info',
  };

  const getActionTone = (action: string): BadgeTone => {
    if (!action) return 'neutral';
    for (const [key, tone] of Object.entries(ACTION_TONE)) {
      if (action.includes(key)) return tone;
    }
    return 'brand';
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'user': return <UserCircle2 size={14} className="text-[var(--color-cyan)]" />;
      case 'project': return <Briefcase size={14} className="text-[var(--color-amber)]" />;
      default: return <Server size={14} className="text-[var(--color-purple-glow)]" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 rounded-2xl flex flex-col gap-5 shadow-sm">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-rose)]/10 flex items-center justify-center">
              <ShieldCheck size={24} className="text-[var(--color-rose)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Security & Audit Logs</h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                The latest 100 recorded actions across the system. Visible to L1 and L2 only.
              </p>
            </div>
          </div>
        </div>

        <div className="relative w-full max-w-[400px]">
          <Search size={16} aria-hidden="true" className="absolute left-3.5 top-3 text-[var(--color-text-muted)]" />
          <input
            type="search"
            aria-label="Search logs by user, action or entity"
            placeholder="Search by user, action or entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
        <AsyncState loading={logs.loading} error={logs.error} onRetry={logs.refetch} what="audit logs" skeleton={<SkeletonTable rows={8} columns={5} />}>
        {filteredLogs.length === 0 ? (
          <div className="p-16">
            <EmptyState
              icon={<Database size={24} />}
              title="No logs found"
              description={search ? 'No entries match your search. Try a different term.' : 'The system ledger is empty.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Security audit log, {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}</caption>
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th scope="col" className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">TIMESTAMP</th>
                  <th scope="col" className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">ACTOR</th>
                  <th scope="col" className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">ACTION</th>
                  <th scope="col" className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">ENTITY</th>
                  <th scope="col" className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <td className="p-4 px-6 text-[13px] text-[var(--color-text-muted)] whitespace-nowrap font-medium">
                        {new Date(log.created_at).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </td>
                      <td className="p-4 px-6">
                        <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{log.user_name || 'System'}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{log.user_email || `ID: ${log.user_id}`}</div>
                      </td>
                      <td className="p-4 px-6">
                        <Badge tone={getActionTone(log.action_type)}>
                          {log.action_type}
                        </Badge>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-primary)] capitalize">
                          {getEntityIcon(log.entity_type)} {log.entity_type} <span className="text-[var(--color-text-muted)]">#{log.entity_id}</span>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <div className="bg-[var(--color-bg-secondary)] p-2.5 rounded-xl border border-[var(--color-border)] flex items-start gap-2">
                          <FileCode2 size={14} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                          <div className="text-[11px] text-[var(--color-text-secondary)] font-mono break-all max-w-[300px]">
                            {log.details ? JSON.stringify(log.details) : '{}'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        </AsyncState>
      </div>
    </div>
  );
}
