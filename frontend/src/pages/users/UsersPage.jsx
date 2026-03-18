import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUsers, deleteUser, createUser, getVentures } from '../../api';
import { Plus, Trash2, X, Loader2, UserPlus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const ROLES = ['managing_director', 'ceo', 'manager', 'intern', 'client'];
const ROLE_LABELS = { managing_director: 'Managing Director', ceo: 'CEO', manager: 'Manager', intern: 'Intern', client: 'Client', admin: 'Admin' };
const ROLE_BADGE = { managing_director: 'badge-md', ceo: 'badge-ceo', manager: 'badge-manager', intern: 'badge-intern', client: 'badge-client', admin: 'badge-md' };

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

export default function UsersPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [ventures, setVentures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, venturesRes] = await Promise.all([getUsers(), getVentures()]);
            setUsers(usersRes.data);
            setVentures(venturesRes.data);
        } catch (e) {
            toast.error('Failed to load users');
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

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />

            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Team Members</div>
                    <div className="page-subtitle">{users.length} member{users.length !== 1 ? 's' : ''} across all ventures</div>
                </div>
                <button id="add-user-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add User
                </button>
            </div>

            {/* Search */}
            <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                    className="form-input"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none', flex: 1 }}
                />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={14} /></button>}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : (
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
                                        {search ? `No users matching "${search}"` : 'No users found'}
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
            )}

            {showModal && <AddUserModal ventures={ventures} onClose={() => setShowModal(false)} onAdded={loadData} />}
        </div>
    );
}
