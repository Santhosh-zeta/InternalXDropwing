'use client';

import { useState, useEffect } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getUsers, updateUser, deleteUser, getUserDetails } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Search, Filter, Edit2, Trash2, X, Check,
  Shield, Building2, Briefcase, Mail, UserCircle2,
  ChevronDown, UserPlus, AlertCircle, Phone, Clock,
  Activity, Calendar, Loader2, Info
} from 'lucide-react';

interface UserManagementViewProps {
  currentUser: User;
}

const DEPARTMENTS = [
  'Executive', 'Engineering', 'Design', 'Product', 'Operations', 
  'Marketing', 'Sales', 'HR', 'Finance', 'External', 'Other'
];

const DESIGNATIONS = [
  'Super Administrator', 'Managing Director', 'Administrator', 
  'Chief Executive Officer', 'Chief Technology Officer', 'Chief Operating Officer',
  'Product Manager', 'Project Manager', 'Senior Designer', 'UI/UX Designer',
  'Senior Developer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Software Intern', 'Executive Officer', 'Client', 'Other'
];

const LEVELS = [
  { level: 1, name: 'Super Admin', desc: 'Full system access — all ventures, all data, all settings' },
  { level: 2, name: 'Managing Director', desc: 'Strategic oversight across all ventures' },
  { level: 3, name: 'Admin', desc: 'Administrative access to assigned venture' },
  { level: 4, name: 'CXO', desc: 'C-level executive with cross-departmental visibility' },
  { level: 5, name: 'Manager', desc: 'Team management and reporting access' },
  { level: 6, name: 'Executive Staff', desc: 'Senior staff with expanded task access' },
  { level: 7, name: 'Staff', desc: 'Standard employee access' },
  { level: 8, name: 'Intern', desc: 'Limited access for internship period' },
  { level: 9, name: 'Client', desc: 'External client portal access' }
];

