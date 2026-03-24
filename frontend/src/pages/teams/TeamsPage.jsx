import { useEffect, useState, useMemo } from 'react';
import { getTeams, createTeam, getUsers, getTasks, getCompanies } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
    Plus, X, Users2, Loader2, AlertTriangle, AlertCircle,
    CheckCircle2, Activity, Clock, ChevronRight, Building2,
    Search, Filter
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ─── Create Team Modal ──────────────────────────────────────────────
function CreateTeamModal({ users, companies, profile, onClose, onSaved }) {
    const isMD = ['managing_director', 'admin'].includes(profile.role);
    const [form, setForm] = useState({
        name: '',
        manager_id: '',
        company_id: isMD ? '' : (profile.company_id || ''),
    });
    const [loading, setLoading] = useState(false);

    const managers = users.filter(u =>
        ['manager', 'ceo', 'managing_director', 'admin'].includes(u.role) &&
        (!form.company_id || u.company_id === form.company_id)
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Team name required');
        if (!form.company_id) return toast.error('Company required');
        setLoading(true);
        try {
            await createTeam(form);
            toast.success('Team initialized successfully');
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
            <div className="modal" style={{ borderTop: '3px solid var(--accent-primary)' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Create Team</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Company */}
                    {isMD ? (
                        <div className="form-group">
                            <label className="form-label">Company / Venture</label>
                            <select
                                className="form-select"
                                value={form.company_id}
                                onChange={e => setForm({ ...form, company_id: e.target.value, manager_id: '' })}
                                required
                            >
                                <option value="">Select company</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">Company</label>
                            <div style={{
                                padding: '11px 14px', background: 'var(--surface-subtle)',
                                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                                fontSize: '0.875rem', color: 'var(--text-muted)'
                            }}>
                                {companies.find(c => c.id === form.company_id)?.name || '—'}
                            </div>
                        </div>
                    )}

                    {/* Team Name */}
                    <div className="form-group">
                        <label className="form-label">Team Name</label>
                        <input
                            className="form-input"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Frontend Team, Growth Squad"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Manager */}
                    <div className="form-group">
                        <label className="form-label">Team Lead (Manager)</label>
                        <select
                            className="form-select"
                            value={form.manager_id}
                            onChange={e => setForm({ ...form, manager_id: e.target.value })}
                        >
                            <option value="">No lead assigned</option>
                            {managers.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name} — {u.role}</option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '120px' }}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={16} /> Create Team</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Team Card ─────────────────────────────────────────────────────
function TeamCard({ team, users, tasks, onClick }) {
    const members = team.team_members?.map(m => m.user).filter(Boolean) || [];
    const lead = users.find(u => u.id === team.manager_id);

    // Task metrics
    const teamTasks = tasks.filter(t => t.assigned_teams?.includes(team.id));
    const active = teamTasks.filter(t => t.status !== 'done');
    const pending = teamTasks.filter(t => t.status === 'todo');
    const now = new Date();
    const overdue = active.filter(t => t.due_date && new Date(t.due_date) < now);

    // Health
    let status = 'Active';
    let statusColor = 'var(--success)';
    let statusBg = 'rgba(34,197,94,0.1)';
    if (members.length === 0 && active.length === 0) { status = 'Idle'; statusColor = 'var(--text-muted)'; statusBg = 'rgba(113,113,122,0.1)'; }
    if (overdue.length > 0) { status = 'Delayed'; statusColor = 'var(--warning)'; statusBg = 'rgba(245,158,11,0.1)'; }
    if (active.length > members.length * 4 && members.length > 0) { status = 'Overloaded'; statusColor = 'var(--danger)'; statusBg = 'rgba(239,68,68,0.1)'; }

    return (
        <div
            onClick={onClick}
            style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.15)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Top accent line (gradient) */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)', flexShrink: 0 }} />

            {/* Header */}
            <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Users2 size={18} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{team.name}</h3>
                            {team.companies?.name && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <Building2 size={10} /> {team.companies.name}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <span style={{
                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: statusColor, background: statusBg, padding: '3px 8px', borderRadius: '99px', flexShrink: 0
                }}>
                    {status}
                </span>
            </div>

            {/* Lead info */}
            <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border-default)' }}>
                {lead ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--accent-primary), #8B5CF6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 800, color: '#fff'
                        }}>
                            {lead.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.full_name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{lead.role}</div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 600 }}>
                        <AlertCircle size={13} /> No Lead Assigned
                    </div>
                )}
            </div>

            {/* Metrics */}
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                    { label: 'Members', val: members.length, icon: <Users2 size={12} />, col: 'var(--text-secondary)' },
                    { label: 'Active', val: active.length, icon: <Activity size={12} />, col: active.length > 0 ? 'var(--info)' : 'var(--text-muted)' },
                    { label: 'Pending', val: pending.length, icon: <Clock size={12} />, col: pending.length > 0 ? 'var(--warning)' : 'var(--text-muted)' },
                ].map((m, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--surface-subtle)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.col }}>{m.val}</div>
                        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            {m.icon} {m.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Alerts / Footer */}
            <div style={{ padding: '10px 20px 14px', marginTop: 'auto' }}>
                {overdue.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                        <AlertTriangle size={12} /> {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}
                    </div>
                ) : members.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                        <CheckCircle2 size={12} /> On track
                    </div>
                ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No members yet</div>
                )}
            </div>

            {/* Member avatars strip */}
            {members.length > 0 && (
                <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {members.slice(0, 6).map((m, i) => (
                        <div key={m.id} title={m.full_name} style={{
                            width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                            background: `hsl(${(i * 47 + 220) % 360}, 65%, 55%)`,
                            border: '2px solid var(--surface-elevated)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.55rem', fontWeight: 800, color: '#fff',
                            marginLeft: i > 0 ? '-6px' : 0, zIndex: 10 - i
                        }}>
                            {m.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                    ))}
                    {members.length > 6 && (
                        <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: 'var(--surface-subtle)', border: '2px solid var(--surface-elevated)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)',
                            marginLeft: '-6px'
                        }}>+{members.length - 6}</div>
                    )}
                    <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                </div>
            )}
        </div>
    );
}

