import { useEffect, useState, useRef } from 'react';
import {
    getTasks, createTask, updateTask, deleteTask,
    getTeams, getUsers, getCompanies,
    getTaskComments, addTaskComment, getTaskActivity, extractData,
    getTaskApprovals, requestApproval, resolveApproval,
    getTaskFiles, attachFileMetadata, deleteTaskFile
} from '../../api';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import {
    Plus, Trash2, X, Loader2, Calendar, Target, Activity,
    CheckSquare, Users, Building, Shield, Clock, Video,
    ChevronRight, MessageSquare, AlertTriangle, CheckCircle2,
    ArrowLeft, Send, History, Lock, Unlock,
    Paperclip, File, Download, UploadCloud, FileText, Stamp
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── Constants ──────────────────────────────────────────────────────
const STATUSES = ['todo', 'in_progress', 'done'];
const STATUS_META = {
    todo:        { label: 'Pending',  color: 'var(--warning)',  bg: 'rgba(245,158,11,0.12)',  grad: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
    in_progress: { label: 'Active',   color: 'var(--info)',     bg: 'rgba(59,130,246,0.12)',  grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
    done:        { label: 'Resolved', color: 'var(--success)',  bg: 'rgba(34,197,94,0.12)',   grad: 'linear-gradient(135deg,#10B981,#22C55E)' },
};
const CAN_CREATE = ['managing_director', 'ceo', 'manager', 'admin'];
const ROLES = ['managing_director', 'ceo', 'manager', 'intern', 'client', 'admin'];
const ROLE_LABELS = { managing_director: 'MD', ceo: 'CEO', manager: 'Manager', intern: 'Intern', client: 'Client', admin: 'Admin' };

// ─── Helpers ─────────────────────────────────────────────────────────
const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const Avatar = ({ name, size = 32, style = {} }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--accent-primary), #8B5CF6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: `${size * 0.32}px`, fontWeight: 800, color: '#fff', ...style
    }}>
        {name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?'}
    </div>
);

// ─── Add Task Modal (multi-layer assignment) ─────────────────────────
function AddTaskModal({ teams, users, companies, onClose, onAdded }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignmentMode, setAssignmentMode] = useState('individual');
    const [selCompany, setSelCompany] = useState(profile?.company_id || '');
    const [selTeams, setSelTeams] = useState([]);
    const [selRoles, setSelRoles] = useState([]);
    const [selIndividuals, setSelIndividuals] = useState([]);
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [scheduleMeeting, setScheduleMeeting] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('');

    const toggle = (val, arr, setter) => {
        setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
    };

    const isValid = title.trim().length > 0 && dueDate && dueTime && (
        assignmentMode === 'company' ? !!selCompany :
        assignmentMode === 'team' ? selTeams.length > 0 && !!selCompany :
        assignmentMode === 'role' ? selRoles.length > 0 && !!selCompany :
        selIndividuals.length > 0
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid) return toast.error('Complete all required fields');
        setLoading(true);
        try {
            const payload = {
                title, description, status: 'todo',
                due_date: new Date(`${dueDate}T${dueTime}`).toISOString(),
                assigned_company_id: ['company','team','role'].includes(assignmentMode) ? selCompany : null,
                assigned_teams: assignmentMode === 'team' ? selTeams : [],
                assigned_roles: assignmentMode === 'role' ? selRoles : [],
                assigned_profiles: assignmentMode === 'individual' ? selIndividuals : [],
                meeting_info: scheduleMeeting && meetingTitle ? { title: meetingTitle } : null,
            };
            await createTask(payload);
            toast.success('Task deployed');
            onAdded(); onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to deploy task');
        } finally { setLoading(false); }
    };

    const modeBtn = (mode, label) => (
        <button type="button" onClick={() => { setAssignmentMode(mode); setSelTeams([]); setSelRoles([]); setSelIndividuals([]); }}
            style={{
                flex: 1, padding: '8px 4px', border: '1px solid', cursor: 'pointer', borderRadius: '8px',
                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                transition: 'all 0.15s',
                borderColor: assignmentMode === mode ? 'var(--accent-primary)' : 'var(--border-default)',
                background: assignmentMode === mode ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                color: assignmentMode === mode ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}>{label}</button>
    );

    const filteredTeams = teams.filter(t => !selCompany || t.company_id === selCompany);
    const filteredUsers = users.filter(u => !['client'].includes(u.role));

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderTop: '3px solid var(--accent-primary)' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Deploy Task</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Title */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Task Title *</label>
                        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be executed?" required autoFocus />
                    </div>

                    {/* Description */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Directive / Description</label>
                        <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Detailed instructions, requirements, success criteria..." style={{ minHeight: '80px' }} />
                    </div>

                    {/* Deadline */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Deadline Date *</label>
                            <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Deadline Time *</label>
                            <input type="time" className="form-input" value={dueTime} onChange={e => setDueTime(e.target.value)} />
                        </div>
                    </div>

                    {/* Assignment Mode */}
                    <div>
                        <label className="form-label">Execution Target</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            {modeBtn('company', 'Company')}
                            {modeBtn('team', 'Team')}
                            {modeBtn('role', 'Role')}
                            {modeBtn('individual', 'Direct')}
                        </div>

                        {/* Company picker (for non-individual modes) */}
                        {assignmentMode !== 'individual' && (
                            <div className="form-group" style={{ marginBottom: '10px' }}>
                                <label className="form-label">Company</label>
                                <select className="form-select" value={selCompany} onChange={e => { setSelCompany(e.target.value); setSelTeams([]); }} required>
                                    <option value="">Select company</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Teams */}
                        {assignmentMode === 'team' && filteredTeams.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {filteredTeams.map(t => (
                                    <button key={t.id} type="button" onClick={() => toggle(t.id, selTeams, setSelTeams)}
                                        style={{ padding: '6px 12px', borderRadius: '99px', border: '1px solid', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s',
                                            borderColor: selTeams.includes(t.id) ? 'var(--accent-primary)' : 'var(--border-default)',
                                            background: selTeams.includes(t.id) ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                                            color: selTeams.includes(t.id) ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Roles */}
                        {assignmentMode === 'role' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {ROLES.map(r => (
                                    <button key={r} type="button" onClick={() => toggle(r, selRoles, setSelRoles)}
                                        style={{ padding: '6px 12px', borderRadius: '99px', border: '1px solid', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s',
                                            borderColor: selRoles.includes(r) ? 'var(--accent-primary)' : 'var(--border-default)',
                                            background: selRoles.includes(r) ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                                            color: selRoles.includes(r) ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                        {ROLE_LABELS[r]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Individuals */}
                        {assignmentMode === 'individual' && (
                            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {filteredUsers.map(u => (
                                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                                        background: selIndividuals.includes(u.id) ? 'color-mix(in srgb, var(--accent-primary) 8%, transparent)' : 'var(--surface-subtle)' }}>
                                        <input type="checkbox" checked={selIndividuals.includes(u.id)}
                                            onChange={() => toggle(u.id, selIndividuals, setSelIndividuals)}
                                            style={{ accentColor: 'var(--accent-primary)' }} />
                                        <Avatar name={u.full_name} size={26} />
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Meeting toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
                        <input type="checkbox" checked={scheduleMeeting} onChange={e => setScheduleMeeting(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)' }} />
                        <Video size={14} /> Attach meeting sync
                    </label>
                    {scheduleMeeting && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Meeting Topic</label>
                            <input className="form-input" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="e.g. Sprint kickoff" />
                        </div>
                    )}

                    <div className="modal-footer" style={{ paddingTop: '8px' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !isValid} style={{ minWidth: '130px' }}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={16} /> Deploy</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Task Detail Panel (War-Room) ────────────────────────────────────
function TaskDetail({ task, allUsers, allTeams, allCompanies, profile, onBack, onRefresh }) {
    const [comments, setComments] = useState([]);
    const [activity, setActivity] = useState([]);
    const [files, setFiles] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [blocking, setBlocking] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [blockReason, setBlockReason] = useState('');
    const [showBlockInput, setShowBlockInput] = useState(false);
    const [loadingMeta, setLoadingMeta] = useState(true);
    const commentRef = useRef(null);
    const fileInputRef = useRef(null);

    const isClient = profile.role === 'client';
    const canEdit = CAN_CREATE.includes(profile.role) || (task.assigned_profiles || []).includes(profile.id);
    const canManage = ['managing_director', 'admin', 'ceo', 'manager'].includes(profile.role);
    const isOverdue = task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date();
    const cfg = STATUS_META[task.status] || STATUS_META.todo;

    const assignedUsers = (task.assigned_profiles || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);
    const assignedTeams = (task.assigned_teams || []).map(id => allTeams.find(t => t.id === id)).filter(Boolean);
    const assignedRoles = task.assigned_roles || [];
    const company = allCompanies.find(c => c.id === task.assigned_company_id);

    useEffect(() => {
        setLoadingMeta(true);
        Promise.allSettled([
            getTaskComments(task.id), 
            getTaskActivity(task.id),
            getTaskFiles(task.id),
            getTaskApprovals(task.id)
        ]).then(([c, a, f, ap]) => {
            if (c.status === 'fulfilled') setComments(c.value.data || []);
            if (a.status === 'fulfilled') setActivity(a.value.data || []);
            if (f.status === 'fulfilled') setFiles(f.value.data || []);
            if (ap.status === 'fulfilled') setApprovals(ap.value.data || []);
        }).finally(() => setLoadingMeta(false));
    }, [task.id]);

    const handleStatusChange = async (newStatus) => {
        if (newStatus === 'done' && profile.role === 'intern') {
            return toast.error('Interns require manager approval to resolve tasks.');
        }
        setUpdatingStatus(true);
        try {
            await updateTask(task.id, { status: newStatus });
            toast.success('Status updated');
            onRefresh();
        } catch { toast.error('Failed to update'); }
        finally { setUpdatingStatus(false); }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setPostingComment(true);
        try {
            const { data } = await addTaskComment(task.id, { content: newComment });
            setComments(c => [...c, data]);
            setNewComment('');
            setTimeout(() => commentRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch { toast.error('Failed to post comment'); }
        finally { setPostingComment(false); }
    };

    const handleBlock = async () => {
        setBlocking(true);
        try {
            await updateTask(task.id, { is_blocked: !task.is_blocked, block_reason: task.is_blocked ? null : blockReason });
            toast.success(task.is_blocked ? 'Task unblocked' : 'Task marked as blocked');
            setShowBlockInput(false);
            onRefresh();
        } catch { toast.error('Failed to update blocker'); }
        finally { setBlocking(false); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploading(true);
        try {
            // 1. Upload to Supabase Storage
            const ext = file.name.split('.').pop();
            const fileName = `${task.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            
            const { error: uploadError } = await supabase.storage
                .from('task-attachments')
                .upload(fileName, file);
                
            if (uploadError) throw uploadError;

            // 2. Register metadata
            const { data } = await attachFileMetadata(task.id, {
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                storage_path: fileName
            });

            setFiles(f => [data, ...f]);
            toast.success('File attached');
        } catch (err) {
            console.error('Upload Error:', err);
            toast.error('Failed to attach file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileDelete = async (fileId, storagePath) => {
        if (!window.confirm('Delete this attachment?')) return;
        try {
            // Remove from DB first
            await deleteTaskFile(task.id, fileId);
            setFiles(f => f.filter(x => x.id !== fileId));
            
            // Background storage clear
            supabase.storage.from('task-attachments').remove([storagePath]).catch(console.error);
            toast.success('Attachment removed');
        } catch { toast.error('Failed to remove attachment'); }
    };

    const handleRequestApproval = async () => {
        const reviewerId = task.assigned_company_id ? undefined : null; // Logic extension for specific routing
        setApprovalLoading(true);
        try {
            const { data } = await requestApproval(task.id, { reviewer_id: null, notes: 'Ready for review' });
            setApprovals(a => [data, ...a]);
            toast.success('Approval requested sent');
            onRefresh(); // Trigger parent refresh to update status markers
        } catch { toast.error('Failed to request approval'); }
        finally { setApprovalLoading(false); }
    };

    const handleResolveApproval = async (approvalId, status) => {
        setApprovalLoading(true);
        try {
            const { data } = await resolveApproval(task.id, approvalId, { status, notes: '' });
            setApprovals(a => a.map(x => x.id === approvalId ? data : x));
            toast.success(`Task ${status}`);
            onRefresh();
        } catch { toast.error(`Failed to ${status} task`); }
        finally { setApprovalLoading(false); }
    };

    const Section = ({ title, icon, children }) => (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '22px', marginBottom: '0' }}>
            <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                {icon} {title}
            </h4>
            {children}
        </div>
    );

    return (
        <div style={{ animation: 'fade-in 0.25s ease-out' }}>
            {/* Back */}
            <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '20px', fontSize: '0.75rem' }}>
                <ArrowLeft size={14} /> All Tasks
            </button>

            {/* ── HEADER ── */}
            <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ height: '4px', background: task.is_blocked ? 'var(--danger)' : (isOverdue ? 'linear-gradient(90deg,#EF4444,#F59E0B)' : cfg.grad) }} />
                <div style={{ padding: '24px' }}>
                    {/* Blocker alert */}
                    {task.is_blocked && (
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                            <Lock size={14} /> BLOCKED{task.block_reason ? `: ${task.block_reason}` : ''}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '10px', lineHeight: 1.3 }}>
                                {task.title}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: cfg.color, background: cfg.bg, padding: '4px 10px', borderRadius: '99px' }}>
                                    {cfg.label}
                                </span>
                                {task.due_date && (
                                    <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                                        <Calendar size={12} />
                                        {new Date(task.due_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        {isOverdue && <span style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 800 }}>OVERDUE</span>}
                                    </span>
                                )}
                                {task.meeting_info && (
                                    <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--info)' }}>
                                        <Video size={12} /> {task.meeting_info.title || 'Meeting scheduled'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status controls */}
                        {canEdit && !isClient && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                {STATUSES.map(s => (
                                    s !== task.status && (
                                        <button key={s} className="btn btn-ghost" onClick={() => handleStatusChange(s)}
                                            disabled={updatingStatus}
                                            style={{ fontSize: '0.72rem', borderColor: STATUS_META[s].color, color: STATUS_META[s].color, padding: '6px 14px' }}>
                                            → {STATUS_META[s].label}
                                        </button>
                                    )
                                ))}
                                {canManage && (
                                    <button className="btn btn-ghost" onClick={() => setShowBlockInput(v => !v)}
                                        style={{ fontSize: '0.72rem', borderColor: task.is_blocked ? 'var(--success)' : 'var(--danger)', color: task.is_blocked ? 'var(--success)' : 'var(--danger)', padding: '6px 14px' }}>
                                        {task.is_blocked ? <><Unlock size={12} /> Unblock</> : <><Lock size={12} /> Block</>}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Block reason input */}
                    {showBlockInput && !task.is_blocked && (
                        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                            <input className="form-input" placeholder="Reason for blocking..." value={blockReason}
                                onChange={e => setBlockReason(e.target.value)} style={{ flex: 1 }} />
                            <button className="btn btn-danger" onClick={handleBlock} disabled={blocking} style={{ whiteSpace: 'nowrap' }}>
                                {blocking ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm Block'}
                            </button>
                        </div>
                    )}
                    {showBlockInput && task.is_blocked && (
                        <div style={{ marginTop: '14px' }}>
                            <button className="btn btn-ghost" onClick={handleBlock} disabled={blocking}
                                style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                                {blocking ? <Loader2 size={14} /> : <><Unlock size={14} /> Confirm Unblock</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2-COLUMN LAYOUT ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '20px', alignItems: 'start' }}>

                {/* LEFT: Directive + Comments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Directive */}
                    {task.description && (
                        <Section title="Execution Directive" icon={<CheckSquare size={14} />}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                {task.description}
                            </div>
                        </Section>
                    )}

                    {/* Files & Attachments */}
                    <Section title={`Attachments (${files.length})`} icon={<Paperclip size={14} />}>
                        {canEdit && !isClient && (
                            <div style={{ marginBottom: '16px' }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    style={{ width: '100%', border: '1px dashed var(--border-default)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}
                                >
                                    {uploading ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={24} />}
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{uploading ? 'Uploading securely...' : 'Click to attach files'}</span>
                                </button>
                            </div>
                        )}
                        
                        {files.length === 0 && !uploading ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No files attached yet.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {files.map(f => (
                                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{f.file_name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{(f.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                    <span>•</span>
                                                    <span>{f.uploader?.full_name || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => window.open(`${supabase.storage.from('task-attachments').getPublicUrl(f.storage_path).data.publicUrl}`, '_blank')} title="Download">
                                                <Download size={16} />
                                            </button>
                                            {canEdit && !isClient && (
                                                <button className="btn btn-icon btn-ghost" onClick={() => handleFileDelete(f.id, f.storage_path)} title="Delete" style={{ color: 'var(--danger)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* Comments */}
                    {!isClient && (
                        <Section title={`Discussion (${comments.length})`} icon={<MessageSquare size={14} />}>
                            {loadingMeta ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                                </div>
                            ) : comments.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 0' }}>No discussion yet. Start the conversation.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '360px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                                    {comments.map(c => (
                                        <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <Avatar name={c.profiles?.full_name} size={30} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.profiles?.full_name || 'User'}</span>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '10px', lineHeight: 1.6 }}>
                                                    {c.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={commentRef} />
                                </div>
                            )}

                            <form onSubmit={handleComment} style={{ display: 'flex', gap: '8px' }}>
                                <input className="form-input" value={newComment} onChange={e => setNewComment(e.target.value)}
                                    placeholder="Add a comment..." style={{ flex: 1 }} />
                                <button type="submit" className="btn btn-primary" disabled={postingComment || !newComment.trim()} style={{ padding: '10px 14px' }}>
                                    {postingComment ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                                </button>
                            </form>
                        </Section>
                    )}

                    {/* Client simplified view */}
                    {isClient && task.description && (
                        <Section title="Deliverable Brief" icon={<CheckCircle2 size={14} />}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{task.description}</div>
                            <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                                <div style={{ padding: '12px 16px', background: 'var(--surface-subtle)', borderRadius: '8px', textAlign: 'center', flex: 1 }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>Current State</div>
                                </div>
                            </div>
                        </Section>
                    )}
                </div>

                {/* RIGHT: Status + Assignment + Activity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Execution State Panel */}
                    <Section title="Execution State" icon={<Activity size={14} />}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { label: 'Status', val: cfg.label, color: cfg.color },
                                { label: 'Created', val: new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), color: null },
                                { label: 'Deadline', val: task.due_date ? new Date(task.due_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—', color: isOverdue ? 'var(--danger)' : null },
                                { label: 'State', val: task.is_blocked ? '🔴 Blocked' : task.status === 'done' ? '✅ Complete' : isOverdue ? '⚠️ Overdue' : '🟢 Running', color: null },
                            ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: row.color || 'var(--text-primary)' }}>{row.val}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Task Governance (Approvals) Phase 3 */}
                    {task.status !== 'done' && !isClient && (
                        <Section title="Governance" icon={<Shield size={14} />}>
                            {approvals.length > 0 && approvals[0].status === 'pending' ? (
                                <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 10px var(--warning)' }} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Approval Pending</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                                        {approvals[0].requester?.full_name} has requested permission to resolve this task.
                                    </div>
                                    {canManage ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-primary" onClick={() => handleResolveApproval(approvals[0].id, 'approved')} disabled={approvalLoading} style={{ flex: 1, padding: '8px' }}>
                                                {approvalLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckSquare size={14} /> Approve & Close</>}
                                            </button>
                                            <button className="btn btn-ghost" onClick={() => handleResolveApproval(approvals[0].id, 'rejected')} disabled={approvalLoading} style={{ flex: 1, padding: '8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                                <X size={14} /> Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting for manager review...</div>
                                    )}
                                </div>
                            ) : (
                                <button className="btn btn-ghost" onClick={handleRequestApproval} disabled={approvalLoading} style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', gap: '8px', border: '1px dashed var(--border-default)' }}>
                                    {approvalLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Stamp size={16} /> Request Resolution Approval</>}
                                </button>
                            )}

                            {/* Previous approvals history */}
                            {approvals.filter(a => a.status !== 'pending').length > 0 && (
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>History</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {approvals.filter(a => a.status !== 'pending').map(a => (
                                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                                                {a.status === 'approved' ? <CheckSquare size={14} style={{ color: 'var(--success)' }} /> : <X size={14} style={{ color: 'var(--danger)' }} />}
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    <strong style={{ color: 'var(--text-primary)' }}>{a.status}</strong> by {a.reviewer?.full_name || 'Manager'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Assignment Context */}
                    {!isClient && (
                        <Section title="Assignment Context" icon={<Users size={14} />}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {company && (
                                    <div>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>Company Scope</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            <Building size={13} style={{ color: 'var(--accent-primary)' }} /> {company.name}
                                        </div>
                                    </div>
                                )}
                                {assignedTeams.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>Teams</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {assignedTeams.map(t => (
                                                <span key={t.id} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}>
                                                    {t.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {assignedRoles.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>Roles</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {assignedRoles.map(r => (
                                                <span key={r} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
                                                    {ROLE_LABELS[r] || r}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {assignedUsers.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>Direct Assignments</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {assignedUsers.map(u => (
                                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Avatar name={u.full_name} size={28} />
                                                    <div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {!company && assignedTeams.length === 0 && assignedRoles.length === 0 && assignedUsers.length === 0 && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No explicit assignment context.</div>
                                )}
                            </div>
                        </Section>
                    )}

                    {/* Activity Timeline */}
                    {!isClient && (
                        <Section title="Activity Timeline" icon={<History size={14} />}>
                            {/* Always show created event */}
                            <div style={{ position: 'relative', paddingLeft: '18px' }}>
                                <div style={{ position: 'absolute', left: '5px', top: 0, bottom: 0, width: '1px', background: 'var(--border-default)' }} />
                                {[
                                    { action: 'created', detail: 'Task deployed', created_at: task.created_at, profiles: null },
                                    ...(activity || [])
                                ].map((a, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '14px', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute', left: '-14px', top: '5px',
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: a.action === 'created' ? 'var(--accent-primary)' :
                                                       a.action === 'commented' ? 'var(--info)' :
                                                       a.action === 'blocked' ? 'var(--danger)' : 'var(--success)',
                                            border: '2px solid var(--surface-elevated)'
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {a.profiles?.full_name && <strong>{a.profiles.full_name} </strong>}
                                                {a.detail || a.action}
                                            </div>
                                            <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: '3px' }}>{timeAgo(a.created_at)}</div>
                                        </div>
                                    </div>
                                ))}
                                {activity.length === 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 0' }}>No actions logged yet.</div>
                                )}
                            </div>
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Task Row (list item in board column) ────────────────────────────
function TaskRow({ task, profile, canDelete, onDelete, allUsers, allTeams, allCompanies, onClick }) {
    const isClient = profile.role === 'client';
    const isOverdue = task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date();
    const cfg = STATUS_META[task.status] || STATUS_META.todo;
    const assignedUsers = (task.assigned_profiles || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);

    return (
        <div onClick={onClick} style={{
            padding: '14px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
            borderLeft: `3px solid ${task.is_blocked ? 'var(--danger)' : cfg.color}`,
            cursor: 'pointer', transition: 'all 0.15s', marginBottom: '10px',
            display: 'flex', flexDirection: 'column', gap: '8px',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderLeftColor = task.is_blocked ? 'var(--danger)' : cfg.color; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isOverdue ? 'var(--danger)' : 'var(--text-primary)', lineHeight: 1.3, flex: 1 }}>
                    {task.is_blocked && <span style={{ fontSize: '0.6rem', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '1px 5px', borderRadius: '3px', marginRight: '6px', fontWeight: 800, verticalAlign: 'middle' }}>BLOCKED</span>}
                    {task.title}
                </div>
                {canDelete && (
                    <button className="btn btn-icon btn-ghost" style={{ flexShrink: 0, opacity: 0, transition: 'opacity 0.15s', padding: '4px', width: 'auto', height: 'auto' }}
                        onClick={e => { e.stopPropagation(); onDelete(task.id); }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                        <Trash2 size={13} color="var(--danger)" />
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Assigned avatars */}
                    {assignedUsers.slice(0, 3).map((u, i) => (
                        <Avatar key={u.id} name={u.full_name} size={22} style={{ marginLeft: i > 0 ? '-6px' : 0, border: '2px solid var(--surface-elevated)' }} />
                    ))}
                    {task.assigned_teams?.length > 0 && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Target size={10} /> {task.assigned_teams.length}t
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {task.meeting_info && <Video size={12} style={{ color: 'var(--info)' }} />}
                    {task.due_date && (
                        <span style={{ fontSize: '0.65rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: isOverdue ? 700 : 400 }}>
                            <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                    )}
                    <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
            </div>
        </div>
    );
}

// ─── Main Tasks Page ─────────────────────────────────────────────────
export default function TasksPage() {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [allCompanies, setAllCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTaskId, setActiveTaskId] = useState(null);

    const canCreate = CAN_CREATE.includes(profile.role);

    const loadData = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([getTasks(), getUsers(), getTeams(), getCompanies()]);
            if (results[0].status === 'fulfilled') setTasks(extractData(results[0].value.data));
            if (results[1].status === 'fulfilled') setAllUsers(extractData(results[1].value.data));
            if (results[2].status === 'fulfilled') setAllTeams(extractData(results[2].value.data));
            if (results[3].status === 'fulfilled') setAllCompanies(extractData(results[3].value.data));
        } catch { toast.error('Failed to load tasks'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleStatusChange = async (id, status) => {
        try {
            await updateTask(id, { status });
            setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t));
        } catch { toast.error('Failed to update'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this task permanently?')) return;
        try {
            await deleteTask(id);
            setTasks(ts => ts.filter(t => t.id !== id));
            toast.success('Task deleted');
        } catch { toast.error('Delete failed'); }
    };

    const tasksByStatus = STATUSES.reduce((acc, s) => {
        acc[s] = tasks.filter(t => t.status === s);
        return acc;
    }, {});

    const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <Loader2 size={28} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading Tasks...</div>
        </div>
    );

    // ── DETAIL VIEW ──
    if (activeTask) return (
        <>
            <Toaster toastOptions={{ style: { background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' } }} />
            <TaskDetail
                task={activeTask} allUsers={allUsers} allTeams={allTeams} allCompanies={allCompanies}
                profile={profile}
                onBack={() => setActiveTaskId(null)}
                onRefresh={() => { loadData(); setActiveTaskId(null); }}
            />
        </>
    );

    // ── BOARD VIEW ──
    return (
        <div style={{ animation: 'fade-in 0.25s ease-out' }}>
            <Toaster toastOptions={{ style: { background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' } }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <div className="page-title">Tasks</div>
                    <div className="page-subtitle">Operational execution pipeline</div>
                </div>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Deploy Task
                    </button>
                )}
            </div>

            {/* Summary strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {STATUSES.map(s => {
                    const m = STATUS_META[s];
                    const now = new Date();
                    const overdue = tasksByStatus[s].filter(t => s !== 'done' && t.due_date && new Date(t.due_date) < now).length;
                    return (
                        <div key={s} style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${m.color}`, borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1 }}>{tasksByStatus[s].length}</div>
                                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '5px', fontWeight: 600 }}>{m.label}</div>
                                </div>
                                {overdue > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '3px 7px', borderRadius: '99px' }}>⚠ {overdue} overdue</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 3-column board */}
            {tasks.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', gap: '14px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckSquare size={30} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No tasks deployed</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px', lineHeight: 1.6 }}>
                        The execution pipeline is empty. Deploy the first task to begin operations.
                    </div>
                    {canCreate && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: '8px' }}>
                            <Plus size={16} /> Deploy First Task
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
                    {STATUSES.map(status => {
                        const m = STATUS_META[status];
                        return (
                            <div key={status}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: `2px solid ${m.color}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-primary)' }}>{m.label}</span>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-subtle)', padding: '2px 8px', borderRadius: '99px' }}>
                                        {tasksByStatus[status].length}
                                    </span>
                                </div>
                                {tasksByStatus[status].length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Empty</span>
                                    </div>
                                ) : (
                                    tasksByStatus[status].map(task => (
                                        <TaskRow key={task.id} task={task} profile={profile}
                                            canDelete={canCreate} onDelete={handleDelete}
                                            allUsers={allUsers} allTeams={allTeams} allCompanies={allCompanies}
                                            onClick={() => setActiveTaskId(task.id)}
                                        />
                                    ))
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <AddTaskModal teams={allTeams} users={allUsers} companies={allCompanies}
                    onClose={() => setShowModal(false)} onAdded={loadData} />
            )}
        </div>
    );
}
