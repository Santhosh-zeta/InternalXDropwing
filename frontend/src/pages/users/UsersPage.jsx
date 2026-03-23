import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    getUsers,
    deleteUser,
    createUser,
    getVentures,
    listOnboardingInvites,
    createOnboardingInvite,
    decideOnboardingInvite,
    onboardFromInvite,
    updateOnboardingInvite,
} from '../../api';
import { Plus, Trash2, X, Loader2, UserPlus, Link2, Check, XCircle, ShieldCheck, Copy, Pencil } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const ROLES = ['managing_director', 'ceo', 'manager', 'intern', 'client'];
const ROLE_LABELS = { managing_director: 'Managing Director', ceo: 'CEO', manager: 'Manager', intern: 'Intern', client: 'Client', admin: 'Admin' };
const ROLE_BADGE = { managing_director: 'badge-md', ceo: 'badge-ceo', manager: 'badge-manager', intern: 'badge-intern', client: 'badge-client', admin: 'badge-md' };

const INVITE_STATUS_LABEL = {
    created: 'Link created',
    submitted: 'Form submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    onboarded: 'Onboarded',
    expired: 'Expired',
};

const INVITE_STATUS_BADGE = {
    created: 'badge-todo',
    submitted: 'badge-in_progress',
    approved: 'badge-done',
    rejected: 'badge-inactive',
    onboarded: 'badge-active',
    expired: 'badge-inactive',
};