// ─── Empty State ────────────────────────────────────────────────────
function EmptyState({ canCreate, onCreate }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '55vh', gap: '16px', padding: '48px'
        }}>
            <div style={{
                width: '72px', height: '72px', borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '8px'
            }}>
                <Users2 size={34} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>No teams yet</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '340px', lineHeight: 1.6 }}>
                Teams are the execution units of your company. Create your first team to start assigning work.
            </div>
            {canCreate && (
                <button className="btn btn-primary" onClick={onCreate} style={{ marginTop: '8px', padding: '12px 24px' }}>
                    <Plus size={16} /> Create your first team
                </button>
            )}
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function TeamsPage() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCompany, setFilterCompany] = useState('all');

    const isMD = ['managing_director', 'admin'].includes(profile.role);
    const canCreate = ['managing_director', 'admin', 'ceo'].includes(profile.role);

    const loadData = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                getTeams(), getUsers(), getTasks(), getCompanies()
            ]);
            if (results[0].status === 'fulfilled') setTeams(extractData(results[0].value.data));
            if (results[1].status === 'fulfilled') setUsers(extractData(results[1].value.data));
            if (results[2].status === 'fulfilled') setTasks(extractData(results[2].value.data));
            if (results[3].status === 'fulfilled') setCompanies(extractData(results[3].value.data));
        } catch {
            toast.error('Failed to load teams');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredTeams = useMemo(() => {
        let list = [...teams];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.companies?.name?.toLowerCase().includes(q)
            );
        }
        if (filterCompany !== 'all') {
            list = list.filter(t => t.company_id === filterCompany);
        }
        return list;
    }, [teams, search, filterCompany]);

    // Summary stats
    const stats = useMemo(() => {
        const total = teams.length;
        const withLeads = teams.filter(t => t.manager_id).length;
        const totalMembers = teams.reduce((s, t) => s + (t.team_members?.length || 0), 0);
        const now = new Date();
        const overdueTeams = teams.filter(t => {
            const tTasks = tasks.filter(tsk => tsk.assigned_teams?.includes(t.id) && tsk.status !== 'done');
            return tTasks.some(tsk => tsk.due_date && new Date(tsk.due_date) < now);
        }).length;
        return { total, withLeads, totalMembers, overdueTeams };
    }, [teams, tasks]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <Loader2 size={28} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Loading Teams...
            </div>
        </div>
    );

    return (
        <div style={{ animation: 'fade-in 0.25s ease-out' }}>
            <Toaster position="top-right" toastOptions={{
                style: { background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }
            }} />

            {/* ── PAGE HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <div className="page-title">Teams</div>
                    <div className="page-subtitle">Execution structure of the company</div>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Create Team
                    </button>
                )}
            </div>

            {/* ── SUMMARY STRIP (only if teams exist) ── */}
            {teams.length > 0 && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))',
                    gap: '12px', marginBottom: '28px'
                }}>
                    {[
                        { label: 'Total Teams', val: stats.total, col: 'var(--accent-primary)' },
                        { label: 'Total Members', val: stats.totalMembers, col: 'var(--info)' },
                        { label: 'With Lead', val: stats.withLeads, col: 'var(--success)' },
                        { label: 'Delayed', val: stats.overdueTeams, col: stats.overdueTeams > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)', padding: '16px 20px',
                            borderLeft: `3px solid ${s.col}`
                        }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.col, lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── SEARCH + FILTER ── */}
            {teams.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            className="form-input"
                            placeholder="Search teams..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '36px' }}
                        />
                    </div>
                    {isMD && companies.length > 1 && (
                        <select
                            className="form-select"
                            value={filterCompany}
                            onChange={e => setFilterCompany(e.target.value)}
                            style={{ width: 'auto', minWidth: '180px' }}
                        >
                            <option value="all">All Companies</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>
            )}

            {/* ── CONTENT ── */}
            {teams.length === 0 ? (
                <EmptyState canCreate={canCreate} onCreate={() => setShowModal(true)} />
            ) : filteredTeams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No teams match your search.
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px'
                }}>
                    {filteredTeams.map(team => (
                        <TeamCard
                            key={team.id}
                            team={team}
                            users={users}
                            tasks={tasks}
                            onClick={() => {
                                // Navigate to companies page scoped to this team
                                // (Teams page integrated into CompaniesPage drill-down)
                                // For now: push to a route or show a detail via state
                                navigate('/companies', { state: { openTeamId: team.id } });
                            }}
                        />
                    ))}
                </div>
            )}

            {/* ── MODAL ── */}
            {showModal && (
                <CreateTeamModal
                    users={users}
                    companies={companies}
                    profile={profile}
                    onClose={() => setShowModal(false)}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
