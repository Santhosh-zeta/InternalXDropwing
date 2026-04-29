'use client';

import { useState, useEffect } from 'react';
import { getAuditLogs } from '@/lib/api';
import { 
  ShieldCheck, Activity, Search, Server, 
  Database, UserCircle2, Briefcase, FileCode2
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
      case 'user': return <UserCircle2 size={14} color="#06b6d4" />;
      case 'project': return <Briefcase size={14} color="#f59e0b" />;
      default: return <Server size={14} color="#8b5cf6" />;
    }
  };

  const getActionColor = (action: string) => {
    if (!action) return '#8b5cf6';
    if (action.includes('CREATE')) return '#10b981'; // Green
    if (action.includes('DELETE')) return '#f43f5e'; // Red
    if (action.includes('UPDATE')) return '#0ea5e9'; // Blue
    return '#8b5cf6'; // Purple
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', paddingBottom: 40 }}>
      {/* Header */}
      <div className="glass" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#f43f5e" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>Security & Audit Logs</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Immutable ledger of all critical system actions. Accessible only to Super Admins.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 20, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <Activity size={16} color="#10b981" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Live Monitoring Active</span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search logs by user, action, or entity..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div className="animate-spin-slow" style={{ fontSize: 24, marginBottom: 16 }}>✦</div>
            Loading security ledger...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Database size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: 16, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 4 }}>No logs found</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>The system ledger is empty or no matches were found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>TIMESTAMP</th>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>ACTOR</th>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>ACTION</th>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>ENTITY</th>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const actColor = getActionColor(log.action_type);
                  return (
                    <tr 
                      key={log.id} 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} 
                      className="hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString(undefined, { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit' 
                        })}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{log.user_name || 'System'}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{log.user_email || `ID: ${log.user_id}`}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                          background: `${actColor}20`, color: actColor, border: `1px solid ${actColor}40`
                        }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                          {getEntityIcon(log.entity_type)} {log.entity_type} <span style={{ color: 'var(--color-text-muted)' }}>#{log.entity_id}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ 
                          background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 8, 
                          border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', gap: 8
                        }}>
                          <FileCode2 size={14} color="var(--color-text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 300 }}>
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
