import { useEffect, useState, useMemo } from 'react';
import {
    getProjects, createProject, updateProject,
    getTasks, getTeams, getUsers, getCompanies, extractData
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
    Plus, X, Loader2, Briefcase, AlertTriangle, AlertCircle,
    CheckCircle2, Activity, Clock, ChevronRight, Building2,
    Users2, Target, Search, ArrowLeft, Calendar, Zap
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
    active:    { label: 'Active',    color: 'var(--success)', bg: 'rgba(34,197,94,0.1)',    grad: 'linear-gradient(135deg,#10B981,#22C55E)' },
    completed: { label: 'Completed', color: 'var(--accent-primary)', bg: 'rgba(99,102,241,0.1)', grad: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
    on_hold:   { label: 'On Hold',   color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)',   grad: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
    blocked:   { label: 'Blocked',   color: 'var(--danger)',  bg: 'rgba(239,68,68,0.1)',    grad: 'linear-gradient(135deg,#EF4444,#BE185D)' },
};

// ─── Create Project Modal ────────────────────────────────────────────
function CreateProjectModal({ companies, profile, onClose, onSaved }) {
    const isMD = ['managing_director', 'admin'].includes(profile.role);
    const [form, setForm] = useState({
        name: '', description: '', status: 'active',
        company_id: isMD ? '' : (profile.company_id || '')
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Project name required');
        setLoading(true);
        try {
            await createProject(form);
            toast.success('Project initialized');
            onSaved(); onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create project');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ borderTop: '3px solid var(--accent-primary)' }}>
                <div className="modal-header">
                    <h3 className="modal-title">New Project</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    {isMD ? (
                        <div className="form-group">
                            <label className="form-label">Company</label>
                            <select className="form-select" value={form.company_id}
                                onChange={e => setForm({ ...form, company_id: e.target.value })} required>
                                <option value="">Select company</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    ) : null}
                    <div className="form-group">
                        <label className="form-label">Project Name</label>
                        <input className="form-input" value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Website Redesign, Mobile App v2" required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Brief scope of work..." style={{ minHeight: '80px' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Initial Status</label>
                        <select className="form-select" value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '130px' }}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={16} /> Create Project</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Deploy Task Modal (project-scoped) ─────────────────────────────
function DeployTaskModal({ project, teams, users, profile, onClose, onSaved }) {
    const [form, setForm] = useState({
        title: '', description: '', due_date: '', status: 'todo',
        assigned_company_id: project.company_id || '',
        assigned_teams: [], assigned_profiles: [], assigned_roles: [],
    });
    const [loading, setLoading] = useState(false);

    const projectTeams = teams.filter(t => t.company_id === project.company_id);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('Task title required');
        setLoading(true);
        try {
            await createTask(form);
            toast.success('Task deployed to project');
            onSaved(); onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to deploy task');
        } finally { setLoading(false); }
    };

    const toggleTeam = (id) => setForm(f => ({
        ...f, assigned_teams: f.assigned_teams.includes(id)
            ? f.assigned_teams.filter(x => x !== id)
            : [...f.assigned_teams, id]
    }));

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ borderTop: '3px solid var(--success)', maxWidth: '560px' }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title">Deploy Task</h3>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>→ {project.name}</div>
                    </div>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Task Title</label>
                        <input className="form-input" value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="What needs to be done?" required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Details, requirements..." style={{ minHeight: '70px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input type="date" className="form-input" value={form.due_date}
                                onChange={e => setForm({ ...form, due_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-select" value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="todo">Pending</option>
                                <option value="in_progress">Active</option>
                            </select>
                        </div>
                    </div>

                    {projectTeams.length > 0 && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Assign Teams</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {projectTeams.map(t => (
                                    <button key={t.id} type="button"
                                        onClick={() => toggleTeam(t.id)}
                                        style={{
                                            padding: '6px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600,
                                            cursor: 'pointer', border: '1px solid',
                                            borderColor: form.assigned_teams.includes(t.id) ? 'var(--accent-primary)' : 'var(--border-default)',
                                            background: form.assigned_teams.includes(t.id) ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                                            color: form.assigned_teams.includes(t.id) ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            transition: 'all 0.15s'
                                        }}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '130px' }}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Zap size={16} /> Deploy Task</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Project Card (Grid View) ────────────────────────────────────────
function ProjectCard({ project, tasks, onClick }) {
    const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
    const pTasks = tasks.filter(t => t.assigned_company_id === project.company_id);
    const active = pTasks.filter(t => t.status !== 'done').length;
    const done = pTasks.filter(t => t.status === 'done').length;
    const now = new Date();
    const overdue = pTasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < now).length;
    const total = pTasks.length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div onClick={onClick} style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', transition: 'all 0.18s ease',
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
            }}>
            {/* Gradient accent top */}
            <div style={{ height: '3px', background: cfg.grad, flexShrink: 0 }} />

            <div style={{ padding: '20px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Briefcase size={18} style={{ color: cfg.color }} />
                    </div>
                    <span style={{
                        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: '99px'
                    }}>{cfg.label}</span>
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>
                    {project.name}
                </h3>
                {project.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px',
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {project.description}
                    </p>
                )}

                {project.companies?.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                        <Building2 size={11} /> {project.companies.name}
                    </div>
                )}

                {/* Progress bar */}
                {total > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                            <span>{progress}% complete</span><span>{done}/{total} tasks</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--surface-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: cfg.grad, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                        </div>
                    </div>
                )}

                {/* Task metrics row */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    {[
                        { v: active, icon: <Activity size={11} />, label: 'Active', c: active > 0 ? 'var(--info)' : 'var(--text-muted)' },
                        { v: overdue, icon: <AlertTriangle size={11} />, label: 'Overdue', c: overdue > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                    ].map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: m.c, fontWeight: 600 }}>
                            {m.icon} {m.v} {m.label}
                        </div>
                    ))}
                    <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto', alignSelf: 'center' }} />
                </div>
            </div>
        </div>
    );
}

// ─── Project Detail (War-Room View) ─────────────────────────────────
function ProjectDetail({ project, tasks, teams, users, profile, onBack, onRefresh }) {
    const [showDeployTask, setShowDeployTask] = useState(false);
    const [tab, setTab] = useState('all'); // all | todo | in_progress | done
    const [editStatus, setEditStatus] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const canEdit = ['managing_director', 'admin', 'ceo', 'manager'].includes(profile.role);
    const isClient = profile.role === 'client';
    const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

    const now = new Date();

    // Tasks scoped to this project's company
    const projectTasks = tasks.filter(t => t.assigned_company_id === project.company_id);
    const active = projectTasks.filter(t => t.status === 'in_progress');
    const pending = projectTasks.filter(t => t.status === 'todo');
    const done = projectTasks.filter(t => t.status === 'done');
    const overdue = projectTasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < now);

    // Health
    let health = '🟢 Healthy'; let healthColor = 'var(--success)';
    if (overdue.length > 0) { health = '🟡 Delayed'; healthColor = 'var(--warning)'; }
    if (overdue.length > projectTasks.length * 0.3 && projectTasks.length > 2) { health = '🔴 Critical'; healthColor = 'var(--danger)'; }

    // Teams scoped to company
    const projectTeams = teams.filter(t => t.company_id === project.company_id);

    // Filtered task list based on tab
    const tabTasks = tab === 'all' ? projectTasks
        : tab === 'todo' ? pending
        : tab === 'in_progress' ? active
        : done;

    // Activity timeline (tasks by created_at)
    const recentActivity = [...projectTasks]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6);

    const alerts = [];
    if (overdue.length > 0) alerts.push({ type: 'danger', msg: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} need attention` });
    if (projectTeams.filter(t => !t.manager_id).length > 0) alerts.push({ type: 'warning', msg: `${projectTeams.filter(t=>!t.manager_id).length} team(s) without a lead` });
    if (projectTasks.length === 0) alerts.push({ type: 'warning', msg: 'No tasks deployed to this project yet' });

    const handleStatusChange = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await updateProject(project.id, { status: newStatus });
            toast.success('Status updated');
            onRefresh();
            setEditStatus(false);
        } catch {
            toast.error('Failed to update status');
        } finally { setUpdatingStatus(false); }
    };

    const timeAgo = (d) => {
        const diff = Date.now() - new Date(d).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    };

    return (
        <div style={{ animation: 'fade-in 0.25s ease-out' }}>
            {/* Back */}
            <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '24px', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                <ArrowLeft size={14} /> Back to Projects
            </button>

            {/* ── HEADER ── */}
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px'
            }}>
                <div style={{ height: '4px', background: cfg.grad }} />
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Briefcase size={22} style={{ color: cfg.color }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                                    {project.name}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    {project.companies?.name && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building2 size={12} />{project.companies.name}</span>}
                                    {project.client_projects?.length > 0 && <span>👤 {project.client_projects.length} client(s)</span>}
                                </div>
                            </div>
                        </div>
                        {project.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6 }}>
                                {project.description}
                            </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Health:</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: healthColor }}>{health}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    {!isClient && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            {canEdit && (
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => setEditStatus(v => !v)}
                                        style={{ fontSize: '0.75rem', borderColor: cfg.color, color: cfg.color }}
                                    >
                                        {cfg.label} ▾
                                    </button>
                                    {editStatus && (
                                        <div style={{
                                            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                                            background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
                                            borderRadius: 'var(--radius-md)', overflow: 'hidden', minWidth: '150px',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                                        }}>
                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                <button key={k} onClick={() => handleStatusChange(k)}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', background: 'none',
                                                        border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem',
                                                        color: k === project.status ? v.color : 'var(--text-secondary)',
                                                        fontWeight: k === project.status ? 700 : 400,
                                                        borderBottom: '1px solid var(--border-default)'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-subtle)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <button className="btn btn-primary" onClick={() => setShowDeployTask(true)}>
                                <Plus size={16} /> Deploy Task
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── EXECUTION SNAPSHOT ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                {[
                    { label: 'Active Tasks', val: active.length, color: 'var(--info)', showBorder: active.length > 0 },
                    { label: 'Pending Start', val: pending.length, color: 'var(--warning)', showBorder: pending.length > 0 },
                    { label: 'Completed', val: done.length, color: 'var(--success)', showBorder: false },
                    { label: 'Overdue', val: overdue.length, color: 'var(--danger)', showBorder: overdue.length > 0 },
                ].map((m, i) => (
                    <div key={i} style={{
                        background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
                        borderLeft: m.showBorder ? `3px solid ${m.color}` : '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)', padding: '16px'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.val}</div>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>{m.label}</div>
                    </div>
                ))}
            </div>

            {/* ── 2-COLUMN MAIN LAYOUT ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }}>

                {/* LEFT: Teams + Task Board */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Teams Involved */}
                    {!isClient && projectTeams.length > 0 && (
                        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                <Users2 size={15} /> Execution Teams
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {projectTeams.map(t => {
                                    const lead = users.find(u => u.id === t.manager_id);
                                    const memberCount = t.team_members?.length || 0;
                                    const tTasks = projectTasks.filter(tsk => tsk.assigned_teams?.includes(t.id));
                                    return (
                                        <div key={t.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px 14px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Target size={14} style={{ color: 'var(--accent-primary)' }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                        {lead ? lead.full_name : '⚠ No lead'} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--info)' }}>
                                                {tTasks.filter(x => x.status !== 'done').length} active
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Task Board */}
                    <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', margin: 0 }}>
                                <Activity size={15} /> Task Execution Board
                            </h4>
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-subtle)', borderRadius: '8px', padding: '3px' }}>
                                {[['all','All'],['todo','Pending'],['in_progress','Active'],['done','Done']].map(([k,l]) => (
                                    <button key={k} onClick={() => setTab(k)} style={{
                                        padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.15s',
                                        background: tab === k ? 'var(--surface-elevated)' : 'transparent',
                                        color: tab === k ? 'var(--text-primary)' : 'var(--text-muted)',
                                        boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    }}>{l}</button>
                                ))}
                            </div>
                        </div>

                        {tabTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No tasks in this state.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
                                {tabTasks.map(tsk => {
                                    const isOvrd = tsk.status !== 'done' && tsk.due_date && new Date(tsk.due_date) < now;
                                    const stCfg = tsk.status === 'done' ? { c: 'var(--success)', l: 'Done' }
                                        : tsk.status === 'in_progress' ? { c: 'var(--info)', l: 'Active' }
                                        : { c: 'var(--warning)', l: 'Pending' };
                                    return (
                                        <div key={tsk.id} style={{
                                            padding: '13px 15px',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--surface-subtle)',
                                            borderLeft: `3px solid ${isOvrd ? 'var(--danger)' : stCfg.c}`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isOvrd ? 'var(--danger)' : 'var(--text-primary)', flex: 1, marginRight: '10px' }}>
                                                    {tsk.title}
                                                </div>
                                                <span style={{
                                                    fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
                                                    background: isOvrd ? 'rgba(239,68,68,0.12)' : 'transparent',
                                                    color: isOvrd ? 'var(--danger)' : stCfg.c,
                                                    fontWeight: 700, padding: isOvrd ? '2px 6px' : '0', borderRadius: '4px'
                                                }}>
                                                    {isOvrd ? 'OVERDUE' : stCfg.l}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '14px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                {tsk.assigned_profiles?.length > 0 && <span>👤 {tsk.assigned_profiles.length} assignee{tsk.assigned_profiles.length > 1 ? 's' : ''}</span>}
                                                {tsk.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Calendar size={10} /> {new Date(tsk.due_date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Alerts + Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Alerts */}
                    {alerts.length > 0 && (
                        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={15} /> Alerts
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {alerts.map((a, i) => (
                                    <div key={i} style={{ fontSize: '0.8rem', fontWeight: 600, color: a.type === 'danger' ? 'var(--danger)' : 'var(--warning)', display: 'flex', gap: '8px' }}>
                                        <span>•</span>{a.msg}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <Clock size={15} /> Activity Timeline
                        </h4>
                        {recentActivity.length === 0 ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '20px 0' }}>No activity yet.</div>
                        ) : (
                            <div style={{ position: 'relative', paddingLeft: '20px' }}>
                                <div style={{ position: 'absolute', left: '6px', top: 0, bottom: 0, width: '1px', background: 'var(--border-default)' }} />
                                {recentActivity.map((ra, idx) => (
                                    <div key={ra.id} style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute', left: '-17px', top: '4px',
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: ra.status === 'done' ? 'var(--success)' : 'var(--accent-primary)',
                                            border: '2px solid var(--surface-elevated)'
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                Task deployed: <strong>{ra.title}</strong>
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                                {timeAgo(ra.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Client-facing summary */}
                    {!isClient && project.client_projects?.length > 0 && (
                        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={15} /> Client Summary
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{done.length}</div>
                                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '4px' }}>Delivered</div>
                                </div>
                                <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--info)' }}>
                                        {projectTasks.length > 0 ? `${Math.round(done.length / projectTasks.length * 100)}%` : '—'}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '4px' }}>Progress</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showDeployTask && (
                <DeployTaskModal
                    project={project} teams={teams} users={users} profile={profile}
                    onClose={() => setShowDeployTask(false)} onSaved={onRefresh}
                />
            )}
        </div>
    );
}

// ─── Main Projects Page ──────────────────────────────────────────────
export default function ProjectsPage() {
    const { profile } = useAuth();
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const canCreate = ['managing_director', 'admin', 'ceo'].includes(profile.role);
    const isClient = profile.role === 'client';

    const loadData = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                getProjects(), getTasks(), getTeams(), getUsers(), getCompanies()
            ]);
            if (results[0].status === 'fulfilled') setProjects(extractData(results[0].value.data));
            if (results[1].status === 'fulfilled') setTasks(extractData(results[1].value.data));
            if (results[2].status === 'fulfilled') setTeams(extractData(results[2].value.data));
            if (results[3].status === 'fulfilled') setUsers(extractData(results[3].value.data));
            if (results[4].status === 'fulfilled') setCompanies(extractData(results[4].value.data));
        } catch { toast.error('Failed to load projects'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const filteredProjects = useMemo(() => {
        let list = [...projects];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
        }
        if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus);
        return list;
    }, [projects, search, filterStatus]);

    const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <Loader2 size={28} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading Projects...</div>
        </div>
    );

    // ── DETAIL VIEW ──
    if (activeProject) return (
        <>
            <Toaster toastOptions={{ style: { background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' } }} />
            <ProjectDetail
                project={activeProject} tasks={tasks} teams={teams} users={users} profile={profile}
                onBack={() => setActiveProjectId(null)} onRefresh={loadData}
            />
        </>
    );

    // ── GRID VIEW ──
    return (
        <div style={{ animation: 'fade-in 0.25s ease-out' }}>
            <Toaster toastOptions={{ style: { background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' } }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <div className="page-title">Projects</div>
                    <div className="page-subtitle">{isClient ? 'Your assigned projects' : 'Live execution across ventures'}</div>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> New Project
                    </button>
                )}
            </div>

            {/* Summary strip */}
            {projects.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '12px', marginBottom: '24px' }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                        const count = projects.filter(p => p.status === k).length;
                        return (
                            <div key={k} onClick={() => setFilterStatus(f => f === k ? 'all' : k)} style={{
                                background: 'var(--surface-elevated)', border: `1px solid ${filterStatus === k ? v.color : 'var(--border-default)'}`,
                                borderRadius: 'var(--radius-md)', padding: '14px 16px', cursor: 'pointer',
                                transition: 'all 0.15s', userSelect: 'none',
                                borderLeft: `3px solid ${v.color}`
                            }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: v.color, lineHeight: 1 }}>{count}</div>
                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '5px', fontWeight: 600 }}>{v.label}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Search + Filter */}
            {projects.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="form-input" placeholder="Search projects..." value={search}
                            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px' }} />
                    </div>
                </div>
            )}

            {/* Content */}
            {projects.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: '14px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Briefcase size={34} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No projects yet</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '340px', lineHeight: 1.6 }}>
                        {isClient ? 'No projects have been assigned to you yet.' : 'Projects connect your teams, tasks, and clients into a unified execution engine.'}
                    </div>
                    {canCreate && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: '8px' }}>
                            <Plus size={16} /> Create First Project
                        </button>
                    )}
                </div>
            ) : filteredProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No projects match your search.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {filteredProjects.map(p => (
                        <ProjectCard key={p.id} project={p} tasks={tasks} onClick={() => setActiveProjectId(p.id)} />
                    ))}
                </div>
            )}

            {showModal && (
                <CreateProjectModal companies={companies} profile={profile}
                    onClose={() => setShowModal(false)} onSaved={loadData} />
            )}
        </div>
    );
}
