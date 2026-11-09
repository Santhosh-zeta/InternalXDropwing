'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getUsers, createUser, updateUser, deleteUser, getUserDetails } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Search, Filter, Edit2, Trash2, Check,
  Shield, Building2, Briefcase, Mail, UserCircle2,
  ChevronDown, UserPlus, AlertCircle, Phone,
  Activity, Calendar, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Badge, Button, EmptyState, Field, Modal, Select, SkeletonTable, SkeletonText,
  TextField, useConfirm,
} from '@/components/ui';

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

// Initial passwords are random per user and shown once to the admin; there is
// deliberately no shared default password.
const generateTempPassword = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('') + 'a1!';
};

const SECTION_LABEL_CLASS =
  'block text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';

const TH_CLASS = 'p-4 px-6 text-xs font-semibold text-[var(--color-text-secondary)] tracking-wider';

type TabId = 'profile' | 'access' | 'activity';

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'profile', label: 'Profile & Contact', icon: <UserCircle2 size={16} aria-hidden="true" /> },
  { id: 'access', label: 'Access & Roles', icon: <Shield size={16} aria-hidden="true" /> },
  { id: 'activity', label: 'Activity Log', icon: <Activity size={16} aria-hidden="true" /> },
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
  const [activeTab, setActiveTab] = useState<TabId>('profile');

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

  const confirm = useConfirm();

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
      // Only send the privileged fields that actually changed, so a profile edit
      // is never mistaken for a level/venture change by the server.
      const { access_level, venture_id, is_active, ...profile } = editForm;
      const payload: Record<string, unknown> = { ...profile };
      if (access_level !== editingUser.access_level) payload.access_level = access_level;
      if (venture_id !== (editingUser.venture_id || 0)) payload.venture_id = venture_id;
      if (is_active !== editingUser.is_active) payload.is_active = is_active;
      const res = await updateUser(editingUser.id, payload);
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

  // Mirrors canManageUser(): L1-L3 only, strictly below own level (L1 exempt), L3 inside own venture.
  const canEditUser = (user: any) =>
    currentUser.accessLevel <= 3 &&
    (currentUser.accessLevel === 1 ||
      (user.access_level > currentUser.accessLevel &&
        (currentUser.accessLevel === 2 || (user.venture_id ?? 0) === (currentUser.venture?.id ?? -1))));

  // backend/src/routes/user.routes.js DELETE /:id: requireLevel(3), and for
  // anyone below L2 the target must be strictly below the caller's own level.
  const canDeleteUser = (user: any) =>
    currentUser.accessLevel <= 3 &&
    user.id !== currentUser.id &&
    !(currentUser.accessLevel > 1 && user.access_level <= currentUser.accessLevel);

  const handleDelete = async (user: any) => {
    if (!canDeleteUser(user)) {
      toast.error('You do not have permission to delete this user.');
      return;
    }

    const confirmed = await confirm({
      title: `Remove ${user.full_name}?`,
      description: 'Their account and access to every venture will be revoked. This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });

    if (confirmed) {
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
    full_name: '', email: '', password: '',
    access_level: 7, venture_id: 0, department: '', designation: ''
  });

  // Mirrors backend/src/utils/canManageUser.js: L1 may grant anything, everyone
  // else only levels strictly below their own. Only L1/L2 choose ventures; an
  // L3 admin always works inside their own venture.
  const assignableLevels = LEVELS.filter(l => currentUser.accessLevel === 1 || l.level > currentUser.accessLevel);
  const canPickVenture = currentUser.accessLevel <= 2;
  const ownVentureId = currentUser.venture?.id ?? 0;

  const openAddModal = () => {
    setAddForm({
      full_name: '', email: '', password: generateTempPassword(),
      access_level: assignableLevels.find(l => l.level === 7)?.level ?? assignableLevels[0]?.level ?? 9,
      venture_id: canPickVenture ? 0 : ownVentureId,
      department: '', designation: '',
    });
    setShowAddModal(true);
  };

  const handleAddUser = async () => {
    try {
      setSaving(true);
      const res = await createUser(addForm);
      if (res.success) {
        toast.success(`User created. Temporary password (shown once): ${addForm.password}`, { duration: 30000 });
        setShowAddModal(false);
        setAddForm({ full_name: '', email: '', password: '', access_level: 7, venture_id: 0, department: '', designation: '' });
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

  const exportPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('InternalX - Team Members', 14, 22);

    // Create table
    const tableColumn = ["Name", "Email", "Role", "Department", "Level"];
    const tableRows = filteredUsers.map(u => [
      u.full_name,
      u.email,
      u.designation || 'No Role',
      u.department || 'No Dept',
      `L${u.access_level} - ${u.level_name}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [139, 92, 246] }
    });

    doc.save('InternalX_Team_Members.pdf');
  };

  const hasFilters = search !== '' || ventureFilter !== 'all' || levelFilter !== 'all';

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
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              leadingIcon={<Download size={16} strokeWidth={2.5} aria-hidden="true" />}
              onClick={exportPDF}
            >
              Export PDF
            </Button>
            {currentUser.accessLevel <= 3 && (
              <Button
                variant="primary"
                leadingIcon={<UserPlus size={16} strokeWidth={2.5} aria-hidden="true" />}
                onClick={openAddModal}
              >
                Add Member
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              aria-label="Search members by name, email, or ID"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Filter size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <select
                aria-label="Filter members by venture"
                value={ventureFilter}
                onChange={(e) => setVentureFilter(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl appearance-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] cursor-pointer outline-none focus:border-[var(--color-purple-glow)] transition-colors"
              >
                <option value="all">All Ventures</option>
                {VENTURES.map(v => (
                  <option key={v.slug} value={v.slug}>{v.name}</option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            </div>

            <div className="relative flex-1 md:flex-none">
              <Shield size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <select
                aria-label="Filter members by access level"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl appearance-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] cursor-pointer outline-none focus:border-[var(--color-purple-glow)] transition-colors"
              >
                <option value="all">All Levels</option>
                {[1,2,3,4,5,6,7,8,9].map(l => (
                  <option key={l} value={l.toString()}>Level {l}</option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <SkeletonTable rows={6} columns={4} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={22} aria-hidden="true" />}
          title="No team members yet"
          description="Onboard your first member to give them access to tasks, projects and the venture data they need."
          action={currentUser.accessLevel <= 3 ? (
            <Button
              variant="primary"
              leadingIcon={<UserPlus size={16} strokeWidth={2.5} aria-hidden="true" />}
              onClick={openAddModal}
            >
              Add your first member
            </Button>
          ) : undefined}
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Search size={22} aria-hidden="true" />}
          title="No members found"
          description="No one matches the current search, venture or access-level filter."
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => { setSearch(''); setVentureFilter('all'); setLevelFilter('all'); }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Team members, their roles and access levels</caption>
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th scope="col" className={TH_CLASS}>MEMBER</th>
                  <th scope="col" className={TH_CLASS}>ROLE &amp; DEPT</th>
                  <th scope="col" className={TH_CLASS}>ACCESS</th>
                  <th scope="col" className={`${TH_CLASS} text-right`}>ACTIONS</th>
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
                            aria-hidden="true"
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0"
                            style={{ background: `${vColor}15`, color: vColor, borderColor: `${vColor}30` }}
                          >
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                              {/* The real keyboard-reachable control for the row. */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openUserPanel(user); }}
                                className="text-left hover:text-[var(--color-purple-glow)] transition-colors"
                              >
                                {user.full_name}
                              </button>
                              {!user.is_active && <Badge tone="danger">Inactive</Badge>}
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1">
                              <Mail size={12} aria-hidden="true" /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <div className="text-[13px] text-[var(--color-text-primary)] font-medium flex items-center gap-1.5">
                          <Briefcase size={14} aria-hidden="true" className="text-[var(--color-text-muted)]" /> {user.designation || 'No Role'}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-1.5 flex items-center gap-1.5">
                          <Building2 size={14} aria-hidden="true" /> {user.department || 'No Dept'}
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex flex-col gap-1.5 items-start">
                          <Badge color={vColor}>L{user.access_level} • {user.level_name}</Badge>
                          {user.venture_name && (
                            <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                              {user.venture_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            iconOnly
                            aria-label={`View or edit ${user.full_name}`}
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openUserPanel(user); }}
                          >
                            <Edit2 size={14} aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side Panel for User Details */}
      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        variant="drawer"
        title={editingUser?.full_name ?? ''}
        description={
          editingUser
            ? `${editingUser.employee_id} • ${editingUser.designation || 'No Designation'} • ${editingUser.department || 'No Dept'}`
            : undefined
        }
        footer={
          editingUser ? (
            <>
              {canDeleteUser(editingUser) && (
                <Button
                  variant="danger"
                  leadingIcon={<Trash2 size={16} aria-hidden="true" />}
                  onClick={() => handleDelete(editingUser)}
                  className="mr-auto"
                >
                  Delete User
                </Button>
              )}
              <Button variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button
                variant="primary"
                loading={saving}
                disabled={!canEditUser(editingUser)}
                leadingIcon={<Check size={16} strokeWidth={2.5} aria-hidden="true" />}
                onClick={handleSaveEdit}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </>
          ) : undefined
        }
      >
        {editingUser && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-5">
              <div
                aria-hidden="true"
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl border shrink-0"
                style={{ background: `${getVentureColor(editingUser.venture_name)}15`, color: getVentureColor(editingUser.venture_name), borderColor: `${getVentureColor(editingUser.venture_name)}30` }}
              >
                {editingUser.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold" style={{ color: getVentureColor(editingUser.venture_name) }}>
                  {editingUser.employee_id}
                </p>
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
                  {editingUser.designation || 'No Designation'} • {editingUser.department || 'No Dept'}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="User details sections" className="flex gap-6 border-b border-[var(--color-border)]">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`user-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`user-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 -mb-px flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[var(--color-purple-glow)] text-[var(--color-text-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div
                role="tabpanel"
                id="user-panel-profile"
                aria-labelledby="user-tab-profile"
                className="flex flex-col gap-8"
              >
                <div className="grid grid-cols-2 gap-5">
                  <TextField
                    label="Full Name"
                    value={editForm.full_name}
                    onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                  />
                  <Field label="Status">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={editForm.is_active}
                        onChange={e => setEditForm({...editForm, is_active: parseInt(e.target.value)})}
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Inactive (Suspended)</option>
                      </Select>
                    )}
                  </Field>
                </div>

                <div>
                  <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border)]">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-5">
                    <TextField
                      label="Company Email"
                      hint="Managed by IT — cannot be edited here."
                      value={editingUser.email}
                      readOnly
                      disabled
                    />
                    <TextField
                      label="Personal Email"
                      type="email"
                      value={editForm.personal_email}
                      placeholder="Enter personal email"
                      onChange={e => setEditForm({...editForm, personal_email: e.target.value})}
                    />
                    <TextField
                      label="Phone Number"
                      value={editForm.phone}
                      placeholder="+1 234 567 8900"
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    />
                    <TextField
                      label="Emergency Contact"
                      value={editForm.emergency_contact}
                      placeholder="Name & Number"
                      onChange={e => setEditForm({...editForm, emergency_contact: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border)]">Organization</h4>
                  <div className="grid grid-cols-2 gap-5">
                    <Field label="Department">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={editForm.department}
                          onChange={e => setEditForm({...editForm, department: e.target.value})}
                        >
                          <option value="">Select Department</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </Select>
                      )}
                    </Field>
                    <Field label="Designation">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={editForm.designation}
                          onChange={e => setEditForm({...editForm, designation: e.target.value})}
                        >
                          <option value="">Select Designation</option>
                          {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </Select>
                      )}
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* ACCESS TAB */}
            {activeTab === 'access' && (
              <div
                role="tabpanel"
                id="user-panel-access"
                aria-labelledby="user-tab-access"
                className="flex flex-col gap-8"
              >
                <div className="p-5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 flex items-start gap-4">
                  <Shield size={24} aria-hidden="true" className="text-cyan-500 shrink-0" />
                  <div>
                    <h5 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-1">Access Management</h5>
                    <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                      Changes to Access Level or Venture Assignment take effect immediately and will dictate what data this user can view across the InternalX platform.
                    </p>
                  </div>
                </div>

                <div>
                  <p className={`${SECTION_LABEL_CLASS} mb-3`}>Venture Assignment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={editForm.venture_id === 0}
                      disabled={!canPickVenture}
                      onClick={() => setEditForm({...editForm, venture_id: 0})}
                      className={`p-4 rounded-xl text-left border-2 transition-all ${editForm.venture_id === 0 ? 'border-[var(--color-purple-glow)] bg-[var(--color-purple-glow)]/10' : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-muted)]'}`}
                    >
                      <span className="block text-[14px] font-bold text-[var(--color-text-primary)]">All Ventures (Global)</span>
                      <span className="block text-[12px] text-[var(--color-text-muted)] mt-1">Access to all portfolio companies.</span>
                    </button>

                    {/* Note: Keeping the select dropdown as primary input since dynamic IDs require reliable mapping */}
                  </div>
                  <Field label="Assigned Venture" className="mt-4">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={editForm.venture_id}
                        disabled={!canPickVenture}
                        onChange={e => setEditForm({...editForm, venture_id: parseInt(e.target.value)})}
                      >
                        <option value={0}>Global Access (All Ventures)</option>
                        {VENTURES.map((v, i) => <option key={v.slug} value={i + 1}>{v.name}</option>)}
                      </Select>
                    )}
                  </Field>
                </div>

                <div>
                  <p id="access-level-label" className={`${SECTION_LABEL_CLASS} mb-3`}>Access Level (L1 - L9)</p>
                  <div role="group" aria-labelledby="access-level-label" className="flex flex-col gap-2">
                    {assignableLevels.map(level => (
                      <button
                        key={level.level}
                        type="button"
                        aria-pressed={editForm.access_level === level.level}
                        onClick={() => setEditForm({
                          ...editForm,
                          access_level: level.level,
                          // Levels 1-2 are global; 3-9 must belong to a venture.
                          venture_id: level.level <= 2 ? 0 : editForm.venture_id,
                        })}
                        className={`w-full p-3 px-4 rounded-xl text-left flex items-center gap-4 border-2 transition-all ${
                          editForm.access_level === level.level
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-text-muted)]'
                        }`}
                      >
                        <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[14px] text-[var(--color-text-primary)] shrink-0 shadow-sm">
                          L{level.level}
                        </span>
                        <span className="block">
                          <span className="block text-[14px] font-bold text-[var(--color-text-primary)]">{level.name}</span>
                          <span className="block text-[12px] text-[var(--color-text-muted)] mt-0.5">{level.desc}</span>
                        </span>
                        {editForm.access_level === level.level && (
                          <Check size={20} aria-hidden="true" className="text-cyan-500 ml-auto shrink-0" strokeWidth={3} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <div
                role="tabpanel"
                id="user-panel-activity"
                aria-labelledby="user-tab-activity"
                className="flex flex-col gap-4"
              >
                <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-2 uppercase tracking-wider">Recent Task Activity</h4>
                {loadingActivity ? (
                  <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
                    <span className="sr-only">Loading activity log…</span>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
                        <SkeletonText lines={2} />
                      </div>
                    ))}
                  </div>
                ) : userActivity.length === 0 ? (
                  <EmptyState
                    icon={<Activity size={22} aria-hidden="true" />}
                    title="No recent activity"
                    description="Nothing has been assigned to or updated by this member yet. Activity appears here once they start working on tasks."
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {userActivity.map(act => (
                      <div key={act.id} className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-text-muted)] transition-colors">
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">{act.title}</div>
                          <Badge
                            tone={
                              act.status === 'completed'
                                ? 'success'
                                : act.status === 'in-progress'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {act.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)] font-medium mt-3">
                          <span className="flex items-center gap-1.5"><Calendar size={14} aria-hidden="true" /> {new Date(act.updated_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5"><AlertCircle size={14} aria-hidden="true" /> Priority: <span className="uppercase">{act.priority}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Onboard New Member"
        description="They will be able to sign in with the temporary password below."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={saving}
              disabled={!addForm.full_name || !addForm.email || (addForm.access_level >= 3 && !addForm.venture_id)}
              onClick={handleAddUser}
            >
              {saving ? 'Creating...' : 'Create User'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <TextField
            label="Full Name"
            required
            value={addForm.full_name}
            onChange={e => setAddForm({...addForm, full_name: e.target.value})}
            placeholder="E.g. John Doe"
          />
          <TextField
            label="Company Email"
            type="email"
            required
            value={addForm.email}
            onChange={e => setAddForm({...addForm, email: e.target.value})}
            placeholder="name@dropwing.com"
          />
          <TextField
            label="Temporary Password"
            hint="Share this with the new member; they should change it after first sign-in."
            value={addForm.password}
            onChange={e => setAddForm({...addForm, password: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Access Level">
              {({ id }) => (
                <Select
                  id={id}
                  value={addForm.access_level}
                  onChange={e => {
                    const level = parseInt(e.target.value);
                    setAddForm({...addForm, access_level: level, venture_id: level <= 2 ? 0 : addForm.venture_id});
                  }}
                >
                  {assignableLevels.map(l => <option key={l.level} value={l.level}>L{l.level} - {l.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Venture">
              {({ id }) => (
                <Select
                  id={id}
                  value={addForm.venture_id}
                  disabled={!canPickVenture || addForm.access_level <= 2}
                  onChange={e => setAddForm({...addForm, venture_id: parseInt(e.target.value)})}
                >
                  <option value={0}>Global Access</option>
                  {VENTURES.map((v, i) => <option key={v.slug} value={i + 1}>{v.name}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              {({ id }) => (
                <Select
                  id={id}
                  value={addForm.department}
                  onChange={e => setAddForm({...addForm, department: e.target.value})}
                >
                  <option value="">Select Dept</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Designation">
              {({ id }) => (
                <Select
                  id={id}
                  value={addForm.designation}
                  onChange={e => setAddForm({...addForm, designation: e.target.value})}
                >
                  <option value="">Select Role</option>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              )}
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
