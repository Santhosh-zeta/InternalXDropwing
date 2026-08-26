'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getRoles, getRoleVentures, createRole, updateRole, deleteRole, getRoleAssignableUsers, assignRoleToUser, removeRoleFromUser } from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Plus, Edit2, Trash2, Save, ShieldCheck, Lock, Crown, Building2, UserCircle2, Check } from 'lucide-react';
import {
  Badge, Button, EmptyState, Field, Modal, Select, SkeletonCard, SkeletonText, Textarea,
  TextField, useConfirm,
} from '@/components/ui';

interface Role {
  id: number;
  venture_id: number | null;
  role_name: string;
  role_key: string;
  description: string;
  color: string;
  icon: string;
  base_level: number;
  permissions: Record<string, boolean>;
  is_active: boolean;
  sort_order: number;
  venture_name?: string;
  venture_color?: string;
}

interface Venture {
  id: number;
  name: string;
  slug: string;
  primary_color: string;
}

const PERMISSION_FEATURES = [
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
];

const CATEGORIES = Array.from(new Set(PERMISSION_FEATURES.map(f => f.category)));

const BASE_LEVELS = [
  { value: 5, label: 'Level 5 (Team Lead / Manager)' },
  { value: 6, label: 'Level 6 (Senior Staff)' },
  { value: 7, label: 'Level 7 (Staff / Executive)' },
  { value: 8, label: 'Level 8 (Junior / Intern)' },
  { value: 9, label: 'Level 9 (External / Client)' }
];

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'];
const PRESET_ICONS = ['🔷', '⭐', '🎯', '🔥', '⚡', '💡', '🛡️', '👑', '🚀', '📊', '💼', '🔧'];

