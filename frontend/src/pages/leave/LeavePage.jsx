import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import api from '../../api/client';
import { Plane, Plus, X, Loader2, Check, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const STATUS_COLOR = { pending: 'var(--color-warning)', approved: 'var(--color-success)', rejected: 'var(--color-danger)' };

function ApplyModal({ onClose, onApplied }) {
    const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });
    const [loading, setLoading] = useState(false);
    const { profile } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('leave_requests').insert({
                ...form, user_id: profile.id, status: 'pending',
            });
            if (error) throw error;
            toast.success('Leave request submitted!');
            onApplied();
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Apply for Leave</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input id="leave-start" type="date" className="form-input" value={form.start_date}
                                onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input id="leave-end" type="date" className="form-input" value={form.end_date}
                                onChange={e => setForm({ ...form, end_date: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Reason</label>
                        <textarea className="form-textarea" value={form.reason}
                            onChange={e => setForm({ ...form, reason: e.target.value })}
                            placeholder="Brief reason for leave..." required />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="leave-submit" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Plane size={16} />}
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LeavePage() {
    const { profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const isManagerPlus = ['managing_director', 'admin', 'ceo', 'manager'].includes(profile?.role);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: mine } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false });
            setRequests(mine || []);

            if (isManagerPlus) {
                const { data: all } = await supabase
                    .from('leave_requests')
                    .select('*, user:profiles!leave_requests_user_id_fkey(full_name, company_id), reviewer:profiles!leave_requests_reviewed_by_fkey(full_name)')
                    .eq('status', 'pending')
                    .order('created_at');
                setAllRequests(all || []);
            }
        } finally { setLoading(false); }
    };

    useEffect(() => { if (profile) fetchData(); }, [profile]);

    const reviewRequest = async (id, status, userId, startDate, endDate) => {
        try {
            const { error } = await supabase.from('leave_requests').update({
                status,
                reviewed_by: profile.id,
                reviewed_at: new Date().toISOString(),
            }).eq('id', id);
            if (error) throw error;
            toast.success(`Leave ${status}`);

            // Trigger email notification via backend
            await api.post('/api/leave/notify', { leaveId: id, status }).catch(() => { });

            // Add notification for the user
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'leave_reviewed',
                message: `Your leave request from ${startDate} to ${endDate} was ${status}`,
                link: '/leave',
            }).catch(() => { });

            fetchData();
        } catch (err) { toast.error(err.message); }
    };

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Leave Management</div>
                    <div className="page-subtitle">Apply and manage time off requests</div>
                </div>
                <button id="apply-leave-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Apply for Leave
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : (
                <>
                    {/* Pending Approvals — managers only */}
                    {isManagerPlus && allRequests.length > 0 && (
                        <div className="card mb-xl">
                            <h4 style={{ marginBottom: '16px', color: 'var(--color-warning)' }}>⏳ Pending Approvals ({allRequests.length})</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {allRequests.map(r => (
                                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--color-bg)', borderRadius: '12px' }}>
                                        <div className="avatar-fallback avatar-sm" style={{ fontSize: '0.65rem' }}>
                                            {r.user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.user?.full_name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(r.start_date).toLocaleDateString('en-IN')} – {new Date(r.end_date).toLocaleDateString('en-IN')}
                                                {r.reason && ` · ${r.reason}`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-success)', borderColor: 'rgba(74,222,128,0.3)' }}
                                                onClick={() => reviewRequest(r.id, 'approved', r.user_id, r.start_date, r.end_date)}>
                                                <Check size={14} /> Approve
                                            </button>
                                            <button className="btn btn-sm btn-danger"
                                                onClick={() => reviewRequest(r.id, 'rejected', r.user_id, r.start_date, r.end_date)}>
                                                <XCircle size={14} /> Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* My Requests */}
                    <div className="card">
                        <h4 style={{ marginBottom: '16px' }}>My Leave Requests</h4>
                        {requests.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🏖️</div>
                                <p>No leave requests yet. Enjoy your work!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {requests.map(r => (
                                    <div key={r.id} style={{ padding: '14px 16px', background: 'var(--color-bg)', borderRadius: '12px', borderLeft: `3px solid ${STATUS_COLOR[r.status]}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                                    {new Date(r.start_date).toLocaleDateString('en-IN')} – {new Date(r.end_date).toLocaleDateString('en-IN')}
                                                </div>
                                                {r.reason && <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{r.reason}</div>}
                                            </div>
                                            <span style={{ fontWeight: 700, textTransform: 'capitalize', color: STATUS_COLOR[r.status], fontSize: '0.85rem' }}>
                                                {r.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {showModal && <ApplyModal onClose={() => setShowModal(false)} onApplied={fetchData} />}
        </div>
    );
}
