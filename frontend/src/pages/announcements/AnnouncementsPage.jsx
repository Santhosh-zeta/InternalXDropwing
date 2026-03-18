import { useEffect, useState } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, X, Megaphone, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const CAN_POST = ['managing_director', 'ceo', 'manager'];

function NewAnnouncementModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ title: '', body: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createAnnouncement(form);
            toast.success('Announcement posted!');
            onCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">New Announcement</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} id="announcement-form">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input id="ann-title" className="form-input" placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Message</label>
                        <textarea id="ann-body" className="form-textarea" placeholder="Write your announcement..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="ann-submit" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={16} /> : <Megaphone size={16} />} Post
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AnnouncementsPage() {
    const { profile } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const { data } = await getAnnouncements();
            setAnnouncements(data);
        } catch (e) {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAnnouncements(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await deleteAnnouncement(id);
            toast.success('Deleted');
            setAnnouncements(announcements.filter((a) => a.id !== id));
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />
            <div className="page-header flex justify-between items-center">
                <div>
                    <div className="page-title">Announcements</div>
                    <div className="page-subtitle">Stay updated with company-wide news</div>
                </div>
                {CAN_POST.includes(profile.role) && (
                    <button id="new-announcement-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> New Announcement
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : announcements.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📢</div>
                        <h3>No announcements yet</h3>
                        <p>Announcements will appear here once posted.</p>
                    </div>
                </div>
            ) : (
                <div>
                    {announcements.map((a) => (
                        <div key={a.id} className="card mb-md" style={{ display: 'flex', gap: '16px', borderLeft: '3px solid var(--color-primary)' }}>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ marginBottom: '8px' }}>{a.title}</h4>
                                {a.body && <p style={{ fontSize: '0.9rem' }}>{a.body}</p>}
                                <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', gap: '12px' }}>
                                    <span>By {a.created_by_profile?.full_name}</span>
                                    <span>·</span>
                                    <span>{new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    {a.company_id && <span className="badge badge-manager" style={{ fontSize: '0.7rem' }}>Company</span>}
                                    {!a.company_id && <span className="badge badge-md" style={{ fontSize: '0.7rem' }}>Global</span>}
                                </div>
                            </div>
                            {CAN_POST.includes(profile.role) && (
                                <button className="btn btn-icon btn-danger" onClick={() => handleDelete(a.id)} style={{ alignSelf: 'flex-start' }}>
                                    <Trash2 size={15} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && <NewAnnouncementModal onClose={() => setShowModal(false)} onCreated={loadAnnouncements} />}
        </div>
    );
}
