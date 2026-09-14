'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getAccessLevels, updateLevelPermissions, get2FAConfig, update2FAConfig } from '@/lib/api';
import toast from 'react-hot-toast';
import { ShieldCheck, Save, RotateCcw, Crown, AlertCircle, Lock, RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, SkeletonCard, useConfirm } from '@/components/ui';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enable2FA, setEnable2FA] = useState(true);
  const [toggling2FA, setToggling2FA] = useState(false);
  const confirm = useConfirm();

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
        setError(null);
      } else {
        throw new Error('Request was not successful');
      }
    } catch {
      // Previously fell back to a client-fabricated list of levels and
      // permissions and rendered it as if it were the real matrix — a Super
      // Admin editing "defaults" here could believe they were viewing and
      // saving actual configuration. Show a real error instead.
      setError('Could not load access control settings. Check your connection and try again.');
    } finally { setLoading(false); }
    // `selectedLevel` is read only to pick which level's permissions to
    // preload — captured once is intentional, so it is deliberately left out
    // of the dependency list rather than making the whole fetch re-run on
    // every level switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetchLevels();
  }, [fetchLevels]);

  useEffect(() => {
    // The loader's first statement is an `await`, so no setState runs
    // synchronously here — the rule cannot see past the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLevels();
  }, [fetchLevels]);

  const handleSelectLevel = async (n: number) => {
    if (dirty) {
      const discard = await confirm({
        title: 'Discard unsaved changes?',
        description: 'You have unsaved permission changes for this level. Switching levels will discard them.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!discard) return;
    }
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
      <EmptyState
        icon={<Lock size={22} aria-hidden="true" />}
        title="Super Admin only"
        description="Access Control management requires Level 1 — Super Admin privileges. Contact a Super Admin if you need a permission changed."
      />
    );
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="grid grid-cols-[220px_1fr] gap-5 items-start">
        <span className="sr-only">Loading access control settings…</span>
        <SkeletonCard />
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        tone="error"
        icon={<ShieldCheck size={22} aria-hidden="true" />}
        title="Access control unavailable"
        description={error}
        action={
          <Button
            variant="primary"
            leadingIcon={<RefreshCw size={16} aria-hidden="true" />}
            onClick={retry}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const selectedLevelData = levels.find(l => l.level_number === selectedLevel);
  const levelColor = LEVEL_COLORS[selectedLevel] || '#6366f1';
  const enabledCount = Object.values(perms).filter(Boolean).length;
  const totalCount = PERMISSION_FEATURES.length;
  const accessPct = Math.round((enabledCount / totalCount) * 100);

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header */}
      <Card padding="none" className="p-5 flex items-center justify-between flex-wrap gap-4 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.06) 100%)', borderColor: 'rgba(139,92,246,0.3)' }}>
        <div>
          <div className="text-[11px] font-bold text-[var(--color-purple-glow)] tracking-widest uppercase mb-1">Access Control Panel</div>
          <h2 className="text-xl font-black text-[var(--color-text-primary)]">Permission Matrix</h2>
          <p className="text-[13px] font-medium text-[var(--color-text-muted)] mt-1">Configure feature access for each role level. L1 permissions are immutable.</p>
        </div>
        {dirty && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<RotateCcw size={14} aria-hidden="true" />}
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              leadingIcon={<Save size={14} aria-hidden="true" />}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        )}
      </Card>

      {/* Global 2FA Config */}
      <Card padding="none" className="p-5 flex items-center justify-between shadow-sm">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-purple-glow)]" aria-hidden="true" /> Global Two-Factor Authentication
          </h3>
          <p id="global-2fa-hint" className="text-[13px] font-medium text-[var(--color-text-muted)] mt-1">
            Enforce OTP verification during login for all users system-wide.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enable2FA}
          aria-label="Global two-factor authentication"
          aria-describedby="global-2fa-hint"
          onClick={handleToggle2FA}
          disabled={toggling2FA}
          className={`relative w-12 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enable2FA ? 'bg-[var(--color-purple-glow)]' : 'bg-[var(--color-border)]'}`}
        >
          <span aria-hidden="true" className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enable2FA ? 'left-[26px]' : 'left-1'}`} />
        </button>
      </Card>

      <div className="grid grid-cols-[220px_1fr] gap-5 items-start">
        {/* Level Sidebar */}
        <Card padding="none" className="p-3 shadow-sm sticky top-4">
          <h3 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 px-2">Access Levels</h3>
          {/* L1 — Super Admin */}
          <button
            type="button"
            onClick={() => handleSelectLevel(1)}
            aria-pressed={selectedLevel === 1}
            className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-[var(--radius-control)] mb-1 transition-all border ${selectedLevel === 1 ? 'shadow-sm' : 'border-transparent hover:bg-[var(--color-bg-secondary)]'}`}
            style={selectedLevel === 1 ? { background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.4)' } : {}}
          >
            <Crown size={14} className="text-[var(--color-purple-glow)] shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-bold text-[var(--color-purple-glow)]">L1 — Super Admin</span>
              <span className="block text-[10px] font-medium text-[var(--color-text-muted)]">Full system access</span>
            </span>
            {selectedLevel === 1 && <span aria-hidden="true" className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-purple-glow)]" />}
          </button>
          {levels.filter(l => l.level_number > 1).map(l => {
            const c = LEVEL_COLORS[l.level_number] || '#6366f1';
            const enabled = Object.values(l.permissions || {}).filter(Boolean).length;
            const isActive = selectedLevel === l.level_number;
            return (
              <button
                key={l.level_number}
                type="button"
                onClick={() => handleSelectLevel(l.level_number)}
                aria-pressed={isActive}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-[var(--radius-control)] mb-1 transition-all border ${isActive ? 'shadow-sm' : 'border-transparent hover:bg-[var(--color-bg-secondary)]'}`}
                style={isActive ? { background: `${c}12`, borderColor: `${c}40` } : {}}
              >
                <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-bold truncate" style={{ color: isActive ? c : 'var(--color-text-secondary)' }}>L{l.level_number} — {l.level_name}</span>
                  <span className="block text-[10px] font-medium text-[var(--color-text-muted)]">{enabled}/{totalCount} enabled</span>
                </span>
              </button>
            );
          })}
        </Card>

        {/* Permission Matrix */}
        <div className="flex flex-col gap-4">
          {/* Level header */}
          <div className="p-4 rounded-[var(--radius-card)] border flex items-center justify-between shadow-sm" style={{ background: `${levelColor}10`, borderColor: `${levelColor}30` }}>
            <div>
              <h3 className="text-lg font-black" style={{ color: levelColor }}>L{selectedLevel} — {selectedLevelData?.level_name}</h3>
              <p className="text-[13px] font-medium text-[var(--color-text-muted)] mt-0.5">{enabledCount} of {totalCount} permissions enabled</p>
            </div>
            <div className="w-28">
              <div
                role="progressbar"
                aria-valuenow={accessPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${enabledCount} of ${totalCount} permissions enabled for level ${selectedLevel}`}
                className="h-2 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden"
              >
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(enabledCount / totalCount) * 100}%`, background: levelColor }} />
              </div>
              <div className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1.5 text-right">{accessPct}% access</div>
            </div>
          </div>

          {CATEGORIES.map(cat => {
            const catFeatures = PERMISSION_FEATURES.filter(f => f.category === cat);
            return (
              <Card key={cat} padding="none" className="p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border)]" />
                  <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{cat}</h4>
                  <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border)]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {catFeatures.map(feature => {
                    const isL1 = selectedLevel === 1;
                    const enabled = isL1 ? true : !!perms[feature.key];
                    return (
                      <button
                        key={feature.key}
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        disabled={isL1}
                        onClick={() => !isL1 && togglePerm(feature.key)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-[var(--radius-control)] border transition-all ${isL1 ? 'cursor-default' : 'cursor-pointer'}`}
                        style={{
                          background: enabled ? `${levelColor}10` : 'var(--color-bg-secondary)',
                          borderColor: enabled ? `${levelColor}40` : 'var(--color-border)',
                        }}
                      >
                        <span className="flex-1 text-[13px] font-semibold" style={{ color: enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                          {feature.label}
                        </span>
                        {/* Toggle */}
                        <span aria-hidden="true" className="w-9 h-5 rounded-full relative shrink-0 transition-colors block" style={{ background: enabled ? levelColor : 'var(--color-border)' }}>
                          <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all block" style={{ left: enabled ? '18px' : '2px' }} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          {dirty && (
            <div className="p-4 rounded-[var(--radius-card)] border flex items-center justify-between" style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
              <span className="text-[13px] font-bold text-[#a78bfa] flex items-center gap-2">
                <AlertCircle size={15} aria-hidden="true" /> Unsaved changes for L{selectedLevel} — {selectedLevelData?.level_name}
              </span>
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                leadingIcon={<Save size={13} aria-hidden="true" />}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
