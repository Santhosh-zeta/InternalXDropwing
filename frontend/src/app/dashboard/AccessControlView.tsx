'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getAccessLevels, updateLevelPermissions } from '@/lib/api';
import toast from 'react-hot-toast';

interface AccessLevel {
  level_number: number;
  level_name: string;
  description: string;
  permissions: Record<string, boolean>;
}

// The full permission matrix — all features with their labels and icons
const PERMISSION_FEATURES: { key: string; label: string; icon: string; category: string }[] = [
  { key: 'view_overview', label: 'View Overview', icon: '📊', category: 'Core' },
  { key: 'view_tasks', label: 'View Tasks', icon: '✅', category: 'Core' },
  { key: 'create_tasks', label: 'Create Tasks', icon: '➕', category: 'Core' },
  { key: 'edit_tasks', label: 'Edit Tasks', icon: '✏️', category: 'Core' },
  { key: 'delete_tasks', label: 'Delete Tasks', icon: '🗑️', category: 'Core' },
  { key: 'view_projects', label: 'View Projects', icon: '📁', category: 'Projects' },
  { key: 'create_projects', label: 'Create Projects', icon: '📁', category: 'Projects' },
  { key: 'edit_projects', label: 'Edit Projects', icon: '📝', category: 'Projects' },
  { key: 'delete_projects', label: 'Delete Projects', icon: '🗑️', category: 'Projects' },
  { key: 'view_documents', label: 'View Documents', icon: '📄', category: 'Documents' },
  { key: 'upload_documents', label: 'Upload Documents', icon: '⬆️', category: 'Documents' },
  { key: 'delete_documents', label: 'Delete Documents', icon: '🗑️', category: 'Documents' },
  { key: 'view_team_chat', label: 'Team Chat', icon: '💬', category: 'Communication' },
  { key: 'view_invoices', label: 'View Invoices', icon: '🧾', category: 'Finance' },
  { key: 'create_invoices', label: 'Create Invoices', icon: '➕', category: 'Finance' },
  { key: 'view_timesheets', label: 'View Timesheets', icon: '⏱️', category: 'HR' },
  { key: 'approve_timesheets', label: 'Approve Timesheets', icon: '✅', category: 'HR' },
  { key: 'view_users', label: 'View Users', icon: '👥', category: 'Admin' },
  { key: 'manage_users', label: 'Manage Users', icon: '⚙️', category: 'Admin' },
  { key: 'view_audit_logs', label: 'View Audit Logs', icon: '📋', category: 'Admin' },
  { key: 'view_analytics', label: 'View Analytics', icon: '📈', category: 'Admin' },
  { key: 'view_reports', label: 'View Reports', icon: '📊', category: 'Admin' },
  { key: 'manage_access', label: 'Manage Access Control', icon: '🔐', category: 'System' },
  { key: 'view_database', label: 'Database Access', icon: '🗄️', category: 'System' },
];

const CATEGORIES = Array.from(new Set(PERMISSION_FEATURES.map(f => f.category)));

const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed',
  4: '#06b6d4', 5: '#f59e0b', 6: '#10b981',
  7: '#6366f1', 8: '#0ea5e9', 9: '#f43f5e',
};

