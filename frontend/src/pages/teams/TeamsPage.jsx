import { useEffect, useState } from 'react';
import { getTeams, createTeam, getUsers } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Users2, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function TeamModal({ users, onClose, onSaved }) {
    const { profile } = useAuth();
    const [form, setForm] = useState({ name: '', manager_id: '' });
    const [loading, setLoading] = useState(false);

    const managers = users.filter((u) => ['manager', 'ceo', 'managing_director'].includes(u.role));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createTeam({ ...form, company_id: profile.company_id });
            toast.success('Team created!');
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create team');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Create Team</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} id="create-team-form">
                    <div className="form-group">
                        <label className="form-label">Team Name</label>
                        <input id="team-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Manager</label>
                        <select id="team-manager" className="form-select" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                            <option value="">No Manager</option>
                            {managers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="create-team-submit" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} /> : <Users2 size={16} />} Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TeamsPage() {
    const { profile } = useAuth();
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [teamsRes] = await Promise.all([getTeams()]);
            let usersData = [];
            try { const ur = await getUsers(); usersData = ur.data; } catch { }
            setTeams(teamsRes.data);
            setUsers(usersData);
        } catch {
            toast.error('Failed to load teams');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const canCreate = ['managing_director', 'ceo'].includes(profile.role);

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Teams</div>
                    <div className="page-subtitle">Manage teams and their members</div>
                </div>
                {canCreate && (
                    <button id="create-team-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Create Team
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : teams.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <h3>No teams yet</h3>
                        <p>Teams will appear here once created.</p>
                    </div>
                </div>
            ) : (
                <div className="grid-3">
                    {teams.map((team) => {
                        const members = team.team_members || [];
                        return (
                            <div key={team.id} className="card">
                                <div className="flex items-center gap-md mb-md">
                                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(255,101,132,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                                        <Users2 size={22} />
                                    </div>
                                    <div>
                                        <h4>{team.name}</h4>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{team.companies?.name}</div>
                                    </div>
                                </div>

                                {team.manager && (
                                    <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                        <div className="avatar-fallback avatar-sm" style={{ fontSize: '0.65rem' }}>
                                            {team.manager.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{team.manager.full_name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Manager</div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                        Members ({members.length})
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {members.slice(0, 8).map((m) => (
                                            <div key={m.profile?.id} title={m.profile?.full_name} className="avatar-fallback" style={{ width: '30px', height: '30px', fontSize: '0.65rem', borderRadius: '50%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {m.profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                            </div>
                                        ))}
                                        {members.length > 8 && (
                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                                +{members.length - 8}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && <TeamModal users={users} onClose={() => setShowModal(false)} onSaved={loadData} />}
        </div>
    );
}
