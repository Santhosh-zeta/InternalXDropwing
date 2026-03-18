import { useEffect, useState } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getTeams, getUsers } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const STATUSES = ['todo', 'in_progress', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const CAN_CREATE = ['managing_director', 'ceo', 'manager'];

function TaskCard({ task, canEdit, canDelete, onStatusChange, onDelete }) {
    return (
        <div className="task-card">
            <div className="flex justify-between items-start gap-sm">
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px' }}>{task.title}</div>
                    {task.description && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{task.description}</p>}
                    {task.assignee && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="avatar-fallback" style={{ width: '22px', height: '22px', fontSize: '0.6rem', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {task.assignee.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{task.assignee.full_name}</span>
                        </div>
                    )}
                    {task.due_date && (
                        <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            Due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                    )}
                </div>
                {canDelete && (
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => onDelete(task.id)} style={{ padding: '4px' }}>
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
            {canEdit && (
                <select
                    className="form-select"
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    style={{ marginTop: '10px', fontSize: '0.8rem', padding: '6px 10px' }}
                >
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
            )}
        </div>
    );
}

function AddTaskModal({ teams, users, onClose, onAdded }) {
    const [form, setForm] = useState({ title: '', description: '', assignee_id: '', team_id: '', due_date: '', status: 'todo' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createTask(form);
            toast.success('Task created!');
            onAdded();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Create Task</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} id="create-task-form">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input id="task-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea id="task-desc" className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: '70px' }} />
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Assignee</label>
                            <select id="task-assignee" className="form-select" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                                <option value="">Unassigned</option>
                                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Team</label>
                            <select id="task-team" className="form-select" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                                <option value="">No Team</option>
                                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Due Date</label>
                        <input id="task-due" type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="create-task-submit" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} /> : <Plus size={16} />} Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TasksPage() {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tasksRes, teamsRes] = await Promise.all([getTasks(), getTeams()]);
            let usersData = [];
            if (CAN_CREATE.includes(profile.role)) {
                try { const ur = await getUsers(); usersData = ur.data; } catch { }
            }
            setTasks(tasksRes.data);
            setTeams(teamsRes.data);
            setUsers(usersData);
        } catch {
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleStatusChange = async (id, status) => {
        try {
            await updateTask(id, { status });
            setTasks(tasks.map((t) => t.id === id ? { ...t, status } : t));
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this task?')) return;
        try {
            await deleteTask(id);
            toast.success('Task deleted');
            setTasks(tasks.filter((t) => t.id !== id));
        } catch {
            toast.error('Failed to delete task');
        }
    };

    const tasksByStatus = STATUSES.reduce((acc, s) => {
        acc[s] = tasks.filter((t) => t.status === s);
        return acc;
    }, {});

    const canEdit = true;
    const canCreate = CAN_CREATE.includes(profile.role);
    const canDelete = canCreate;

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Tasks</div>
                    <div className="page-subtitle">Track team progress with a Kanban board</div>
                </div>
                {canCreate && (
                    <button id="create-task-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Create Task
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : (
                <div className="task-columns">
                    {STATUSES.map((status) => (
                        <div key={status} className="task-column">
                            <div className="task-column-header">
                                <h4 style={{ fontSize: '0.9rem' }}>{STATUS_LABELS[status]}</h4>
                                <span style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                    {tasksByStatus[status].length}
                                </span>
                            </div>
                            {tasksByStatus[status].length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No tasks</div>
                            ) : (
                                tasksByStatus[status].map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        canEdit={canEdit}
                                        canDelete={canDelete}
                                        onStatusChange={handleStatusChange}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <AddTaskModal teams={teams} users={users} onClose={() => setShowModal(false)} onAdded={loadData} />
            )}
        </div>
    );
}
