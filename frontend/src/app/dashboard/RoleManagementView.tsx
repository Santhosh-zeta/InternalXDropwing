'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/constants';
import { getRoles, getRoleVentures, createRole, updateRole, deleteRole } from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Plus, Edit2, Trash2, Save, X, Loader2, ShieldCheck, AlertCircle, Lock, Crown, Building2, UserCircle2, CheckSquare } from 'lucide-react';

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

  if (![1, 2, 4].includes(currentUser.accessLevel)) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-purple-glow)]/10 border border-[var(--color-purple-glow)]/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-[var(--color-purple-glow)]" />
        </div>
        <h3 className="font-bold text-base text-[var(--color-text-primary)] mb-2">Restricted Access</h3>
        <p className="text-[var(--color-text-secondary)] text-sm font-medium">Role management requires CXO, Managing Director, or Super Admin privileges.</p>
      </div>
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
    if (!confirm(`Are you sure you want to deactivate the role "${name}"?`)) return;
    try {
      const res = await deleteRole(id);
      if (res.success) {
        toast.success('Role deactivated');
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)]" />
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

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-purple-glow)]/30 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.06) 100%)' }}>
        <div>
          <div className="text-[11px] font-bold text-[var(--color-purple-glow)] tracking-widest uppercase mb-1">Custom Roles</div>
          <div className="text-xl font-black text-[var(--color-text-primary)]">Role Management</div>
          <div className="text-[13px] font-medium text-[var(--color-text-muted)] mt-1">Create and configure custom roles with granular permissions for your ventures.</div>
        </div>
        <button onClick={() => openModal()} className="px-4 py-2 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white text-[13px] font-bold transition-colors flex items-center gap-2 shadow-sm">
          <Plus size={14} strokeWidth={3} /> Create Role
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={24} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="font-bold text-base text-[var(--color-text-primary)] mb-2">No Custom Roles Found</h3>
          <p className="text-[var(--color-text-secondary)] text-sm font-medium mb-4 max-w-sm mx-auto">You haven't defined any custom roles yet. Create one to assign specific permissions to users.</p>
          <button onClick={() => openModal()} className="px-4 py-2 rounded-lg bg-[var(--color-purple-glow)] text-white text-sm font-semibold transition-colors">
            Create First Role
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(rolesByVenture).map(([ventureName, ventureRoles]) => (
            <div key={ventureName} className="space-y-3">
              <div className="flex items-center gap-2">
                {ventureName === 'Global Roles' ? (
                  <Crown size={16} className="text-yellow-500" />
                ) : (
                  <Building2 size={16} className="text-[var(--color-purple-glow)]" />
                )}
                <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{ventureName}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ventureRoles.map(role => (
                  <div key={role.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)] rounded-2xl p-5 shadow-sm transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-all group-hover:scale-110" style={{ background: role.color }} />
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-white/10 shadow-sm" style={{ background: role.color, color: '#fff' }}>
                          {role.icon}
                        </div>
                        <div>
                          <div className="font-bold text-[15px] text-[var(--color-text-primary)]">{role.role_name}</div>
                          <div className="text-[11px] font-medium text-[var(--color-text-muted)] font-mono">{role.role_key}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(role)} className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(role.id, role.role_name)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[13px] text-[var(--color-text-secondary)] mb-4 line-clamp-2 h-10 relative z-10">
                      {role.description || 'No description provided.'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] relative z-10">
                      <div className="text-[11px] font-semibold px-2 py-1 rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                        Base Level {role.base_level}
                      </div>
                      <div className="text-[11px] font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
                        <ShieldCheck size={12} />
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: formData.color, color: '#fff' }}>
                  {formData.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--color-text-primary)]">{editingRole ? 'Edit Role' : 'Create Custom Role'}</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Configure role details and permissions</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8">
              
              {/* Left Column - Details */}
              <div className="space-y-5">
                <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">Role Details</h4>
                
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Role Name</label>
                  <input
                    type="text"
                    value={formData.role_name}
                    onChange={(e) => generateKey(e.target.value)}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:border-[var(--color-purple-glow)] focus:ring-1 focus:ring-[var(--color-purple-glow)]/30 outline-none transition-all"
                    placeholder="e.g. Content Writer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Role Key (Identifier)</label>
                  <input
                    type="text"
                    value={formData.role_key}
                    onChange={(e) => setFormData({ ...formData, role_key: e.target.value })}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-primary)] font-mono focus:border-[var(--color-purple-glow)] outline-none"
                    placeholder="e.g. content_writer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:border-[var(--color-purple-glow)] outline-none resize-none h-20"
                    placeholder="Brief description of this role's responsibilities"
                  />
                </div>

                {currentUser.accessLevel <= 2 && (
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Assign to Venture</label>
                    <select
                      value={formData.venture_id || ''}
                      onChange={(e) => setFormData({ ...formData, venture_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:border-[var(--color-purple-glow)] outline-none"
                    >
                      <option value="">Global Role (Across all ventures)</option>
                      {ventures.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Base Access Level</label>
                  <select
                    value={formData.base_level}
                    onChange={(e) => setFormData({ ...formData, base_level: parseInt(e.target.value) })}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:border-[var(--color-purple-glow)] outline-none"
                  >
                    {BASE_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Determines UI structure and default hierarchy.</p>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-2">Style (Color & Icon)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_COLORS.map(c => (
                      <button type="button" key={c} onClick={() => setFormData({ ...formData, color: c })} className={`w-6 h-6 rounded-full transition-transform ${formData.color === c ? 'scale-110 ring-2 ring-white ring-offset-1 ring-offset-[var(--color-bg-card)]' : 'hover:scale-110'}`} style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_ICONS.map(i => (
                      <button type="button" key={i} onClick={() => setFormData({ ...formData, icon: i })} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors border ${formData.icon === i ? 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]' : 'border-transparent hover:bg-[var(--color-bg-secondary)]'}`}>
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column - Permissions */}
              <div className="space-y-5">
                <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
                  <span>Custom Permissions</span>
                  <span className="text-[var(--color-purple-glow)]">{Object.values(formData.permissions).filter(Boolean).length} Enabled</span>
                </h4>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {CATEGORIES.map(cat => {
                    const catFeatures = PERMISSION_FEATURES.filter(f => f.category === cat);
                    return (
                      <div key={cat} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4">
                        <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">{cat} Features</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catFeatures.map(feature => {
                            const isEnabled = !!formData.permissions[feature.key];
                            return (
                              <button
                                key={feature.key}
                                type="button"
                                onClick={() => togglePermission(feature.key)}
                                className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${isEnabled ? 'bg-[var(--color-bg-card)] border-[var(--color-purple-glow)]/40' : 'bg-transparent border-transparent hover:bg-[var(--color-bg-card)]'}`}
                              >
                                <span className={`text-[12px] font-semibold ${isEnabled ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                                  {feature.label}
                                </span>
                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${isEnabled ? 'bg-[var(--color-purple-glow)]' : 'border border-[var(--color-text-muted)]'}`}>
                                  {isEnabled && <CheckSquare size={10} className="text-white" />}
                                </div>
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

            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 bg-[var(--color-bg-secondary)]">
              <button onClick={closeModal} className="px-5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] text-[var(--color-text-secondary)] text-[13px] font-bold transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white text-[13px] font-bold transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {submitting ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}