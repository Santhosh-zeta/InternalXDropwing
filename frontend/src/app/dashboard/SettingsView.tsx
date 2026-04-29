import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface SettingsViewProps {
  currentUser: User;
}

export default function SettingsView({ currentUser }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences state
  const [muteChatAfter5, setMuteChatAfter5] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    // Fetch full profile including preferences
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/users/me');
        if (res.data.success) {
          const user = res.data.data;
          setFullName(user.full_name);
          setPhone(user.phone || '');
          setAvatarUrl(user.avatar_url || '');
          if (user.notification_preferences) {
            setMuteChatAfter5(!!user.notification_preferences.muteChatAfter5);
            setEmailNotifications(user.notification_preferences.emailNotifications !== false);
          }
        }
      } catch (err) {
        toast.error('Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Avatar must be under 5MB');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setSaving(true);
      const token = localStorage.getItem('internalx_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/me/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const res = await response.json();
      if (res.success) {
        setAvatarUrl(res.data.avatar_url);
        toast.success('Avatar updated successfully');
        
        // Update local storage to reflect changes across app (requires refresh for sidebar)
        const stored = JSON.parse(localStorage.getItem('internalx_user') || '{}');
        stored.avatarUrl = res.data.avatar_url;
        localStorage.setItem('internalx_user', JSON.stringify(stored));
      } else {
        toast.error(res.message || 'Failed to upload avatar');
      }
    } catch (err) {
      toast.error('Error uploading avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/users/me/profile', {
        full_name: fullName,
        phone,
        notification_preferences: { muteChatAfter5, emailNotifications }
      });
      if (res.data.success) {
        toast.success('Profile updated successfully');
        
        // Update local storage
        const stored = JSON.parse(localStorage.getItem('internalx_user') || '{}');
        stored.fullName = fullName;
        stored.phone = phone;
        localStorage.setItem('internalx_user', JSON.stringify(stored));
      } else {
        toast.error(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }

    try {
      setSaving(true);
      const res = await api.put('/users/me/password', { currentPassword, newPassword });
      if (res.data.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.data.message || 'Failed to change password');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error changing password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
        <div className="animate-spin-slow" style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
        <p>Loading settings...</p>
      </div>
    );
  }

  const TabButton = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 20px', borderRadius: 12, border: 'none',
        background: activeTab === id ? 'var(--color-bg-tertiary)' : 'transparent',
        color: activeTab === id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontWeight: activeTab === id ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>Account Settings</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Manage your profile, security credentials, and system preferences.</p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexDirection: 'column' }}>
        {/* Navigation Tabs */}
        <div className="glass" style={{ display: 'flex', padding: 8, borderRadius: 16, border: '1px solid var(--color-border)', overflowX: 'auto' }}>
          <TabButton id="profile" label="Personal Info" icon="👤" />
          <TabButton id="security" label="Security" icon="🔐" />
          <TabButton id="preferences" label="Preferences" icon="⚙️" />
        </div>

        {/* Content Area */}
        <div className="glass" style={{ padding: 32, borderRadius: 16, border: '1px solid var(--color-border)' }}>
          
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
                <div 
                  style={{ 
                    width: 80, height: 80, borderRadius: '50%', background: 'var(--color-bg-tertiary)',
                    border: '2px solid var(--color-border)', overflow: 'hidden', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0,
                    backgroundImage: avatarUrl ? `url(${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${avatarUrl})` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center'
                  }}
                >
                  {!avatarUrl && '👤'}
                </div>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Profile Avatar</h4>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarUpload} accept="image/*" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      Change Avatar
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>JPG, GIF or PNG. Max size 5MB.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Full Name</label>
                  <input
                    type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Email Address</label>
                  <input
                    type="email" value={currentUser.email} disabled
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>Email cannot be changed directly. Contact IT.</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Phone Number</label>
                  <input
                    type="text" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Role / Designation</label>
                  <input
                    type="text" value={currentUser.designation || currentUser.levelName} disabled
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="submit" disabled={saving} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 500 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Current Password</label>
                <input
                  type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>New Password</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Confirm New Password</label>
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                />
              </div>
              
              <div style={{ marginTop: 8 }}>
                <button type="submit" disabled={saving} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--color-bg-tertiary)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Quiet Hours</h4>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Mute team chat notifications after 5:00 PM local time.</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={muteChatAfter5} onChange={e => setMuteChatAfter5(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }} />
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--color-bg-tertiary)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Email Notifications</h4>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Receive email digests for pending tasks and document approvals.</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }} />
                </label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="submit" disabled={saving} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
