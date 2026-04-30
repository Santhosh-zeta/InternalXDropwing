'use client';

import { useState, useEffect } from 'react';
import { getAuditLogs } from '@/lib/api';
import { 
  ShieldCheck, Activity, Search, Server, 
  Database, UserCircle2, Briefcase, FileCode2,
  Loader2
} from 'lucide-react';

export default function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await getAuditLogs();
      if (res.success) {
        setLogs(res.data);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const s = search.toLowerCase();
    return (
      (log.user_name || '').toLowerCase().includes(s) ||
      (log.action_type || '').toLowerCase().includes(s) ||
      (log.entity_type || '').toLowerCase().includes(s)
    );
  });

  const getEntityIcon = (type: string) => {
    switch(type) {
      case 'user': return <UserCircle2 size={14} className="text-cyan-500" />;
      case 'project': return <Briefcase size={14} className="text-amber-500" />;
      default: return <Server size={14} className="text-[var(--color-purple-glow)]" />;
    }
  };

  const getActionColor = (action: string) => {
    if (!action) return 'var(--color-purple-glow)';
    if (action.includes('CREATE')) return '#10b981'; // Green
    if (action.includes('DELETE')) return '#f43f5e'; // Red
    if (action.includes('UPDATE')) return '#0ea5e9'; // Blue
    return 'var(--color-purple-glow)'; // Purple
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 rounded-2xl flex flex-col gap-5 shadow-sm">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <ShieldCheck size={24} className="text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Security & Audit Logs</h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                Immutable ledger of all critical system actions. Accessible only to Super Admins.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <Activity size={16} className="text-emerald-500" />
            <span className="text-[13px] font-bold text-emerald-500">Live Monitoring Active</span>
          </div>
        </div>

        <div className="relative w-full max-w-[400px]">
          <Search size={16} className="absolute left-3.5 top-3 text-[var(--color-text-muted)]" />
          <input 
            type="text" 
            placeholder="Search logs by user, action, or entity..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
        {loading ? (
          <div className="flex flex-col w-full h-full items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
            <p className="font-medium">Loading security ledger...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <Database size={48} className="text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <h3 className="text-base text-[var(--color-text-primary)] font-semibold mb-1">No logs found</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)]">The system ledger is empty or no matches were found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">TIMESTAMP</th>
                  <th className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">ACTOR</th>
                  <th className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">ACTION</th>
                  <th className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">ENTITY</th>
                  <th className="p-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] tracking-wider">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const actColor = getActionColor(log.action_type);
                  return (
                    <tr 
                      key={log.id} 
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <td className="p-4 px-6 text-[13px] text-[var(--color-text-muted)] whitespace-nowrap font-medium">
                        {new Date(log.created_at).toLocaleString(undefined, { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit' 
                        })}
                      </td>
                      <td className="p-4 px-6">
                        <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{log.user_name || 'System'}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{log.user_email || `ID: ${log.user_id}`}</div>
                      </td>
                      <td className="p-4 px-6">
                        <span 
                          className="text-[10px] font-bold px-2 py-1 rounded border tracking-wider"
                          style={{ 
                            background: `${actColor}15`, color: actColor, borderColor: `${actColor}30`
                          }}
                        >
                          {log.action_type}
                        </span>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-primary)] capitalize">
                          {getEntityIcon(log.entity_type)} {log.entity_type} <span className="text-[var(--color-text-muted)]">#{log.entity_id}</span>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <div className="bg-black/20 p-2.5 rounded-xl border border-[var(--color-border)] flex items-start gap-2">
                          <FileCode2 size={14} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                          <div className="text-[11px] text-[var(--color-text-secondary)] font-mono break-all max-w-[300px]">
                            {log.details ? JSON.stringify(log.details) : '{}'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
