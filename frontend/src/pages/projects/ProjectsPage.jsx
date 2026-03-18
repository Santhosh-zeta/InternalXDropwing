import { useEffect, useState } from 'react';
import { getProjects, createProject, updateProject } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Loader2, Briefcase, ExternalLink } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const STATUS_OPTIONS = ['active', 'completed', 'on_hold'];

function ProjectModal({ onClose, onSaved }) {
    const { profile } = useAuth();
    const [form, setForm] = useState({ name: '', description: '', status: 'active' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createProject(form);
            toast.success('Project created!');
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">New Project</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} id="project-form">
                    <div className="form-group">
                        <label className="form-label">Project Name</label>
                        <input id="project-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea id="project-desc" className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: '80px' }} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select id="project-status" className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="project-submit" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} /> : <Briefcase size={16} />} Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const { profile } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const { data } = await getProjects();
            setProjects(data);
        } catch {
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProjects(); }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateProject(id, { status });
            setProjects(projects.map((p) => p.id === id ? { ...p, status } : p));
            toast.success('Status updated');
        } catch {
            toast.error('Failed to update');
        }
    };

    const canCreate = ['managing_director', 'ceo'].includes(profile.role);
    const canEdit = ['managing_director', 'ceo'].includes(profile.role);

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Projects</div>
                    <div className="page-subtitle">{profile.role === 'client' ? 'Your assigned projects' : 'Active company projects'}</div>
                </div>
                {canCreate && (
                    <button id="create-project-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> New Project
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : projects.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">💼</div>
                        <h3>No projects yet</h3>
                        <p>{profile.role === 'client' ? 'No projects have been assigned to you.' : 'Create your first project.'}</p>
                    </div>
                </div>
            ) : (
                <div className="grid-3">
                    {projects.map((p) => (
                        <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="flex justify-between items-start mb-md">
                                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                                    <Briefcase size={20} />
                                </div>
                                <span className={`badge badge-${p.status}`}>{p.status?.replace('_', ' ')}</span>
                            </div>
                            <h4 style={{ marginBottom: '6px' }}>{p.name}</h4>
                            {p.description && <p style={{ fontSize: '0.85rem', flex: 1 }}>{p.description}</p>}
                            {p.companies?.name && (
                                <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                    📍 {p.companies.name}
                                </div>
                            )}
                            {p.client_projects?.length > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                    👤 {p.client_projects.length} client(s)
                                </div>
                            )}
                            {canEdit && (
                                <select
                                    className="form-select"
                                    value={p.status}
                                    onChange={(e) => handleStatusUpdate(p.id, e.target.value)}
                                    style={{ marginTop: '14px', fontSize: '0.8rem', padding: '6px 10px' }}
                                >
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && <ProjectModal onClose={() => setShowModal(false)} onSaved={loadProjects} />}
        </div>
    );
}
