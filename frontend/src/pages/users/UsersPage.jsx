import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    getUsers,
    deleteUser,
    createUser,
    updateUser,
    getCompanies,
    listOnboardingInvites,
    createOnboardingInvite,
    decideOnboardingInvite,
    onboardFromInvite,
    updateOnboardingInvite,
    extractData,
    getUsersByCompany,
} from '../../api';
import { Plus, Trash2, X, Loader2, UserPlus, Link2, Check, XCircle, ShieldCheck, Copy, Pencil, Settings2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const ROLES = ['managing_director', 'ceo', 'manager', 'intern', 'client', 'admin'];
const ROLE_LABELS = { managing_director: 'MD', ceo: 'CEO', manager: 'Manager', intern: 'Intern', client: 'Client', admin: 'Admin' };
const ROLE_BADGE = { managing_director: 'badge-md', ceo: 'badge-ceo', manager: 'badge-manager', intern: 'badge-intern', client: 'badge-client', admin: 'badge-md' };

const INVITE_STATUS_LABEL = {
    created: 'Created',
    submitted: 'Submitted',
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

function AddUserModal({ companies, onClose, onAdded }) {
    const { profile } = useAuth();
    const [form, setForm] = useState({
        email: '', password: '', full_name: '',
        role: 'intern',
        company_id: profile.company_id || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUser(form);
            toast.success('System identity created');
            onAdded();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create identity');
        } finally {
            setLoading(false);
        }
    };

    const availableRoles = ['managing_director', 'admin'].includes(profile.role)
        ? ROLES
        : ROLES.filter(r => r !== 'managing_director' && r !== 'admin');

    const canPickCompany = ['managing_director', 'admin'].includes(profile.role);

    return (
        <div className="modal-overlay" style={{ animation: 'fade-in 0.2s ease-out' }}>
            <div className="modal" style={{ borderTop: '4px solid var(--color-primary)' }}>
                <div className="modal-header" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Provision Identity</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
                        <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Auth Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Initial Key (Password)</label>
                        <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                    </div>
                    <div className="grid-2" style={{ gap: '16px', marginBottom: '24px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Authority Level</label>
                            <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Placement Matrix</label>
                            <select className="form-select" value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })} disabled={!canPickCompany}>
                                <option value="">No affiliation</option>
                                {companies.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            {!canPickCompany && <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Locked to current node</div>}
                        </div>
                    </div>
                    <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Abort</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={16} />}
                            Provision Node
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EditUserModal({ user, companies, onClose, onUpdated }) {
    const { profile } = useAuth();
    const [form, setForm] = useState({
        full_name: user?.full_name || '',
        role: user?.role || 'intern',
        company_id: user?.company_id || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUser(user.id, form);
            toast.success('Identity updated');
            onUpdated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    const availableRoles = ['managing_director', 'admin'].includes(profile.role)
        ? ROLES
        : ROLES.filter(r => r !== 'managing_director' && r !== 'admin');

    const canPickCompany = ['managing_director', 'admin'].includes(profile.role);
    const isEditingSelf = user.id === profile.id;

    return (
        <div className="modal-overlay" style={{ animation: 'fade-in 0.2s ease-out' }}>
            <div className="modal" style={{ borderTop: '4px solid var(--color-info)' }}>
                <div className="modal-header" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Modify Node Attributes</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Identifier</label>
                        <input className="form-input" value={user.id} readOnly disabled style={{ background: 'var(--color-bg-hover)', opacity: 0.7 }} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
                        <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                    </div>
                    <div className="grid-2" style={{ gap: '16px', marginBottom: '24px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Authority Level</label>
                            <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={isEditingSelf && !['managing_director', 'admin'].includes(profile.role)}>
                                {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>)}
                            </select>
                            {isEditingSelf && !['managing_director', 'admin'].includes(profile.role) && <div style={{ fontSize: '0.65rem', color: 'var(--color-danger)', marginTop: '4px', textTransform: 'uppercase' }}>Cannot escalate self</div>}
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Placement Matrix</label>
                            <select className="form-select" value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })} disabled={!canPickCompany || isEditingSelf}>
                                <option value="">No affiliation</option>
                                {companies.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Abort</button>
                        <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-info)' }} disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Settings2 size={16} />}
                            Commit Override
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateInviteModal({ companies, onClose, onCreated }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [resultLink, setResultLink] = useState('');
    const [form, setForm] = useState({
        email: '',
        kind: 'member',
        company_id: profile?.company_id || '',
        expires_in_days: 7,
    });

    const canPickCompany = ['managing_director', 'admin'].includes(profile?.role);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createOnboardingInvite(form);
            setResultLink(res.data.link);
            toast.success('Secure link generated');
            onCreated?.();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Link generation failed');
        } finally {
            setLoading(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(resultLink);
            toast.success('Token copied to clipboard');
        } catch {
            toast.error('Copy blocked');
        }
    };

    return (
        <div className="modal-overlay" style={{ animation: 'fade-in 0.2s ease-out' }}>
            <div className="modal" style={{ maxWidth: 560, borderTop: '4px solid var(--color-warning)' }}>
                <div className="modal-header" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Generate Secure Invite</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>

                <form onSubmit={handleCreate}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Email (Invitee)</label>
                        <input className="form-input" type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>

                    <div className="grid-2" style={{ gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Identity Type</label>
                            <select className="form-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                                <option value="member">Network Member</option>
                                <option value="client">Client Node</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>TTL (Days to Expire)</label>
                            <input className="form-input" type="number" min={1} max={30} value={form.expires_in_days} onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Placement Node Setup</label>
                        <select className="form-select" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} disabled={!canPickCompany}>
                            <option value="" disabled>Select target system</option>
                            {companies.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        {!canPickCompany && <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Locked to explicit context</div>}
                    </div>

                    {resultLink && (
                        <div className="card" style={{ padding: 16, marginTop: 12, border: '1px dashed var(--color-warning)', background: 'var(--color-bg)' }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-warning)', marginBottom: '8px', fontWeight: 'bold' }}>One-Time Access Link</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input className="form-input" value={resultLink} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }} />
                                <button type="button" className="btn btn-ghost" onClick={copy} title="Copy">
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '24px' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Dismiss</button>
                        <button className="btn btn-primary" style={{ background: 'var(--color-warning)', color: '#000' }} type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={16} />}
                            {resultLink ? 'Generate Next' : 'Mint Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function InviteDetailsModal({ invite, onClose, onSave }) {
    const { profile } = useAuth();
    const canSetRole = ['managing_director', 'admin'].includes(profile?.role);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        assigned_role: invite.assigned_role || (invite.kind === 'client' ? 'client' : 'intern'),
        designation: invite.designation || '',
        decision_note: invite.decision_note || '',
    });

    const submission = invite.submission || {};
    const availableRoles = canSetRole ? ROLES : ROLES.filter(r => r !== 'managing_director' && r !== 'admin');

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateOnboardingInvite(invite.id, form);
            toast.success('Attributes synced');
            onSave?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Sync failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ animation: 'fade-in 0.2s ease-out' }}>
            <div className="modal" style={{ maxWidth: 680, borderTop: '4px solid var(--color-accent)' }}>
                <div className="modal-header" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Onboarding Request Trace</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="grid-2" style={{ gap: 16 }}>
                    <div className="card" style={{ padding: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 'bold' }}>Session Data</div>
                        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>{invite.email}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>Target: {invite.companies?.name || '—'}</div>
                            <div>Classification: {invite.kind === 'client' ? 'Client' : 'Internal Node'}</div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <span className={`badge ${INVITE_STATUS_BADGE[invite.status] || 'badge-todo'}`}>
                                {INVITE_STATUS_LABEL[invite.status] || invite.status}
                            </span>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 'bold' }}>Transmitted Payload</div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}><span style={{ color: 'var(--color-text-muted)', display: 'inline-block', width: '60px' }}>Name:</span> <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{submission.full_name || '—'}</span></div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}><span style={{ color: 'var(--color-text-muted)', display: 'inline-block', width: '60px' }}>Phone:</span> <span style={{ color: 'var(--color-text-primary)' }}>{submission.phone || '—'}</span></div>
                        <div style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--color-text-muted)', display: 'inline-block', width: '60px' }}>Notes:</span> <span style={{ color: 'var(--color-text-primary)' }}>{submission.notes ? `"${submission.notes}"` : '—'}</span></div>
                    </div>
                </div>

                <div className="card" style={{ padding: 16, marginTop: 16, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-accent)', marginBottom: '16px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>Executive Oversight Parameters</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Enforced Role Target</label>
                            <select
                                className="form-select"
                                value={form.assigned_role}
                                onChange={(e) => setForm({ ...form, assigned_role: e.target.value })}
                            >
                                {availableRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>)}
                            </select>
                            {!canSetRole && <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>MD/Admin enforcement blocked</div>}
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Custom Designation string</label>
                            <input
                                className="form-input"
                                value={form.designation}
                                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                placeholder="e.g. Senior Frontend Engineer"
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Internal Audit Note (Optional)</label>
                        <textarea
                            className="form-textarea"
                            style={{ minHeight: '60px' }}
                            value={form.decision_note}
                            onChange={(e) => setForm({ ...form, decision_note: e.target.value })}
                            placeholder="Decision context, pipeline traces…"
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '24px' }}>
                    <button className="btn btn-ghost" onClick={onClose}>Drop changes</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ background: 'var(--color-accent)', color: '#fff' }}>
                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Pencil size={16} />}
                        Sync Parameters
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function UsersPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editUserModalData, setEditUserModalData] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedInvite, setSelectedInvite] = useState(null);
    
    const [tab, setTab] = useState('directory'); // directory | onboarding
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const reqRole = profile?.role;
            const results = await Promise.allSettled([
                reqRole === 'ceo' ? getUsersByCompany(profile.company_id) : getUsers(),
                reqRole !== 'ceo' ? getCompanies() : Promise.resolve({ data: [] }),
                listOnboardingInvites()
            ]);
            
            if (results[0].status === 'fulfilled') setUsers(extractData(results[0].value.data));
            if (results[1].status === 'fulfilled') setCompanies(extractData(results[1].value.data));
            if (results[2].status === 'fulfilled') setInvites(extractData(results[2].value.data));
        } catch (e) {
            toast.error('Data pull failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleDelete = async (id, name) => {
        if (!confirm(`WARNING: Eradicating ${name}'s system node entirely. Proceed?`)) return;
        try {
            await deleteUser(id);
            toast.success('Node eradicated');
            setUsers(u => u.filter(x => x.id !== id));
        } catch (err) {
            toast.error(err.response?.data?.error || 'Eradication failed');
        }
    };

    const filtered = users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const canDelete = ['managing_director', 'admin'].includes(profile.role);
    const canEditUsers = ['managing_director', 'admin', 'ceo'].includes(profile.role);

    const inviteFiltered = invites.filter(i => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            i.email?.toLowerCase().includes(q) ||
            i.submission?.full_name?.toLowerCase().includes(q) ||
            i.companies?.name?.toLowerCase().includes(q)
        );
    });

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Sequence copied');
        } catch {
            toast.error('Copy blocked');
        }
    };

    const decide = async (inviteId, decision) => {
        try {
            await decideOnboardingInvite(inviteId, { decision });
            toast.success(decision === 'approved' ? 'Request Verified' : 'Request Terminated');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Action failed');
        }
    };

    const onboard = async (inviteId) => {
        try {
            const res = await onboardFromInvite(inviteId);
            toast.success('Node established');
            if (res.data?.temp_password) {
                toast((t) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary)' }}>System Initialized</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>TEMP KEY:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, background: 'var(--color-bg-hover)', padding: '4px 8px', borderRadius: '4px' }}>{res.data.temp_password}</span>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { copy(res.data.temp_password); toast.dismiss(t.id); }}>
                            Copy Key
                        </button>
                    </div>
                ), { duration: 15000, style: { border: '1px solid var(--color-primary)' } });
            }
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Integration failed');
        }
    };

    const getInitials = (name) => name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' } }} />

            <div className="page-header" style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                <div>
                    <div className="page-title">Directory Matrix</div>
                    <div className="page-subtitle" style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '4px', color: 'var(--color-primary)' }}>
                        Oversight & Integration
                    </div>
                </div>
            </div>

            {/* Matrix Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                    onClick={() => setTab('directory')}
                    style={{ position: 'relative', background: tab === 'directory' ? 'var(--color-bg-elevated)' : 'transparent', border: `1px solid ${tab === 'directory' ? 'var(--color-primary)' : 'var(--color-border)'}`, padding: '10px 20px', borderRadius: 'var(--radius-md)', color: tab === 'directory' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                    Live Directory Map
                </button>
                <button
                    onClick={() => setTab('onboarding')}
                    style={{ position: 'relative', background: tab === 'onboarding' ? 'var(--color-bg-elevated)' : 'transparent', border: `1px solid ${tab === 'onboarding' ? 'var(--color-primary)' : 'var(--color-border)'}`, padding: '10px 20px', borderRadius: 'var(--radius-md)', color: tab === 'onboarding' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    Airlock Gateways
                    {invites.filter(i => ['created', 'submitted', 'approved'].includes(i.status)).length > 0 && (
                        <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                            {invites.filter(i => ['created', 'submitted', 'approved'].includes(i.status)).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Action Bar */}
            <div className="card" style={{ padding: '12px 16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-bg)', padding: '0 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <svg width="16" height="16" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        className="form-input"
                        placeholder={tab === 'directory' ? 'Query directory by syntax...' : 'Scan airlock pipelines...'}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', boxShadow: 'none', flex: 1, fontSize: '0.85rem' }}
                    />
                    {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={14} /></button>}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', borderLeft: '1px solid var(--color-border)', paddingLeft: '16px' }}>
                    {tab === 'directory' ? (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Direct Provision
                        </button>
                    ) : (
                        <button className="btn btn-primary" style={{ background: 'var(--color-warning)', color: '#000' }} onClick={() => setShowInviteModal(true)}>
                            <Link2 size={16} /> Mint Secure Link
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '100px', color: 'var(--color-text-secondary)', minHeight: '400px' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '16px', color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Retrieving Matrix Data...</span>
                </div>
            ) : (
                tab === 'directory' ? (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-wrapper">
                            <table style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Identity Signature</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Auth Channel</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Authority Class</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Placement</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Join Sync</th>
                                        <th style={{ width: 100, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                            {search ? `Null response for query "${search}"` : 'Directory empty.'}
                                        </td></tr>
                                    ) : filtered.map(u => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
                                                        {getInitials(u.full_name)}
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>{u.full_name}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)', padding: '16px 20px', fontSize: '0.8rem' }}>{u.email}</td>
                                            <td style={{ padding: '16px 20px' }}><span className={`badge ${ROLE_BADGE[u.role] || 'badge-intern'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                                            <td style={{ padding: '16px 20px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{u.companies?.name || <span className="text-muted" style={{ opacity: 0.5 }}>UNBOUND</span>}</td>
                                            <td style={{ padding: '16px 20px', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    {canEditUsers && (
                                                        <button className="btn btn-icon btn-ghost" style={{ width: '30px', height: '30px' }} onClick={() => setEditUserModalData(u)} title="Modify Attributes">
                                                            <Settings2 size={14} color="var(--color-info)" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button className="btn btn-icon btn-ghost" style={{ width: '30px', height: '30px', background: 'rgba(248, 113, 113, 0.1)' }} onClick={() => handleDelete(u.id, u.full_name)} title="Eradicate Node">
                                                            <Trash2 size={14} color="var(--color-danger)" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-wrapper">
                            <table style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Target Envelope</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Placement</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Type</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>State</th>
                                        <th style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>Minted / Trace</th>
                                        <th style={{ width: 340, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inviteFiltered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                            {search ? `Null response for "${search}"` : 'No active pipelines.'}
                                        </td></tr>
                                    ) : inviteFiltered.map(i => {
                                        const isActionable = ['submitted', 'approved'].includes(i.status);
                                        const canOnboard = i.status === 'approved';
                                        const canDecide = i.status === 'submitted';
                                        const link = i.link || `${window.location.origin}/onboard/${i.token}`;

                                        return (
                                            <tr key={i.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>{i.email}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        {i.submission?.full_name ? `Claim: ${i.submission.full_name}` : 'Awaiting claim'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 600 }}>{i.companies?.name || <span className="text-muted" style={{ opacity: 0.5 }}>UNBOUND</span>}</td>
                                                <td style={{ padding: '16px 20px', fontSize: '0.8rem' }}><span style={{ border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold' }}>{i.kind === 'client' ? 'Client' : 'Internal'}</span></td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span className={`badge ${INVITE_STATUS_BADGE[i.status] || 'badge-todo'}`}>
                                                        {INVITE_STATUS_LABEL[i.status] || i.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                                    <div>{new Date(i.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}</div>
                                                    {i.submitted_at && <div style={{ color: 'var(--color-info)' }}>{new Date(i.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}</div>}
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                        <button className="btn btn-ghost btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => copy(link)} title="Copy Link">
                                                            <Copy size={14} color="var(--color-text-secondary)" />
                                                        </button>
                                                        <button className="btn btn-ghost btn-icon" style={{ width: '32px', height: '32px' }} onClick={() => setSelectedInvite(i)} title="Audit Trace">
                                                            <Pencil size={14} color="var(--color-info)" />
                                                        </button>
                                                        {canDecide && (
                                                            <>
                                                                <button className="btn btn-ghost btn-icon" style={{ width: '32px', height: '32px', background: 'rgba(74, 222, 128, 0.1)' }} onClick={() => decide(i.id, 'approved')} title="Verify & Allow">
                                                                    <Check size={14} color="var(--color-success)" />
                                                                </button>
                                                                <button className="btn btn-ghost btn-icon" style={{ width: '32px', height: '32px', background: 'rgba(248, 113, 113, 0.1)' }} onClick={() => decide(i.id, 'rejected')} title="Reject">
                                                                    <XCircle size={14} color="var(--color-danger)" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {canOnboard && (
                                                            <button className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }} onClick={() => onboard(i.id)}>
                                                                <ShieldCheck size={14} /> Commit Node
                                                            </button>
                                                        )}
                                                        {!isActionable && i.status === 'created' && (
                                                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', alignSelf: 'center', marginLeft: '8px' }}>Active</span>
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

            {showModal && <AddUserModal companies={companies} onClose={() => setShowModal(false)} onAdded={loadData} />}
            {editUserModalData && <EditUserModal user={editUserModalData} companies={companies} onClose={() => setEditUserModalData(null)} onUpdated={loadData} />}
            {showInviteModal && <CreateInviteModal companies={companies} onClose={() => setShowInviteModal(false)} onCreated={loadData} />}
            {selectedInvite && <InviteDetailsModal invite={selectedInvite} onClose={() => setSelectedInvite(null)} onSave={loadData} />}
        </div>
    );
}
