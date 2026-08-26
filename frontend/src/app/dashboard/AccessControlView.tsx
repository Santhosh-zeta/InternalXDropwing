'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getAccessLevels, updateLevelPermissions, get2FAConfig, update2FAConfig } from '@/lib/api';
import toast from 'react-hot-toast';
import { ShieldCheck, Save, RotateCcw, Crown, Loader2, AlertCircle, Lock } from 'lucide-react';

interface AccessLevel { level_number: number; level_name: string; description: string; permissions: Record<string, boolean>; }

const PERMISSION_FEATURES: { key: string; label: string; category: string }[] = [
  { key: 'view_overview', label: 'View Overview', category: 'Core' },
  { key: 'view_tasks', label: 'View Tasks', category: 'Core' },
  { key: 'create_tasks', label: 'Create Tasks', category: 'Core' },
  { key: 'edit_tasks', label: 'Edit Tasks', category: 'Core' },
  { key: 'delete_tasks', label: 'Delete Tasks', category: 'Core' },
  { key: 'view_projects', label: 'View Projects', category: 'Projects' },
  { key: 'create_projects', label: 'Create Projects', category: 'Projects' },
  { key: 'edit_projects', label: 'Edit Projects', category: 'Projects' },
  { key: 'delete_projects', label: 'Delete Projects', category: 'Projects' },
  { key: 'view_documents', label: 'View Documents', category: 'Documents' },
  { key: 'upload_documents', label: 'Upload Documents', category: 'Documents' },
  { key: 'delete_documents', label: 'Delete Documents', category: 'Documents' },
  { key: 'view_team_chat', label: 'Team Chat', category: 'Communication' },
  { key: 'view_invoices', label: 'View Invoices', category: 'Finance' },
  { key: 'create_invoices', label: 'Create Invoices', category: 'Finance' },
  { key: 'view_timesheets', label: 'View Timesheets', category: 'HR' },
  { key: 'approve_timesheets', label: 'Approve Timesheets', category: 'HR' },
  { key: 'view_users', label: 'View Users', category: 'Admin' },
  { key: 'manage_users', label: 'Manage Users', category: 'Admin' },
  { key: 'view_audit_logs', label: 'View Audit Logs', category: 'Admin' },
  { key: 'view_analytics', label: 'View Analytics', category: 'Admin' },
  { key: 'view_reports', label: 'View Reports', category: 'Admin' },
  { key: 'manage_access', label: 'Manage Access Control', category: 'System' },
  { key: 'view_database', label: 'Database Access', category: 'System' },
];

const CATEGORIES = Array.from(new Set(PERMISSION_FEATURES.map(f => f.category)));

const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed', 4: '#06b6d4',
  5: '#f59e0b', 6: '#10b981', 7: '#6366f1', 8: '#0ea5e9', 9: '#f43f5e',
};

const DEFAULT_PERMISSIONS: Record<number, Record<string, boolean>> = {
  2: { view_overview: true, view_tasks: true, create_tasks: true, edit_tasks: true, view_projects: true, create_projects: true, edit_projects: true, view_documents: true, upload_documents: true, view_team_chat: true, view_invoices: true, create_invoices: true, view_timesheets: true, approve_timesheets: true, view_users: true, view_analytics: true, view_reports: true },
  3: { view_overview: true, view_tasks: true, create_tasks: true, edit_tasks: true, view_projects: true, create_projects: true, edit_projects: true, view_documents: true, upload_documents: true, view_team_chat: true, view_invoices: true, create_invoices: true, view_timesheets: true, approve_timesheets: true, view_users: true, manage_users: true, view_audit_logs: true, view_reports: true },
  4: { view_overview: true, view_tasks: true, create_tasks: true, edit_tasks: true, view_projects: true, create_projects: true, edit_projects: true, view_documents: true, upload_documents: true, view_team_chat: true, view_invoices: true, view_timesheets: true, approve_timesheets: true, view_users: true, view_analytics: true, view_reports: true },
  5: { view_overview: true, view_tasks: true, create_tasks: true, edit_tasks: true, view_projects: true, create_projects: true, edit_projects: true, view_documents: true, upload_documents: true, view_team_chat: true, view_timesheets: true, view_users: true, view_reports: true },
  6: { view_overview: true, view_tasks: true, create_tasks: true, edit_tasks: true, view_projects: true, view_documents: true, upload_documents: true, view_team_chat: true, view_timesheets: true },
  7: { view_overview: true, view_tasks: true, create_tasks: true, view_projects: true, view_documents: true, view_team_chat: true, view_timesheets: true },
  8: { view_overview: true, view_tasks: true, view_projects: true, view_documents: true, view_team_chat: true },
  9: { view_tasks: true, view_projects: true, view_documents: true, view_invoices: true },
};