export default function UserManagementView({ currentUser }: UserManagementViewProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [ventureFilter, setVentureFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  // Edit Panel State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'access' | 'activity'>('profile');
  
  const [editForm, setEditForm] = useState({
    access_level: 0,
    venture_id: 0,
    is_active: 1,
    full_name: '',
    department: '',
    designation: '',
    personal_email: '',
    phone: '',
    emergency_contact: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openUserPanel = async (user: any) => {
    setEditingUser(user);
    setActiveTab('profile');
    setEditForm({
      access_level: user.access_level,
      venture_id: user.venture_id || 0,
      is_active: user.is_active,
      full_name: user.full_name,
      department: user.department || '',
      designation: user.designation || '',
      personal_email: user.personal_email || '',
      phone: user.phone || '',
      emergency_contact: user.emergency_contact || ''
    });

    try {
      setLoadingActivity(true);
      const res = await getUserDetails(user.id);
      if (res.success) {
        setUserActivity(res.data.activity || []);
      }
    } catch (err) {
      toast.error('Could not load user activity');
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      const res = await updateUser(editingUser.id, editForm);
      if (res.success) {
        toast.success('User updated successfully');
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error(res.message || 'Failed to update user');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: any) => {
    if (currentUser.accessLevel > 2 && user.access_level <= currentUser.accessLevel) {
      toast.error('You do not have permission to delete this user.');
      return;
    }
    
    if (confirm(`Are you sure you want to remove ${user.full_name}? This action cannot be undone.`)) {
      try {
        const res = await deleteUser(user.id);
        if (res.success) {
          toast.success('User deleted');
          fetchUsers();
          if (editingUser?.id === user.id) setEditingUser(null);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error deleting user');
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase()) ||
                          u.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchesVenture = ventureFilter === 'all' || u.venture_name?.toLowerCase().includes(ventureFilter.toLowerCase());
    const matchesLevel = levelFilter === 'all' || u.access_level.toString() === levelFilter;
    
    return matchesSearch && matchesVenture && matchesLevel;
  });

  const getVentureColor = (ventureName: string) => {
    if (!ventureName) return '#8b5cf6';
    const v = VENTURES.find(v => ventureName.toLowerCase().includes(v.slug));
    return v ? v.color : '#8b5cf6';
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '', email: '', password: 'InternalXUser123!', 
    access_level: 7, venture_id: 0, department: '', designation: ''
  });

  const handleAddUser = async () => {
    try {
      setSaving(true);
      const res = await createUser(addForm);
      if (res.success) {
        toast.success('User created successfully');
        setShowAddModal(false);
        setAddForm({ full_name: '', email: '', password: 'InternalXUser123!', access_level: 7, venture_id: 0, department: '', designation: '' });
        fetchUsers();
      } else {
        toast.error(res.message || 'Failed to create user');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-10 relative">
      {/* Header & Filters */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 rounded-2xl flex flex-col gap-5 shadow-sm">
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Team Members</h2>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
              Manage access levels, departments, and roles.
            </p>
          </div>
          <button
            className="px-5 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-colors shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} strokeWidth={2.5} /> Add Member
          </button>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search size={16} className="absolute left-3.5 top-3 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search by name, email, or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Filter size={14} className="absolute left-3 top-3.5 text-[var(--color-text-muted)]" />
              <select
                value={ventureFilter}
                onChange={(e) => setVentureFilter(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl appearance-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] cursor-pointer outline-none focus:border-[var(--color-purple-glow)] transition-colors"
              >
                <option value="all">All Ventures</option>
                {VENTURES.map(v => (
                  <option key={v.slug} value={v.slug}>{v.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            </div>

            <div className="relative flex-1 md:flex-none">
              <Shield size={14} className="absolute left-3 top-3.5 text-[var(--color-text-muted)]" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl appearance-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] cursor-pointer outline-none focus:border-[var(--color-purple-glow)] transition-colors"
              >
                <option value="all">All Levels</option>
                {[1,2,3,4,5,6,7,8,9].map(l => (
                  <option key={l} value={l.toString()}>Level {l}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
            <p className="text-[var(--color-text-muted)] text-sm font-medium">Loading members...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <UserCircle2 size={48} className="text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <h3 className="text-base text-[var(--color-text-primary)] font-semibold mb-1">No members found</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)]">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th className="p-4 px-6 text-xs font-semibold text-[var(--color-text-secondary)] tracking-wider">MEMBER</th>
                  <th className="p-4 px-6 text-xs font-semibold text-[var(--color-text-secondary)] tracking-wider">ROLE & DEPT</th>
                  <th className="p-4 px-6 text-xs font-semibold text-[var(--color-text-secondary)] tracking-wider">ACCESS</th>
                  <th className="p-4 px-6 text-xs font-semibold text-[var(--color-text-secondary)] tracking-wider text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const vColor = getVentureColor(user.venture_name);
                  
                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => openUserPanel(user)}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer group"
                    >
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border"
                            style={{ background: `${vColor}15`, color: vColor, borderColor: `${vColor}30` }}
                          >
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                              {user.full_name}
                              {!user.is_active && <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded border border-rose-500/20 font-bold uppercase tracking-wider">Inactive</span>}
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1">
                              <Mail size={12} /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <div className="text-[13px] text-[var(--color-text-primary)] font-medium flex items-center gap-1.5">
                          <Briefcase size={14} className="text-[var(--color-text-muted)]" /> {user.designation || 'No Role'}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-1.5 flex items-center gap-1.5">
                          <Building2 size={14} /> {user.department || 'No Dept'}
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span 
                            className="text-[11px] px-2.5 py-1 rounded-full font-bold border"
                            style={{ background: `${vColor}10`, color: vColor, borderColor: `${vColor}30` }}
                          >
                            L{user.access_level} • {user.level_name}
                          </span>
                          {user.venture_name && (
                            <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                              {user.venture_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openUserPanel(user); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] border border-transparent hover:border-[var(--color-border)] transition-all"
                            title="View / Edit"
                          >
                            <Edit2 size={14} />
                          </button>
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

      {/* Side Panel for User Details */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end">
          <div 
            className="w-full max-w-[600px] h-full bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.2)]"
            style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Panel Header */}
            <div className="p-8 pb-6 border-b border-[var(--color-border)] relative bg-[var(--color-bg-secondary)]">
              <button 
                onClick={() => setEditingUser(null)}
                className="absolute right-6 top-6 w-8 h-8 rounded-full bg-[var(--color-bg-card)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-5">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl border"
                  style={{ background: `${getVentureColor(editingUser.venture_name)}15`, color: getVentureColor(editingUser.venture_name), borderColor: `${getVentureColor(editingUser.venture_name)}30` }}
                >
                  {editingUser.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">{editingUser.full_name}</h3>
                  <div className="text-[13px] text-[var(--color-text-secondary)] mt-1 flex items-center gap-2">
                    <span className="font-bold" style={{ color: getVentureColor(editingUser.venture_name) }}>{editingUser.employee_id}</span>
                    • {editingUser.designation || 'No Designation'} 
                    • {editingUser.department || 'No Dept'}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 mt-8 -mb-[25px]">
                {[
                  { id: 'profile', label: 'Profile & Contact', icon: <UserCircle2 size={16} /> },
                  { id: 'access', label: 'Access & Roles', icon: <Shield size={16} /> },
                  { id: 'activity', label: 'Activity Log', icon: <Activity size={16} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-3 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 ${
                      activeTab === tab.id 
                        ? 'border-[var(--color-purple-glow)] text-[var(--color-text-primary)]' 
                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-[var(--color-bg-primary)]">
              
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" value={editForm.full_name}
                        onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Status</label>
                      <select 
                        value={editForm.is_active}
                        onChange={e => setEditForm({...editForm, is_active: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors appearance-none"
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Inactive (Suspended)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border)]">Contact Information</h4>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"><Mail size={12}/> Company Email</label>
                        <input 
                          type="text" value={editingUser.email} disabled
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-muted)] cursor-not-allowed opacity-70"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"><Mail size={12}/> Personal Email</label>
                        <input 
                          type="email" value={editForm.personal_email} placeholder="Enter personal email"
                          onChange={e => setEditForm({...editForm, personal_email: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"><Phone size={12}/> Phone Number</label>
                        <input 
                          type="text" value={editForm.phone} placeholder="+1 234 567 8900"
                          onChange={e => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider"><AlertCircle size={12}/> Emergency Contact</label>
                        <input 
                          type="text" value={editForm.emergency_contact} placeholder="Name & Number"
                          onChange={e => setEditForm({...editForm, emergency_contact: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border)]">Organization</h4>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="relative">
                        <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Department</label>
                        <select 
                          value={editForm.department}
                          onChange={e => setEditForm({...editForm, department: e.target.value})}
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors appearance-none"
                        >
                          <option value="">Select Department</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-9 text-[var(--color-text-muted)] pointer-events-none" />
                      </div>
                      <div className="relative">
                        <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Designation</label>
                        <select 
                          value={editForm.designation}
                          onChange={e => setEditForm({...editForm, designation: e.target.value})}
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors appearance-none"
                        >
                          <option value="">Select Designation</option>
                          {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-9 text-[var(--color-text-muted)] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACCESS TAB */}
              {activeTab === 'access' && (
                <div className="flex flex-col gap-8">
                  <div className="p-5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 flex items-start gap-4">
                    <Shield size={24} className="text-cyan-500 shrink-0" />
                    <div>
                      <h5 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-1">Access Management</h5>
                      <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                        Changes to Access Level or Venture Assignment take effect immediately and will dictate what data this user can view across the InternalX platform.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">Venture Assignment</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        onClick={() => setEditForm({...editForm, venture_id: 0})}
                        className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${editForm.venture_id === 0 ? 'border-[var(--color-purple-glow)] bg-[var(--color-purple-glow)]/10' : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-muted)]'}`}
                      >
                        <div className="text-[14px] font-bold text-[var(--color-text-primary)]">All Ventures (Global)</div>
                        <div className="text-[12px] text-[var(--color-text-muted)] mt-1">Access to all portfolio companies.</div>
                      </div>
                      
                      {/* Note: Keeping the select dropdown as primary input since dynamic IDs require reliable mapping */}
                    </div>
                    <div className="relative mt-4">
                      <select 
                        value={editForm.venture_id}
                        onChange={e => setEditForm({...editForm, venture_id: parseInt(e.target.value)})}
                        className="w-full pl-4 pr-10 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors appearance-none"
                      >
                        <option value={0}>Global Access (All Ventures)</option>
                        {VENTURES.map((v, i) => <option key={v.slug} value={i + 1}>{v.name}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">Access Level (L1 - L9)</label>
                    <div className="flex flex-col gap-2">
                      {LEVELS.map(level => (
                        <div 
                          key={level.level}
                          onClick={() => setEditForm({...editForm, access_level: level.level})}
                          className={`p-3 px-4 rounded-xl cursor-pointer flex items-center gap-4 border-2 transition-all ${
                            editForm.access_level === level.level 
                              ? 'border-cyan-500 bg-cyan-500/10' 
                              : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-muted)]'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[14px] text-[var(--color-text-primary)] shrink-0 shadow-sm">
                            L{level.level}
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-[var(--color-text-primary)]">{level.name}</div>
                            <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{level.desc}</div>
                          </div>
                          {editForm.access_level === level.level && <Check size={20} className="text-cyan-500 ml-auto shrink-0" strokeWidth={3} />}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === 'activity' && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-2 uppercase tracking-wider">Recent Task Activity</h4>
                  {loadingActivity ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-purple-glow)] mb-3" />
                      <p className="text-[13px] text-[var(--color-text-muted)] font-medium">Loading activity log...</p>
                    </div>
                  ) : userActivity.length === 0 ? (
                    <div className="p-10 text-center bg-[var(--color-bg-secondary)] rounded-2xl border border-dashed border-[var(--color-border)]">
                      <Activity size={32} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-50" />
                      <p className="text-[13px] text-[var(--color-text-secondary)] font-medium">No recent activity found for this user.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {userActivity.map(act => (
                        <div key={act.id} className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-text-muted)] transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">{act.title}</div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                              act.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                              act.status === 'in-progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                              'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
                            }`}>
                              {act.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)] font-medium mt-3">
                            <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(act.updated_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><AlertCircle size={14} /> Priority: <span className="uppercase">{act.priority}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Panel Footer */}
            <div className="p-6 border-t border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
              {currentUser.accessLevel <= 2 && currentUser.id !== editingUser.id ? (
                 <button 
                  onClick={() => handleDelete(editingUser)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-[13px] transition-colors"
                >
                  <Trash2 size={16} /> Delete User
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold text-[13px] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />} 
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Onboard New Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Full Name</label>
                <input type="text" value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] outline-none focus:border-[var(--color-purple-glow)]" placeholder="E.g. John Doe" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Company Email</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] outline-none focus:border-[var(--color-purple-glow)]" placeholder="name@dropwing.com" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Temporary Password</label>
                <input type="text" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] outline-none focus:border-[var(--color-purple-glow)]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Access Level</label>
                  <select value={addForm.access_level} onChange={e => setAddForm({...addForm, access_level: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] outline-none">
                    {LEVELS.map(l => <option key={l.level} value={l.level}>L{l.level} - {l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Venture</label>
                  <select value={addForm.venture_id} onChange={e => setAddForm({...addForm, venture_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] outline-none">
                    <option value={0}>Global Access</option>
                    {VENTURES.map((v, i) => <option key={v.slug} value={i + 1}>{v.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Department</label>
                  <select value={addForm.department} onChange={e => setAddForm({...addForm, department: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] outline-none">
                    <option value="">Select Dept</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">Designation</label>
                  <select value={addForm.designation} onChange={e => setAddForm({...addForm, designation: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] outline-none">
                    <option value="">Select Role</option>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-5 py-2 rounded-xl border border-[var(--color-border)] text-[13px] font-bold hover:bg-[var(--color-bg-card)] transition-colors">Cancel</button>
              <button onClick={handleAddUser} disabled={saving || !addForm.full_name || !addForm.email} className="px-6 py-2 rounded-xl bg-[var(--color-purple-glow)] text-white text-[13px] font-bold hover:bg-[#7c3aed] transition-colors disabled:opacity-50">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
