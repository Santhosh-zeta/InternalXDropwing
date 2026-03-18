import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { getUsers } from '../../api';
import { Star, Plus, X, Loader2, ClipboardList } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function StarRating({ value, onChange }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map(n => (
                <span
                    key={n}
                    className={`star ${n <= (hover || value) ? 'filled' : 'empty'}`}
                    onClick={() => onChange(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                >★</span>
            ))}
        </div>
    );
}

function WriteReviewModal({ users, onClose, onSaved }) {
    const { profile } = useAuth();
    const [form, setForm] = useState({ reviewee_id: '', period: new Date().getFullYear() + '-Q' + Math.ceil((new Date().getMonth() + 1) / 3), rating: 0, feedback: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.rating === 0) { toast.error('Please select a rating'); return; }
        setLoading(true);
        try {
            const { error } = await supabase.from('reviews').insert({ ...form, reviewer_id: profile.id });
            if (error) throw error;
            await supabase.from('notifications').insert({
                user_id: form.reviewee_id,
                type: 'review',
                message: `You received a performance review from ${profile.full_name}`,
                link: '/reviews',
            }).catch(() => { });
            toast.success('Review submitted!');
            onSaved();
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setLoading(false); }
    };

    const reviewableUsers = users.filter(u => u.id !== profile?.id);

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">Write Performance Review</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Team Member</label>
                        <select id="review-reviewee" className="form-select" value={form.reviewee_id}
                            onChange={e => setForm({ ...form, reviewee_id: e.target.value })} required>
                            <option value="">Select person...</option>
                            {reviewableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Period</label>
                        <input id="review-period" className="form-input" value={form.period}
                            onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2025-Q1" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Overall Rating</label>
                        <StarRating value={form.rating} onChange={r => setForm({ ...form, rating: r })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Feedback</label>
                        <textarea className="form-textarea" value={form.feedback}
                            onChange={e => setForm({ ...form, feedback: e.target.value })}
                            placeholder="Describe performance, strengths, and areas for improvement..." required />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="review-submit" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <ClipboardList size={16} />}
                            Submit Review
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ReviewsPage() {
    const { profile } = useAuth();
    const [reviewsGiven, setReviewsGiven] = useState([]);
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [tab, setTab] = useState('received');

    const canWriteReview = ['managing_director', 'admin', 'ceo', 'manager'].includes(profile?.role);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [given, received, usersRes] = await Promise.all([
                supabase.from('reviews').select('*, reviewee:user_roles!reviews_reviewee_id_fkey(full_name)').eq('reviewer_id', profile.id).order('created_at', { ascending: false }),
                supabase.from('reviews').select('*, reviewer:user_roles!reviews_reviewer_id_fkey(full_name, role)').eq('reviewee_id', profile.id).order('created_at', { ascending: false }),
                getUsers(),
            ]);
            setReviewsGiven(given.data || []);
            setReviewsReceived(received.data || []);
            setUsers(usersRes.data || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { if (profile) fetchData(); }, [profile]);

    const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const list = tab === 'received' ? reviewsReceived : reviewsGiven;

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Performance Reviews</div>
                    <div className="page-subtitle">Quarterly feedback and ratings</div>
                </div>
                {canWriteReview && (
                    <button id="write-review-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Write Review
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {['received', 'given'].map(t => (
                    <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
                        {t} ({t === 'received' ? reviewsReceived.length : reviewsGiven.length})
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : list.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <p>No reviews {tab} yet</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {list.map(r => (
                        <div key={r.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                                        {tab === 'received' ? `From: ${r.reviewer?.full_name}` : `For: ${r.reviewee?.full_name}`}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Period: {r.period}</div>
                                </div>
                                <div style={{ color: '#FACC15', fontSize: '1.2rem', letterSpacing: '1px' }}>{renderStars(r.rating)}</div>
                            </div>
                            {r.feedback && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{r.feedback}</p>
                            )}
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && <WriteReviewModal users={users} onClose={() => setShowModal(false)} onSaved={fetchData} />}
        </div>
    );
}