const DEFAULT_PERMISSIONS: Record<number, Record<string, boolean>> = {
  2: { view_overview:true, view_tasks:true, create_tasks:true, edit_tasks:true, view_projects:true, create_projects:true, edit_projects:true, view_documents:true, upload_documents:true, view_team_chat:true, view_invoices:true, create_invoices:true, view_timesheets:true, approve_timesheets:true, view_users:true, view_analytics:true, view_reports:true },
  3: { view_overview:true, view_tasks:true, create_tasks:true, edit_tasks:true, view_projects:true, create_projects:true, edit_projects:true, view_documents:true, upload_documents:true, view_team_chat:true, view_invoices:true, create_invoices:true, view_timesheets:true, approve_timesheets:true, view_users:true, manage_users:true, view_audit_logs:true, view_reports:true },
  4: { view_overview:true, view_tasks:true, create_tasks:true, edit_tasks:true, view_projects:true, create_projects:true, edit_projects:true, view_documents:true, upload_documents:true, view_team_chat:true, view_invoices:true, view_timesheets:true, approve_timesheets:true, view_users:true, view_analytics:true, view_reports:true },
  5: { view_overview:true, view_tasks:true, create_tasks:true, edit_tasks:true, view_projects:true, create_projects:true, edit_projects:true, view_documents:true, upload_documents:true, view_team_chat:true, view_timesheets:true, view_users:true, view_reports:true },
  6: { view_overview:true, view_tasks:true, create_tasks:true, edit_tasks:true, view_projects:true, view_documents:true, upload_documents:true, view_team_chat:true, view_timesheets:true },
  7: { view_overview:true, view_tasks:true, create_tasks:true, view_projects:true, view_documents:true, view_team_chat:true, view_timesheets:true },
  8: { view_overview:true, view_tasks:true, view_projects:true, view_documents:true, view_team_chat:true },
  9: { view_tasks:true, view_projects:true, view_documents:true, view_invoices:true },
};

