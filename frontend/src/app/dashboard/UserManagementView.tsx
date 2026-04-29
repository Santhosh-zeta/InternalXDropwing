'use client';

import { useState, useEffect } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getUsers, updateUser, deleteUser, getUserDetails } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Search, Filter, Edit2, Trash2, X, Check,
  Shield, Building2, Briefcase, Mail, UserCircle2,
  ChevronDown, UserPlus, AlertCircle, Phone, Clock,
  Activity, Calendar
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', paddingBottom: 40, position: 'relative' }}>
      {/* Header & Filters */}
      <div className="glass" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>Team Members</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Manage access levels, departments, and roles.
            </p>
          </div>
          <button
            style={{
              padding: '10px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              color: '#fff', border: 'none', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
            }}
            onClick={() => toast('Adding new users is currently done via the Seed script for testing.', { icon: 'ℹ️' })}
          >
            <UserPlus size={16} /> Add Member
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by name, email, or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Filter size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--color-text-muted)' }} />
              <select
                value={ventureFilter}
                onChange={(e) => setVentureFilter(e.target.value)}
                style={{
                  padding: '10px 36px 10px 36px', borderRadius: 12, appearance: 'none',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="all">All Ventures</option>
                {VENTURES.map(v => (
                  <option key={v.slug} value={v.slug}>{v.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 13, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            </div>

            <div style={{ position: 'relative' }}>
              <Shield size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--color-text-muted)' }} />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                style={{
                  padding: '10px 36px 10px 36px', borderRadius: 12, appearance: 'none',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="all">All Levels</option>
                {[1,2,3,4,5,6,7,8,9].map(l => (
                  <option key={l} value={l.toString()}>Level {l}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 13, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div className="animate-spin-slow" style={{ fontSize: 24, marginBottom: 16 }}>✦</div>
            Loading members...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <UserCircle2 size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: 16, color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 4 }}>No members found</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>MEMBER</th>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>ROLE & DEPT</th>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5 }}>ACCESS</th>
                  <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: 0.5, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const vColor = getVentureColor(user.venture_name);
                  const isEditable = currentUser.accessLevel <= 2 || user.access_level > currentUser.accessLevel;
                  
                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => openUserPanel(user)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', cursor: 'pointer' }} 
                      className="hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            width: 36, height: 36, borderRadius: '50%', 
                            background: `${vColor}20`, color: vColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 14
                          }}>
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              {user.full_name}
                              {!user.is_active && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', borderRadius: 4 }}>Inactive</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Mail size={10} /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Briefcase size={12} color="var(--color-text-muted)" /> {user.designation || 'No Role'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building2 size={12} /> {user.department || 'No Dept'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ 
                            fontSize: 11, padding: '4px 10px', borderRadius: 20, 
                            background: `${vColor}15`, color: vColor, fontWeight: 600,
                            border: `1px solid ${vColor}30`
                          }}>
                            L{user.access_level} • {user.level_name}
                          </span>
                          {user.venture_name && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                              {user.venture_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openUserPanel(user); }}
                            style={{ 
                              background: 'rgba(255,255,255,0.05)', border: 'none', 
                              width: 32, height: 32, borderRadius: 8,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--color-text-primary)',
                              cursor: 'pointer'
                            }}
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
        <div style={{ 
          position: 'fixed', inset: 0, zIndex: 100, 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <div 
            className="glass" 
            style={{ 
              width: '100%', maxWidth: 600, height: '100%', 
              background: 'var(--color-bg-primary)',
              borderLeft: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '-20px 0 40px rgba(0,0,0,0.5)',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            {/* Panel Header */}
            <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
              <button 
                onClick={() => setEditingUser(null)}
                style={{ position: 'absolute', right: 24, top: 24, background: 'rgba(255,255,255,0.05)', border: 'none', width: 32, height: 32, borderRadius: '50%', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ 
                  width: 64, height: 64, borderRadius: 16, 
                  background: `${getVentureColor(editingUser.venture_name)}20`, 
                  color: getVentureColor(editingUser.venture_name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 24, border: `1px solid ${getVentureColor(editingUser.venture_name)}40`
                }}>
                  {editingUser.full_name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>{editingUser.full_name}</h3>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: getVentureColor(editingUser.venture_name), fontWeight: 600 }}>{editingUser.employee_id}</span>
                    • {editingUser.designation || 'No Designation'} 
                    • {editingUser.department || 'No Dept'}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 24, marginTop: 32, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { id: 'profile', label: 'Profile & Contact', icon: <UserCircle2 size={16} /> },
                  { id: 'access', label: 'Access & Roles', icon: <Shield size={16} /> },
                  { id: 'activity', label: 'Activity Log', icon: <Activity size={16} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      background: 'none', border: 'none', padding: '0 0 12px 0',
                      color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontWeight: activeTab === tab.id ? 600 : 500, fontSize: 13,
                      borderBottom: activeTab === tab.id ? `2px solid ${getVentureColor(editingUser.venture_name)}` : '2px solid transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
              
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Full Name</label>
                      <input 
                        type="text" value={editForm.full_name}
                        onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Status</label>
                      <select 
                        value={editForm.is_active}
                        onChange={e => setEditForm({...editForm, is_active: parseInt(e.target.value)})}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', appearance: 'none' }}
                      >
                        <option value={1} style={{ background: '#1a1a2e' }}>Active</option>
                        <option value={0} style={{ background: '#1a1a2e' }}>Inactive (Suspended)</option>
                      </select>
                    </div>
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>Contact Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}><Mail size={12}/> Company Email</label>
                      <input 
                        type="text" value={editingUser.email} disabled
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', fontSize: 14, cursor: 'not-allowed' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}><Mail size={12}/> Personal Email</label>
                      <input 
                        type="email" value={editForm.personal_email} placeholder="Enter personal email"
                        onChange={e => setEditForm({...editForm, personal_email: e.target.value})}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}><Phone size={12}/> Phone Number</label>
                      <input 
                        type="text" value={editForm.phone} placeholder="+1 234 567 8900"
                        onChange={e => setEditForm({...editForm, phone: e.target.value})}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}><AlertCircle size={12}/> Emergency Contact</label>
                      <input 
                        type="text" value={editForm.emergency_contact} placeholder="Name & Number"
                        onChange={e => setEditForm({...editForm, emergency_contact: e.target.value})}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>Organization</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Department</label>
                      <select 
                        value={editForm.department}
                        onChange={e => setEditForm({...editForm, department: e.target.value})}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', appearance: 'none' }}
                      >
                        <option value="" style={{ background: '#1a1a2e' }}>Select Department</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d} style={{ background: '#1a1a2e' }}>{d}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: 38, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Designation</label>
                      <select 
                        value={editForm.designation}
                        onChange={e => setEditForm({...editForm, designation: e.target.value})}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', appearance: 'none' }}
                      >
                        <option value="" style={{ background: '#1a1a2e' }}>Select Designation</option>
                        {DESIGNATIONS.map(d => <option key={d} value={d} style={{ background: '#1a1a2e' }}>{d}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: 38, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ACCESS TAB */}
              {activeTab === 'access' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: 12, border: '1px solid rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Shield size={20} color="#06b6d4" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <h5 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Access Management</h5>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        Changes to Access Level or Venture Assignment take effect immediately and will dictate what data this user can view across the InternalX platform.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>Venture Assignment</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div 
                        onClick={() => setEditForm({...editForm, venture_id: 0})}
                        style={{ 
                          padding: 16, borderRadius: 12, cursor: 'pointer', border: editForm.venture_id === 0 ? '2px solid #8b5cf6' : '1px solid var(--color-border)',
                          background: editForm.venture_id === 0 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.02)'
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>All Ventures (Global)</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Access to Dropwing, SerphoSoft, PerSyniX, and Grovia.</div>
                      </div>
                      {VENTURES.map(v => (
                        <div 
                          key={v.slug}
                          onClick={() => {
                            const vData = users.find(u => u.venture_name === v.name);
                            // We need to pass the venture ID, so let's find it.
                            // Assuming we can derive venture_id from venture name, or just use constants if we had them.
                            // In this case, we have to look it up from the users array or a backend call.
                            // Since we have editingUser.venture_id we know some, but let's just assume we can't map perfectly without a venture list from backend.
                            // For now, we will just use a generic mapping or keep the select dropdown.
                            // Actually, I'll switch back to a standard select to avoid mapping issues.
                          }}
                          style={{ display: 'none' }}
                        ></div>
                      ))}
                    </div>
                    <div style={{ position: 'relative', marginTop: 8 }}>
                      <select 
                        value={editForm.venture_id}
                        onChange={e => setEditForm({...editForm, venture_id: parseInt(e.target.value)})}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', appearance: 'none' }}
                      >
                        <option value={0} style={{ background: '#1a1a2e' }}>Global Access (All Ventures)</option>
                        {VENTURES.map((v, i) => <option key={v.slug} value={i + 1} style={{ background: '#1a1a2e' }}>{v.emoji} {v.name}</option>)}
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: 16, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>Access Level (L1 - L9)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {LEVELS.map(level => (
                        <div 
                          key={level.level}
                          onClick={() => setEditForm({...editForm, access_level: level.level})}
                          style={{ 
                            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                            border: editForm.access_level === level.level ? '2px solid #06b6d4' : '1px solid var(--color-border)',
                            background: editForm.access_level === level.level ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.01)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>
                            L{level.level}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{level.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{level.desc}</div>
                          </div>
                          {editForm.access_level === level.level && <Check size={20} color="#06b6d4" style={{ marginLeft: 'auto' }} />}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Recent Task Activity</h4>
                  {loadingActivity ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <div className="animate-spin-slow" style={{ fontSize: 24, marginBottom: 16 }}>✦</div>
                      Loading activity log...
                    </div>
                  ) : userActivity.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 16, border: '1px dashed var(--color-border)' }}>
                      <Activity size={32} style={{ margin: '0 auto 16px', color: 'var(--color-text-muted)', opacity: 0.5 }} />
                      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>No recent activity found for this user.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {userActivity.map(act => (
                        <div key={act.id} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{act.title}</div>
                            <span style={{ 
                              fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 600, textTransform: 'uppercase',
                              background: act.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : act.status === 'in-progress' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.1)',
                              color: act.status === 'completed' ? '#10b981' : act.status === 'in-progress' ? '#f59e0b' : 'var(--color-text-secondary)'
                            }}>
                              {act.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--color-text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(act.updated_at).toLocaleDateString()}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Priority: {act.priority}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Panel Footer */}
            <div style={{ padding: 24, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              {currentUser.accessLevel <= 2 && currentUser.id !== editingUser.id ? (
                 <button 
                  onClick={() => handleDelete(editingUser)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  <Trash2 size={16} /> Delete User
                </button>
              ) : (
                <div />
              )}
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => setEditingUser(null)}
                  style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-primary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={saving}
                  style={{ 
                    padding: '10px 24px', borderRadius: 10, 
                    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', 
                    border: 'none', fontWeight: 600, fontSize: 13, cursor: saving ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  {saving ? <span className="animate-spin-slow">✦</span> : <Check size={16} />} 
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