export default function RoleManagementView({ currentUser }: { currentUser: User }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Role assignment state
  const [assigningRole, setAssigningRole] = useState<number | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    role_name: '',
    role_key: '',
    description: '',
    color: '#6366f1',
    icon: '🔷',
    base_level: 5,
    venture_id: null as number | null,
    permissions: {} as Record<string, boolean>
  });

  const confirm = useConfirm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, venturesRes] = await Promise.all([
        getRoles(),
        getRoleVentures()
      ]);
      if (rolesRes.success) setRoles(rolesRes.data);
      if (venturesRes.success) setVentures(venturesRes.data);
    } catch (err) {
      toast.error('Failed to load role data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ([1, 2, 4].includes(currentUser.accessLevel)) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // Fetch assignable users when the assignment modal opens
  useEffect(() => {
    if (assigningRole === null) return;
    setLoadingUsers(true);
    getRoleAssignableUsers()
      .then(res => { if (res.success) setAssignableUsers(res.data); })
      .catch(() => toast.error('Failed to load team members'))
      .finally(() => setLoadingUsers(false));
  }, [assigningRole]);

  const handleAssignRole = async (roleId: number, userId: number) => {
    try {
      await assignRoleToUser(userId, roleId);
      toast.success('Role assigned successfully');
      fetchData();
    } catch {
      toast.error('Failed to assign role');
    }
  };

  const handleRemoveRole = async (roleId: number, userId: number) => {
    try {
      await removeRoleFromUser(userId, roleId);
      toast.success('Role removed');
      fetchData();
    } catch {
      toast.error('Failed to remove role');
    }
  };

  if (![1, 2, 4].includes(currentUser.accessLevel)) {
    return (
      <EmptyState
        tone="error"
        icon={<Lock size={22} aria-hidden="true" />}
        title="Restricted Access"
        description="Role management requires CXO, Managing Director, or Super Admin privileges."
      />
    );
  }

  const openModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        role_name: role.role_name,
        role_key: role.role_key,
        description: role.description || '',
        color: role.color || '#6366f1',
        icon: role.icon || '🔷',
        base_level: role.base_level || 5,
        venture_id: role.venture_id,
        permissions: role.permissions || {}
      });
    } else {
      setEditingRole(null);
      setFormData({
        role_name: '',
        role_key: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: PRESET_ICONS[0],
        base_level: 5,
        venture_id: currentUser.accessLevel === 4 ? currentUser.venture?.id || null : (ventures[0]?.id || null),
        permissions: {}
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const generateKey = (name: string) => {
    if (!editingRole) {
      setFormData(prev => ({ ...prev, role_name: name, role_key: name.toLowerCase().replace(/[^a-z0-9_]/g, '_') }));
    } else {
      setFormData(prev => ({ ...prev, role_name: name }));
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_name || !formData.role_key) {
      toast.error('Role name and key are required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRole) {
        const res = await updateRole(editingRole.id, formData);
        if (res.success) {
          toast.success('Role updated successfully');
          fetchData();
          closeModal();
        } else {
          toast.error(res.message || 'Failed to update role');
        }
      } else {
        const res = await createRole(formData);
        if (res.success) {
          toast.success('Role created successfully');
          fetchData();
          closeModal();
        } else {
          toast.error(res.message || 'Failed to create role');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Server error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = await confirm({
      title: `Delete the role "${name}"?`,
      description: 'Every member holding this role loses its permissions immediately. This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await deleteRole(id);
      if (res.success) {
        toast.success('Role deleted');
        fetchData();
      } else {
        toast.error(res.message || 'Failed to delete role');
      }
    } catch (err) {
      toast.error('Failed to delete role');
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <span className="sr-only">Loading roles…</span>
        {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  // Group roles by venture
  const rolesByVenture: Record<string, Role[]> = {};
  roles.forEach(role => {
    const key = role.venture_id ? role.venture_name || 'Unknown Venture' : 'Global Roles';
    if (!rolesByVenture[key]) rolesByVenture[key] = [];
    rolesByVenture[key].push(role);
  });

  const assigningRoleName = roles.find(r => r.id === assigningRole)?.role_name;

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-purple-glow)]/30 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.06) 100%)' }}>
        <div>
          <div className="text-[11px] font-bold text-[var(--color-purple-glow)] tracking-widest uppercase mb-1">Custom Roles</div>
          <h2 className="text-xl font-black text-[var(--color-text-primary)]">Role Management</h2>
          <p className="text-[13px] font-medium text-[var(--color-text-muted)] mt-1">Create and configure custom roles with granular permissions for your ventures.</p>
        </div>
        <Button
          variant="primary"
          leadingIcon={<Plus size={14} strokeWidth={3} aria-hidden="true" />}
          onClick={() => openModal()}
        >
          Create Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={22} aria-hidden="true" />}
          title="No custom roles yet"
          description="Custom roles let you grant a precise set of permissions instead of relying on access levels alone. Create one and assign it to your team."
          action={
            <Button
              variant="primary"
              leadingIcon={<Plus size={16} strokeWidth={3} aria-hidden="true" />}
              onClick={() => openModal()}
            >
              Create your first role
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(rolesByVenture).map(([ventureName, ventureRoles]) => (
            <div key={ventureName} className="space-y-3">
              <div className="flex items-center gap-2">
                {ventureName === 'Global Roles' ? (
                  <Crown size={16} aria-hidden="true" className="text-yellow-500" />
                ) : (
                  <Building2 size={16} aria-hidden="true" className="text-[var(--color-purple-glow)]" />
                )}
                <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{ventureName}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ventureRoles.map(role => (
                  <div key={role.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)] rounded-2xl p-5 shadow-sm transition-all group relative overflow-hidden">
                    <div aria-hidden="true" className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-all group-hover:scale-110" style={{ background: role.color }} />

                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div aria-hidden="true" className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-white/10 shadow-sm shrink-0" style={{ background: role.color, color: '#fff' }}>
                          {role.icon}
                        </div>
                        <div>
                          <div className="font-bold text-[15px] text-[var(--color-text-primary)]">{role.role_name}</div>
                          <div className="text-[11px] font-medium text-[var(--color-text-muted)] font-mono">{role.role_key}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          iconOnly
                          aria-label={`Assign members to ${role.role_name}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssigningRole(role.id)}
                        >
                          <Users size={14} aria-hidden="true" />
                        </Button>
                        <Button
                          iconOnly
                          aria-label={`Edit role ${role.role_name}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(role)}
                        >
                          <Edit2 size={14} aria-hidden="true" />
                        </Button>
                        <Button
                          iconOnly
                          aria-label={`Delete role ${role.role_name}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(role.id, role.role_name)}
                          className="text-[var(--color-rose)] hover:text-[var(--color-rose)] hover:bg-[var(--color-rose)]/10"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-[13px] text-[var(--color-text-secondary)] mb-4 line-clamp-2 h-10 relative z-10">
                      {role.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] relative z-10">
                      <Badge tone="neutral">Base Level {role.base_level}</Badge>
                      <div className="text-[11px] font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
                        <ShieldCheck size={12} aria-hidden="true" />
                        {Object.values(role.permissions || {}).filter(Boolean).length} Permissions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Members Modal */}
      <Modal
        open={assigningRole !== null}
        onClose={() => setAssigningRole(null)}
        title="Assign Members"
        description={assigningRoleName}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setAssigningRole(null)}>
            Close
          </Button>
        }
      >
        {loadingUsers ? (
          <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-2">
            <span className="sr-only">Loading team members…</span>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>
        ) : assignableUsers.length === 0 ? (
          <EmptyState
            icon={<UserCircle2 size={22} aria-hidden="true" />}
            title="No assignable team members"
            description="Everyone in scope either already holds this role or sits outside the ventures you manage."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {assignableUsers.map((user: any) => {
              const hasRole = Array.isArray(user.roles) && user.roles.some((r: any) => r.id === assigningRole);
              const displayName = user.full_name || user.name;
              return (
                <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-muted)] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div aria-hidden="true" className="w-8 h-8 shrink-0 rounded-full bg-[var(--color-purple-glow)]/20 border border-[var(--color-purple-glow)]/30 flex items-center justify-center text-sm font-bold text-[var(--color-purple-glow)]">
                      {(user.full_name || user.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">{displayName}</div>
                      <div className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">{user.email}</div>
                    </div>
                  </div>
                  {hasRole ? (
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Remove ${assigningRoleName ?? 'role'} from ${displayName}`}
                      onClick={() => assigningRole !== null && handleRemoveRole(assigningRole, user.id)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="subtle"
                      size="sm"
                      aria-label={`Assign ${assigningRoleName ?? 'role'} to ${displayName}`}
                      onClick={() => assigningRole !== null && handleAssignRole(assigningRole, user.id)}
                    >
                      Assign
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        size="lg"
        title={
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-base"
              style={{ background: formData.color, color: '#fff' }}
            >
              {formData.icon}
            </span>
            {editingRole ? 'Edit Role' : 'Create Custom Role'}
          </span>
        }
        description="Configure role details and permissions"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              loading={submitting}
              leadingIcon={<Save size={14} aria-hidden="true" />}
              onClick={(e) => handleSubmit(e)}
            >
              {submitting ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8">

          {/* Left Column - Details */}
          <div className="space-y-5">
            <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">Role Details</h4>

            <TextField
              label="Role Name"
              required
              value={formData.role_name}
              onChange={(e) => generateKey(e.target.value)}
              placeholder="e.g. Content Writer"
            />

            <TextField
              label="Role Key (Identifier)"
              required
              hint="Used internally by permission checks."
              value={formData.role_key}
              onChange={(e) => setFormData({ ...formData, role_key: e.target.value })}
              placeholder="e.g. content_writer"
              className="[&_input]:font-mono"
            />

            <Field label="Description">
              {({ id }) => (
                <Textarea
                  id={id}
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role's responsibilities"
                />
              )}
            </Field>

            {currentUser.accessLevel <= 2 && (
              <Field label="Assign to Venture">
                {({ id }) => (
                  <Select
                    id={id}
                    value={formData.venture_id || ''}
                    onChange={(e) => setFormData({ ...formData, venture_id: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">Global Role (Across all ventures)</option>
                    {ventures.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            <Field label="Base Access Level" hint="Determines UI structure and default hierarchy.">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={formData.base_level}
                  onChange={(e) => setFormData({ ...formData, base_level: parseInt(e.target.value) })}
                >
                  {BASE_LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </Select>
              )}
            </Field>

            <div>
              <p id="role-style-label" className="block text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-2">
                Style (Color &amp; Icon)
              </p>
              <div role="group" aria-labelledby="role-style-label">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      type="button"
                      key={c}
                      aria-label={`Use colour ${c}`}
                      aria-pressed={formData.color === c}
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-6 h-6 rounded-full transition-transform ${formData.color === c ? 'scale-110 ring-2 ring-white ring-offset-1 ring-offset-[var(--color-bg-card)]' : 'hover:scale-110'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {PRESET_ICONS.map(i => (
                    <button
                      type="button"
                      key={i}
                      aria-label={`Use icon ${i}`}
                      aria-pressed={formData.icon === i}
                      onClick={() => setFormData({ ...formData, icon: i })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors border ${formData.icon === i ? 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]' : 'border-transparent hover:bg-[var(--color-bg-secondary)]'}`}
                    >
                      <span aria-hidden="true">{i}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Permissions */}
          <div className="space-y-5">
            <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
              <span>Custom Permissions</span>
              <span className="text-[var(--color-purple-glow)]">{Object.values(formData.permissions).filter(Boolean).length} Enabled</span>
            </h4>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {CATEGORIES.map(cat => {
                const catFeatures = PERMISSION_FEATURES.filter(f => f.category === cat);
                const groupId = `perm-group-${cat.toLowerCase()}`;
                return (
                  <div key={cat} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4">
                    <div id={groupId} className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">{cat} Features</div>
                    <div role="group" aria-labelledby={groupId} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catFeatures.map(feature => {
                        const isEnabled = !!formData.permissions[feature.key];
                        return (
                          <button
                            key={feature.key}
                            type="button"
                            aria-pressed={isEnabled}
                            onClick={() => togglePermission(feature.key)}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-left transition-all ${isEnabled ? 'bg-[var(--color-bg-card)] border-[var(--color-purple-glow)]/40' : 'bg-transparent border-transparent hover:bg-[var(--color-bg-card)]'}`}
                          >
                            <span className={`text-[12px] font-semibold ${isEnabled ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                              {feature.label}
                            </span>
                            <span aria-hidden="true" className={`w-4 h-4 shrink-0 rounded flex items-center justify-center transition-colors ${isEnabled ? 'bg-[var(--color-purple-glow)]' : 'border border-[var(--color-text-muted)]'}`}>
                              {isEnabled && <Check size={11} strokeWidth={3} className="text-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
