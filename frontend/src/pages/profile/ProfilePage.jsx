import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import api from '../../api/client';
import { Camera, Save, Loader2, User } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const ROLE_LABELS = {
    managing_director: 'Managing Director',
    admin: 'Admin',
    ceo: 'CEO',
    manager: 'Manager',
    intern: 'Intern',
    client: 'Client',
};

export default function ProfilePage() {
    const { profile, user } = useAuth();
    const fileInputRef = useRef();
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
    });
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be under 2MB');
            return;
        }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `avatars/${profile.id}.${ext}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(path);

            // Save URL to user_roles
            const { error: updateError } = await supabase
                .from('user_roles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            toast.success('Avatar updated!');
        } catch (err) {
            toast.error(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ full_name: form.full_name })
                .eq('id', profile.id);

            if (error) throw error;
            toast.success('Profile updated!');
        } catch (err) {
            toast.error(err.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const initials = profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />

            <div className="page-header">
                <div className="page-title">My Profile</div>
                <div className="page-subtitle">Manage your personal information</div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Left: Avatar + info */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Avatar"
                                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }}
                            />
                        ) : (
                            <div
                                className="avatar-fallback"
                                style={{ width: '100px', height: '100px', fontSize: '2rem', margin: '0 auto', borderRadius: '50%' }}
                            >
                                {initials}
                            </div>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                position: 'absolute', bottom: '0', right: '0',
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'var(--color-primary)', border: '2px solid var(--color-bg-card)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#fff',
                            }}
                            disabled={uploading}
                            title="Change photo"
                        >
                            {uploading ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Camera size={14} />}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    </div>

                    <h3 style={{ marginBottom: '4px' }}>{profile?.full_name}</h3>
                    <p style={{ fontSize: '0.85rem', marginBottom: '12px' }}>{user?.email}</p>
                    <span className={`badge badge-${profile?.role}`}>
                        {ROLE_LABELS[profile?.role] || profile?.role}
                    </span>

                    {profile?.ventures && (
                        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venture</div>
                            <div style={{ fontWeight: 600 }}>{profile.ventures.name}</div>
                        </div>
                    )}
                </div>

                {/* Right: Edit form */}
                <div className="card">
                    <h4 style={{ marginBottom: '24px' }}>Edit Profile</h4>

                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            id="profile-name"
                            className="form-input"
                            value={form.full_name}
                            onChange={e => setForm({ ...form, full_name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            value={user?.email || ''}
                            disabled
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <input
                            className="form-input"
                            value={ROLE_LABELS[profile?.role] || profile?.role || ''}
                            disabled
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Member Since</label>
                        <input
                            className="form-input"
                            value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                            disabled
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            id="save-profile-btn"
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={16} />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Account Security */}
            <div className="card" style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '20px' }}>Account Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--color-bg)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>User ID</div>
                        <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{profile?.id?.slice(0, 8)}...</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--color-bg)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Auth Provider</div>
                        <div style={{ fontWeight: 600 }}>Email / Password</div>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--color-bg)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Status</div>
                        <span className="badge badge-active">Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