export default function AccessControlView({ currentUser }: { currentUser: User }) {
  const [levels, setLevels] = useState<AccessLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(2);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccessLevels();
      if (res.success) {
        const enriched = res.data.map((l: AccessLevel) => ({
          ...l,
          permissions: Object.keys(l.permissions || {}).length > 0 ? l.permissions : (DEFAULT_PERMISSIONS[l.level_number] || {}),
        }));
        setLevels(enriched);
        const first = enriched.find((l: AccessLevel) => l.level_number === 2);
        if (first) setPerms(first.permissions);
      }
    } catch {
      // Use defaults if API not yet set up
      const mock = [2,3,4,5,6,7,8,9].map(n => ({
        level_number: n,
        level_name: ['Managing Director','Admin','CXO','Manager','Executive Staff','Staff','Intern','Client'][n-2],
        description: '',
        permissions: DEFAULT_PERMISSIONS[n] || {},
      }));
      setLevels(mock);
      setPerms(DEFAULT_PERMISSIONS[2] || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const handleSelectLevel = (n: number) => {
    if (dirty && !confirm('You have unsaved changes. Discard?')) return;
    setSelectedLevel(n);
    const l = levels.find(x => x.level_number === n);
    setPerms(l?.permissions || DEFAULT_PERMISSIONS[n] || {});
    setDirty(false);
  };

  const togglePerm = (key: string) => {
    if (selectedLevel === 1) return; // can't edit L1
    setPerms(p => ({ ...p, [key]: !p[key] }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLevelPermissions(selectedLevel, perms);
      toast.success(`L${selectedLevel} permissions saved`);
      setDirty(false);
      // Update local state
      setLevels(prev => prev.map(l => l.level_number === selectedLevel ? { ...l, permissions: perms } : l));
    } catch {
      toast.error('Failed to save — check backend');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPerms(DEFAULT_PERMISSIONS[selectedLevel] || {});
    setDirty(true);
  };

  if (currentUser.accessLevel !== 1) {
    return (
      <div className="glass" style={{ borderRadius: 20, padding: 60, textAlign: 'center', border: '1px dashed var(--color-border)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Super Admin Only</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Access Control management requires Level 1 — Super Admin privileges.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        <div style={{ height: 400, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ height: 400, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
      </div>
    );
  }

  const selectedLevelData = levels.find(l => l.level_number === selectedLevel);
  const levelColor = LEVEL_COLORS[selectedLevel] || '#6366f1';
  const enabledCount = Object.values(perms).filter(Boolean).length;
  const totalCount = PERMISSION_FEATURES.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="glass" style={{
        borderRadius: 16, padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.08) 100%)',
        border: '1px solid rgba(139,92,246,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Access Control Panel</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>Permission Matrix</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Configure feature access for each role level. L1 permissions are immutable.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {dirty && (
            <>
              <button onClick={handleReset} style={{
                padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>Reset Defaults</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '9px 20px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                opacity: saving ? 0.7 : 1,
              }}>{saving ? 'Saving…' : '💾 Save Changes'}</button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Level Selector Sidebar */}
        <div className="glass" style={{ borderRadius: 16, padding: 16, border: '1px solid var(--color-border)', position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, padding: '0 4px' }}>
            Access Levels
          </div>
          {/* L1 — fixed */}
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 4,
            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#8b5cf620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👑</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>L1 — Super Admin</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>All permissions (immutable)</div>
              </div>
            </div>
          </div>
          {/* L2–L9 selectable */}
          {levels.filter(l => l.level_number > 1).map(l => {
            const c = LEVEL_COLORS[l.level_number] || '#6366f1';
            const enabled = Object.values(l.permissions || {}).filter(Boolean).length;
            const isActive = selectedLevel === l.level_number;
            return (
              <button key={l.level_number} onClick={() => handleSelectLevel(l.level_number)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '11px 14px', borderRadius: 10, border: isActive ? `1px solid ${c}50` : '1px solid transparent',
                cursor: 'pointer', marginBottom: 4, transition: 'all 0.2s',
                background: isActive ? `${c}15` : 'transparent',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? c : 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    L{l.level_number} — {l.level_name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{enabled}/{totalCount} enabled</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Permission Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Level Header */}
          <div style={{
            padding: '18px 22px', borderRadius: 14,
            background: `${levelColor}12`, border: `1px solid ${levelColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: levelColor }}>
                L{selectedLevel} — {selectedLevelData?.level_name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {enabledCount} of {totalCount} permissions enabled
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ width: 120 }}>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(enabledCount/totalCount)*100}%`, background: levelColor, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, textAlign: 'right' }}>
                {Math.round((enabledCount/totalCount)*100)}% access
              </div>
            </div>
          </div>

          {/* Grouped permission toggles */}
          {CATEGORIES.map(cat => {
            const catFeatures = PERMISSION_FEATURES.filter(f => f.category === cat);
            return (
              <div key={cat} className="glass" style={{ borderRadius: 14, padding: '18px 20px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ height: 1, flex: 0, width: 16, background: 'var(--color-border)' }} />
                  {cat}
                  <div style={{ height: 1, flex: 1, background: 'var(--color-border)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {catFeatures.map(feature => {
                    const enabled = !!perms[feature.key];
                    const isL1 = selectedLevel === 1;
                    return (
                      <div
                        key={feature.key}
                        onClick={() => !isL1 && togglePerm(feature.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 10,
                          border: `1px solid ${enabled ? levelColor + '40' : 'rgba(255,255,255,0.06)'}`,
                          background: enabled ? `${levelColor}12` : 'rgba(255,255,255,0.02)',
                          cursor: isL1 ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          opacity: isL1 ? 1 : 1,
                        }}
                        onMouseEnter={e => { if (!isL1) (e.currentTarget as HTMLDivElement).style.background = enabled ? `${levelColor}20` : 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { if (!isL1) (e.currentTarget as HTMLDivElement).style.background = enabled ? `${levelColor}12` : 'rgba(255,255,255,0.02)'; }}
                      >
                        <span style={{ fontSize: 15 }}>{feature.icon}</span>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                          {feature.label}
                        </div>
                        {/* Toggle Switch */}
                        <div style={{
                          width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
                          background: enabled ? levelColor : 'rgba(255,255,255,0.1)',
                          transition: 'background 0.2s',
                        }}>
                          <div style={{
                            position: 'absolute', top: 2, left: enabled ? 18 : 2,
                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {dirty && (
            <div style={{
              padding: '14px 20px', borderRadius: 12,
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>⚠️ You have unsaved changes for L{selectedLevel} — {selectedLevelData?.level_name}</span>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: '#8b5cf6', color: '#fff',
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
              }}>{saving ? 'Saving…' : '💾 Save'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