function AddUserModal({ ventures, onClose, onAdded }) {
    const { profile } = useAuth();
    const [form, setForm] = useState({
        email: '', password: '', full_name: '',
        role: 'intern',
        venture_id: profile.venture_id || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUser(form);
            toast.success('User created successfully');
            onAdded();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const availableRoles = profile.role === 'ceo'
        ? ROLES.filter(r => r !== 'managing_director')
        : ROLES;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Add New User</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} id="add-user-form">
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input id="user-fullname" className="form-input" value={form.full_name}
                            onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input id="user-email" className="form-input" type="email" value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input id="user-password" className="form-input" type="password" value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select id="user-role" className="form-select" value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}>
                                {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Venture</label>
                            <select id="user-venture" className="form-select" value={form.venture_id}
                                onChange={e => setForm({ ...form, venture_id: e.target.value })}>
                                <option value="">No venture</option>
                                {ventures.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="add-user-submit" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <UserPlus size={16} />}
                            Add User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateInviteModal({ ventures, onClose, onCreated }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [resultLink, setResultLink] = useState('');
    const [form, setForm] = useState({
        email: '',
        kind: 'member',
        venture_id: profile?.venture_id || '',
        expires_in_days: 7,
    });

    const canPickVenture = ['managing_director', 'admin'].includes(profile?.role);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createOnboardingInvite(form);
            setResultLink(res.data.link);
            toast.success('Invite link created');
            onCreated?.();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create invite');
        } finally {
            setLoading(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(resultLink);
            toast.success('Link copied');
        } catch {
            toast.error('Could not copy link');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 560 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Create onboarding link</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>

                <form onSubmit={handleCreate}>
                    <div className="form-group">
                        <label className="form-label">Invitee email</label>
                        <input className="form-input" type="email" value={form.email} required
                            onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                                <option value="member">Team member</option>
                                <option value="client">Client</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Expires (days)</label>
                            <input
                                className="form-input"
                                type="number"
                                min={1}
                                max={30}
                                value={form.expires_in_days}
                                onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Venture</label>
                        <select
                            className="form-select"
                            value={form.venture_id}
                            onChange={(e) => setForm({ ...form, venture_id: e.target.value })}
                            disabled={!canPickVenture}
                        >
                            <option value="" disabled>Select venture…</option>
                            {ventures.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        {!canPickVenture && <div className="text-muted text-xs" style={{ marginTop: 6 }}>This is locked to your venture.</div>}
                    </div>

                    {resultLink && (
                        <div className="card" style={{ padding: 14, marginTop: 10 }}>
                            <div className="text-xs text-muted" style={{ marginBottom: 6 }}>Share this link:</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input className="form-input" value={resultLink} readOnly style={{ flex: 1 }} />
                                <button type="button" className="btn btn-ghost btn-icon" onClick={copy} title="Copy">
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
                        <button className="btn btn-primary" type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Link2 size={16} />}
                            Create link
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function InviteDetailsModal({ invite, onClose, onSave }) {
    const { profile } = useAuth();
    const canSetRole = profile?.role !== 'ceo'; // CEO can't set MD; UI will still allow non-MD
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        assigned_role: invite.assigned_role || (invite.kind === 'client' ? 'client' : 'intern'),
        designation: invite.designation || '',
        decision_note: invite.decision_note || '',
    });

    const submission = invite.submission || {};

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateOnboardingInvite(invite.id, form);
            toast.success('Saved');
            onSave?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 680 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Onboarding request</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="grid-2" style={{ gap: 16 }}>
                    <div className="card" style={{ padding: 16 }}>
                        <div className="text-xs text-muted" style={{ marginBottom: 6 }}>Invite</div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{invite.email}</div>
                        <div className="text-sm text-muted">
                            {invite.ventures?.name || '—'} • {invite.kind === 'client' ? 'Client' : 'Team member'}
                        </div>
                        <div style={{ marginTop: 10 }}>
                            <span className={`badge ${INVITE_STATUS_BADGE[invite.status] || 'badge-todo'}`}>
                                {INVITE_STATUS_LABEL[invite.status] || invite.status}
                            </span>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                        <div className="text-xs text-muted" style={{ marginBottom: 6 }}>Submitted details</div>
                        <div className="text-sm"><span className="text-muted">Name:</span> <span style={{ fontWeight: 700 }}>{submission.full_name || '—'}</span></div>
                        <div className="text-sm" style={{ marginTop: 6 }}><span className="text-muted">Phone:</span> {submission.phone || '—'}</div>
                        <div className="text-sm" style={{ marginTop: 6 }}><span className="text-muted">Notes:</span> {submission.notes || '—'}</div>
                    </div>
                </div>

                <div className="card" style={{ padding: 16, marginTop: 16 }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 10 }}>Ashwin controls</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Role to assign on onboarding</label>
                            <select
                                className="form-select"
                                value={form.assigned_role}
                                onChange={(e) => setForm({ ...form, assigned_role: e.target.value })}
                                disabled={!canSetRole}
                            >
                                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                            {!canSetRole && <div className="text-muted text-xs" style={{ marginTop: 6 }}>CEOs cannot assign MD.</div>}
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Designation</label>
                            <input
                                className="form-input"
                                value={form.designation}
                                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                placeholder="e.g. Frontend Engineer"
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                        <label className="form-label">Internal note (optional)</label>
                        <textarea
                            className="form-textarea"
                            value={form.decision_note}
                            onChange={(e) => setForm({ ...form, decision_note: e.target.value })}
                            placeholder="Decision context, who referred, etc…"
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Pencil size={16} />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function UsersPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [ventures, setVentures] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedInvite, setSelectedInvite] = useState(null);
    const [tab, setTab] = useState('members'); // members | onboarding
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, venturesRes, invitesRes] = await Promise.all([getUsers(), getVentures(), listOnboardingInvites()]);
            setUsers(usersRes.data);
            setVentures(venturesRes.data);
            setInvites(invitesRes.data);
        } catch (e) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
        try {
            await deleteUser(id);
            toast.success('User deleted');
            setUsers(u => u.filter(x => x.id !== id));
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete');
        }
    };

    const filtered = users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const canDelete = ['managing_director', 'admin'].includes(profile.role);

    const inviteFiltered = invites.filter(i => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            i.email?.toLowerCase().includes(q) ||
            i.submission?.full_name?.toLowerCase().includes(q) ||
            i.ventures?.name?.toLowerCase().includes(q)
        );
    });

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch {
            toast.error('Copy failed');
        }
    };

    const decide = async (inviteId, decision) => {
        try {
            await decideOnboardingInvite(inviteId, { decision });
            toast.success(decision === 'approved' ? 'Approved' : 'Rejected');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Action failed');
        }
    };

    const onboard = async (inviteId) => {
        try {
            const res = await onboardFromInvite(inviteId);
            toast.success('Onboarded');
            if (res.data?.temp_password) {
                toast((t) => (
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontWeight: 700 }}>Temp password:</span>
                        <span style={{ fontFamily: 'monospace' }}>{res.data.temp_password}</span>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { copy(res.data.temp_password); toast.dismiss(t.id); }}
                        >
                            Copy
                        </button>
                    </span>
                ), { duration: 12000 });
            }
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Onboarding failed');
        }
    };

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />

            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Team Members</div>
                    <div className="page-subtitle">
                        Manage members + onboarding across ventures
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {tab === 'members' ? (
                        <button id="add-user-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Add user
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                            <Link2 size={16} /> Create link
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="card" style={{ padding: 10, marginBottom: 16, display: 'flex', gap: 8 }}>
                <button
                    className={`btn btn-sm ${tab === 'members' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTab('members')}
                >
                    Members
                </button>
                <button
                    className={`btn btn-sm ${tab === 'onboarding' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTab('onboarding')}
                >
                    Onboarding
                    <span className="badge badge-in_progress" style={{ marginLeft: 8 }}>
                        {invites.filter(i => ['created', 'submitted', 'approved'].includes(i.status)).length}
                    </span>
                </button>
            </div>

            {/* Search */}
            <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                    className="form-input"
                    placeholder={tab === 'members' ? 'Search members by name or email…' : 'Search onboarding by email/name/venture…'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none', flex: 1 }}
                />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={14} /></button>}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : (
                tab === 'members' ? (
                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Venture</th>
                                        <th>Joined</th>
                                        {canDelete && <th></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                                            {search ? `No members matching "${search}"` : 'No members found'}
                                        </td></tr>
                                    ) : filtered.map(u => (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="flex items-center gap-sm">
                                                    <div className="avatar-fallback avatar-sm" style={{ fontSize: '0.65rem' }}>
                                                        {u.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.full_name}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                                            <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-intern'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                                            <td>{u.ventures?.name || <span className="text-muted">—</span>}</td>
                                            <td>{new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                            {canDelete && (
                                                <td>
                                                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => handleDelete(u.id, u.full_name)} title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Venture</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Submitted</th>
                                        <th style={{ width: 220 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inviteFiltered.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                                            {search ? `No invites matching "${search}"` : 'No onboarding invites yet'}
                                        </td></tr>
                                    ) : inviteFiltered.map(i => {
                                        const isActionable = ['submitted', 'approved'].includes(i.status);
                                        const canOnboard = i.status === 'approved';
                                        const canDecide = i.status === 'submitted';
                                        const link = i.link || `${window.location.origin}/onboard/${i.token}`;

                                        return (
                                            <tr key={i.id}>
                                                <td>
                                                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{i.email}</div>
                                                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                                                        {i.submission?.full_name ? `Name: ${i.submission.full_name}` : 'Not filled yet'}
                                                    </div>
                                                </td>
                                                <td>{i.ventures?.name || <span className="text-muted">—</span>}</td>
                                                <td>{i.kind === 'client' ? 'Client' : 'Member'}</td>
                                                <td>
                                                    <span className={`badge ${INVITE_STATUS_BADGE[i.status] || 'badge-todo'}`}>
                                                        {INVITE_STATUS_LABEL[i.status] || i.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(i.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                                                <td>{i.submitted_at ? new Date(i.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : <span className="text-muted">—</span>}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => copy(link)}
                                                            title="Copy invite link"
                                                        >
                                                            <Copy size={14} /> Link
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => setSelectedInvite(i)}
                                                            title="Review + edit"
                                                        >
                                                            <Pencil size={14} /> Review
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            disabled={!canDecide}
                                                            onClick={() => decide(i.id, 'approved')}
                                                            title="Approve"
                                                        >
                                                            <Check size={14} /> Approve
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            disabled={!canDecide}
                                                            onClick={() => decide(i.id, 'rejected')}
                                                            title="Reject"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            disabled={!canOnboard}
                                                            onClick={() => onboard(i.id)}
                                                            title="Create the actual user account"
                                                        >
                                                            <ShieldCheck size={14} /> Onboard
                                                        </button>
                                                        {!isActionable && i.status === 'created' && (
                                                            <span className="text-xs text-muted" style={{ alignSelf: 'center' }}>Waiting for form</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {showModal && <AddUserModal ventures={ventures} onClose={() => setShowModal(false)} onAdded={loadData} />}
            {showInviteModal && <CreateInviteModal ventures={ventures} onClose={() => setShowInviteModal(false)} onCreated={loadData} />}
            {selectedInvite && (
                <InviteDetailsModal
                    invite={selectedInvite}
                    onClose={() => setSelectedInvite(null)}
                    onSave={loadData}
                />
            )}
        </div>
    );
}