export default function AccessControlView({ currentUser }: { currentUser: User }) {
  const [levels, setLevels] = useState<AccessLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(2);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enable2FA, setEnable2FA] = useState(true);
  const [toggling2FA, setToggling2FA] = useState(false);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const configRes = await get2FAConfig();
      if (configRes.success) {
        setEnable2FA(configRes.enable2FA);
      }
      
      const res = await getAccessLevels();
      if (res.success) {
        const enriched = res.data.map((l: AccessLevel) => {
          if (l.level_number === 1) {
            // L1 always has all permissions
            const allPerms: Record<string, boolean> = {};
            PERMISSION_FEATURES.forEach(f => allPerms[f.key] = true);
            return { ...l, permissions: allPerms };
          }
          return { 
            ...l, 
            permissions: Object.keys(l.permissions || {}).length > 0 
              ? l.permissions 
              : (DEFAULT_PERMISSIONS[l.level_number] || {}) 
          };
        });
        setLevels(enriched);
        const firstSelected = enriched.find((l: AccessLevel) => l.level_number === selectedLevel);
        if (firstSelected) setPerms(firstSelected.permissions);
      }
    } catch {
      toast.error('Failed to load access control settings. Showing defaults.');
      const mock = [2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
        level_number: n, level_name: ['Managing Director', 'Admin', 'CXO', 'Manager', 'Executive Staff', 'Staff', 'Intern', 'Client'][n - 2], description: '', permissions: DEFAULT_PERMISSIONS[n] || {},
      }));
      setLevels(mock); setPerms(DEFAULT_PERMISSIONS[2] || {});
    } finally { setLoading(false); }
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
    if (selectedLevel === 1) return;
    setPerms(p => ({ ...p, [key]: !p[key] }));
    setDirty(true);
  };

  const handleToggle2FA = async () => {
    setToggling2FA(true);
    try {
      const res = await update2FAConfig(!enable2FA);
      if (res.success) {
        setEnable2FA(res.enable2FA);
        toast.success(`Two-Factor Authentication is now ${res.enable2FA ? 'enabled' : 'disabled'}`);
      }
    } catch {
      toast.error('Failed to update 2FA configuration');
    } finally {
      setToggling2FA(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLevelPermissions(selectedLevel, perms);
      toast.success('Access control settings saved.');
      setDirty(false);
      setLevels(prev => prev.map(l => l.level_number === selectedLevel ? { ...l, permissions: perms } : l));
    } catch { toast.error('Failed to save settings. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleReset = () => { setPerms(DEFAULT_PERMISSIONS[selectedLevel] || {}); setDirty(true); };

  if (currentUser.accessLevel !== 1) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-purple-glow)]/10 border border-[var(--color-purple-glow)]/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-[var(--color-purple-glow)]" />
        </div>
        <h3 className="font-bold text-base text-[var(--color-text-primary)] mb-2">Super Admin Only</h3>
        <p className="text-[var(--color-text-secondary)] text-sm font-medium">Access Control management requires Level 1 — Super Admin privileges.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-[240px_1fr] gap-5">
        {[1, 2].map(i => <div key={i} className="h-96 rounded-2xl bg-[var(--color-bg-secondary)] animate-pulse" />)}
      </div>
    );
  }

  const selectedLevelData = levels.find(l => l.level_number === selectedLevel);
  const levelColor = LEVEL_COLORS[selectedLevel] || '#6366f1';
  const enabledCount = Object.values(perms).filter(Boolean).length;
  const totalCount = PERMISSION_FEATURES.length;

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-purple-glow)]/30 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.06) 100%)' }}>
        <div>
          <div className="text-[11px] font-bold text-[var(--color-purple-glow)] tracking-widest uppercase mb-1">Access Control Panel</div>
          <div className="text-xl font-black text-[var(--color-text-primary)]">Permission Matrix</div>
          <div className="text-[13px] font-medium text-[var(--color-text-muted)] mt-1">Configure feature access for each role level. L1 permissions are immutable.</div>
        </div>
        {dirty && (
          <div className="flex gap-3">
            <button onClick={handleReset} className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] text-[13px] font-bold transition-colors flex items-center gap-2">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white text-[13px] font-bold transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Global 2FA Config */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-[15px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-purple-glow)]" /> Global Two-Factor Authentication
          </div>
          <div className="text-[13px] font-medium text-[var(--color-text-muted)] mt-1">
            Enforce OTP verification during login for all users system-wide.
          </div>
        </div>
        <button 
          onClick={handleToggle2FA}
          disabled={toggling2FA}
          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${enable2FA ? 'bg-[var(--color-purple-glow)]' : 'bg-[var(--color-border)]'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enable2FA ? 'left-[26px]' : 'left-1'}`} />
        </button>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-5 items-start">
        {/* Level Sidebar */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-3 shadow-sm sticky top-4">
          <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 px-2">Access Levels</div>
          {/* L1 — Super Admin */}
          <button onClick={() => handleSelectLevel(1)}
            className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all border ${selectedLevel === 1 ? 'border shadow-sm' : 'border-transparent hover:bg-[var(--color-bg-secondary)]'}`}
            style={selectedLevel === 1 ? { background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.4)' } : {}}
          >
            <Crown size={14} className="text-[var(--color-purple-glow)] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-[var(--color-purple-glow)]">L1 — Super Admin</div>
              <div className="text-[10px] font-medium text-[var(--color-text-muted)]">Full system access</div>
            </div>
            {selectedLevel === 1 && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-purple-glow)]" />}
          </button>
          {levels.filter(l => l.level_number > 1).map(l => {
            const c = LEVEL_COLORS[l.level_number] || '#6366f1';
            const enabled = Object.values(l.permissions || {}).filter(Boolean).length;
            const isActive = selectedLevel === l.level_number;
            return (
              <button key={l.level_number} onClick={() => handleSelectLevel(l.level_number)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all border ${isActive ? 'border shadow-sm' : 'border-transparent hover:bg-[var(--color-bg-secondary)]'}`}
                style={isActive ? { background: `${c}12`, borderColor: `${c}40` } : {}}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold truncate" style={{ color: isActive ? c : 'var(--color-text-secondary)' }}>L{l.level_number} — {l.level_name}</div>
                  <div className="text-[10px] font-medium text-[var(--color-text-muted)]">{enabled}/{totalCount} enabled</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Permission Matrix */}
        <div className="flex flex-col gap-4">
          {/* Level header */}
          <div className="p-4 rounded-2xl border flex items-center justify-between shadow-sm" style={{ background: `${levelColor}10`, borderColor: `${levelColor}30` }}>
            <div>
              <div className="text-lg font-black" style={{ color: levelColor }}>L{selectedLevel} — {selectedLevelData?.level_name}</div>
              <div className="text-[13px] font-medium text-[var(--color-text-muted)] mt-0.5">{enabledCount} of {totalCount} permissions enabled</div>
            </div>
            <div className="w-28">
              <div className="h-2 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(enabledCount / totalCount) * 100}%`, background: levelColor }} />
              </div>
              <div className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1.5 text-right">{Math.round((enabledCount / totalCount) * 100)}% access</div>
            </div>
          </div>

          {CATEGORIES.map(cat => {
            const catFeatures = PERMISSION_FEATURES.filter(f => f.category === cat);
            return (
              <div key={cat} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{cat}</span>
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {catFeatures.map(feature => {
                    const isL1 = selectedLevel === 1;
                    const enabled = isL1 ? true : !!perms[feature.key];
                    return (
                      <div key={feature.key} onClick={() => !isL1 && togglePerm(feature.key)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isL1 ? 'cursor-default' : 'cursor-pointer'}`}
                        style={{
                          background: enabled ? `${levelColor}10` : 'var(--color-bg-secondary)',
                          borderColor: enabled ? `${levelColor}40` : 'var(--color-border)',
                        }}
                      >
                        <div className="flex-1 text-[13px] font-semibold" style={{ color: enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                          {feature.label}
                        </div>
                        {/* Toggle */}
                        <div className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: enabled ? levelColor : 'var(--color-border)' }}>
                          <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: enabled ? '18px' : '2px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {dirty && (
            <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
              <span className="text-[13px] font-bold text-[#a78bfa] flex items-center gap-2">
                <AlertCircle size={15} /> Unsaved changes for L{selectedLevel} — {selectedLevelData?.level_name}
              </span>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 rounded-xl bg-[var(--color-purple-glow)] text-white text-[13px] font-bold flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
