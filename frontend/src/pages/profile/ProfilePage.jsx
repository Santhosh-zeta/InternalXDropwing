import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { Camera, Save, Loader2, Edit3, X, Briefcase, Users, FolderKanban, Settings, Activity, ShieldAlert, ArrowRight, Clock, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
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

    // Data Context States
    const [teams, setTeams] = useState([]);
    const [managedTeams, setManagedTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [loadingContext, setLoadingContext] = useState(true);

    // Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '' });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setEditForm({ full_name: profile.full_name });
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        if (!profile) return;
        setLoadingContext(true);
        try {
            await Promise.all([
                fetchOperationalContext(),
                fetchTimelineActivity()
            ]);
        } finally {
            setLoadingContext(false);
        }
    };

    const fetchOperationalContext = async () => {
        if (profile.role === 'client') {
            const { data } = await supabase
                .from('client_projects')
                .select('project:projects(*)')
                .eq('client_id', profile.id);
            setProjects(data?.map(d => d.project).filter(Boolean) || []);
        } else {
            const { data: mTeams } = await supabase
                .from('teams')
                .select('id, name')
                .eq('manager_id', profile.id);
            setManagedTeams(mTeams || []);

            const { data: memberTeams } = await supabase
                .from('team_members')
                .select('team:teams(id, name)')
                .eq('profile_id', profile.id);
            setTeams(memberTeams?.map(d => d.team).filter(Boolean) || []);
        }
    };

    const fetchTimelineActivity = async () => {
        try {
            // Fetch tasks assigned to this user
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('id, title, status, created_at, team:teams(name)')
                .eq('assignee_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(4);

            const activities = (tasksData || []).map(t => ({
                id: `task-${t.id}`,
                icon: <Activity size={14} color="var(--color-info)" />,
                title: `Task Assigned: ${t.title}`,
                subtitle: t.team?.name ? `Via Team: ${t.team.name}` : 'Direct Assignment',
                timestamp: new Date(t.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                status: t.status,
                type: 'task'
            }));

            // Fetch leaves requested if internal
            if (profile.role !== 'client') {
                const { data: leavesData } = await supabase
                    .from('leave_requests')
                    .select('id, start_date, end_date, status, created_at')
                    .eq('user_id', profile.id)
                    .order('created_at', { ascending: false })
                    .limit(2);

                const leaveActivities = (leavesData || []).map(l => ({
                    id: `leave-${l.id}`,
                    icon: <Clock size={14} color="var(--color-warning)" />,
                    title: `Leave Requested: ${l.start_date} to ${l.end_date}`,
                    subtitle: 'HR System',
                    timestamp: new Date(l.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    status: l.status,
                    type: 'leave'
                }));
                activities.push(...leaveActivities);
            }

            // Sort descending by timestamp
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setTimeline(activities);
        } catch (e) {
            console.error('Timeline error:', e);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Max size 2MB'); return; }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `avatars/${profile.id}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
            if (updateError) throw updateError;

            toast.success('Avatar updated globally');
            window.location.reload(); 
        } catch (err) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update({ full_name: editForm.full_name }).eq('id', profile.id);
            if (error) throw error;
            toast.success('Identity saved');
            setIsEditing(false);
            window.location.reload();
        } catch (err) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (!profile) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: 'var(--color-text-secondary)' }}>
            <Loader2 style={{ animation: 'spin 1.5s linear infinite', marginBottom: '16px' }} size={32} />
            Initializing Identity Node...
        </div>
    );

    const isClient = profile.role === 'client';
    const isExecutive = ['managing_director', 'ceo', 'manager'].includes(profile.role);
    const isAdmin = ['managing_director', 'ceo', 'admin'].includes(profile.role);
    const initials = profile.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';

    // Shared internal styles for repeated blocks
    const labelStyle = {
        fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold'
    };
    const valueStyle = {
        fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)'
    };
    const detailCardStyle = {
        background: 'var(--color-bg)', padding: '16px', borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--color-border)', marginBottom: '12px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center'
    };

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } }} />

            <div className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
                <div className="page-title">System Identity</div>
                <div className="page-subtitle" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '6px', color: 'var(--color-primary)' }}>Dropwing OS Node</div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: '1fr 1.6fr' }}>
                
                {/* ------------------------------------------------------------- */}
                {/* LEFT COLUMN: IDENTITY, PARAMETERS & POWER CONTROLS            */}
                {/* ------------------------------------------------------------- */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    
                    {/* Primary Identity Card */}
                    <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--color-primary)', padding: 'var(--space-xl)' }}>
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" style={{ width: '110px', height: '110px', borderRadius: 'var(--radius-xl)', objectFit: 'cover', border: '4px solid var(--color-bg)', boxShadow: 'var(--shadow-card)' }} />
                            ) : (
                                <div style={{ width: '110px', height: '110px', borderRadius: 'var(--radius-xl)', background: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)', border: '4px solid var(--color-bg)', boxShadow: 'var(--shadow-card)' }}>
                                    {initials}
                                </div>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{
                                    position: 'absolute', bottom: '-8px', right: '-8px',
                                    width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-primary)', border: '3px solid var(--color-bg-card)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#fff', boxShadow: 'var(--shadow-card)'
                                }}
                                title="Change Photo"
                            >
                                {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={16} />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        </div>
                        
                        {/* Controlled Identity Edit */}
                        {isEditing ? (
                            <div style={{ marginBottom: '20px', background: 'var(--color-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                <input 
                                    className="form-input" 
                                    style={{ textAlign: 'center', marginBottom: '12px' }}
                                    value={editForm.full_name} 
                                    onChange={e => setEditForm({...editForm, full_name: e.target.value})} 
                                    placeholder="Identity Name"
                                />
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <button onClick={() => setIsEditing(false)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem' }}><X size={14} style={{ marginRight: '4px' }}/> Cancel</button>
                                    <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '4px' }}/> : <Save size={14} style={{ marginRight: '4px' }}/>} Commit
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '20px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '1.4rem' }}>{profile.full_name}</h2>
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex' }}
                                    title="Edit Identity"
                                >
                                    <Edit3 size={16} />
                                </button>
                            </div>
                        )}

                        <span className={`badge badge-${profile.role}`} style={{ fontSize: '0.8rem', padding: '6px 12px', letterSpacing: '1px' }}>
                            {ROLE_LABELS[profile.role] || profile.role}
                        </span>

                        {!isClient && profile.companies && (
                            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'left', borderLeft: '3px solid var(--color-primary)' }}>
                                <div style={labelStyle}>Company Alignment</div>
                                <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Briefcase size={16} color="var(--color-primary)" />
                                    {profile.companies.name}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* System Parameters Card */}
                    <div className="card">
                        <div className="card-header" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={18} color="var(--color-text-muted)" />
                                <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)' }}>System Parameters</h3>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <div style={labelStyle}>Auth Registration Email</div>
                                <div style={valueStyle}>{user?.email}</div>
                            </div>
                            <div>
                                <div style={labelStyle}>Node Identifier</div>
                                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', background: 'var(--color-bg-hover)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{profile.id}</div>
                            </div>
                            <div>
                                <div style={labelStyle}>System Join Date</div>
                                <div style={valueStyle}>
                                    {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 5: Power Controls Node (If Executive) */}
                    {isExecutive && (
                        <div className="card" style={{ background: 'linear-gradient(to bottom, var(--color-bg-card), var(--color-bg-elevated))', borderLeft: '4px solid var(--color-accent)' }}>
                            <div className="card-header" style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldAlert size={18} color="var(--color-accent)" />
                                    <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-primary)' }}>Executive Controls</h3>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {isAdmin && (
                                    <Link to="/users" style={detailCardStyle} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={16} color="var(--color-text-muted)"/> <span style={valueStyle}>Manage Directory</span></div>
                                        <ArrowRight size={16} color="var(--color-text-muted)" />
                                    </Link>
                                )}
                                <Link to="/teams" style={detailCardStyle} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><PlusCircle size={16} color="var(--color-text-muted)"/> <span style={valueStyle}>Orchestrate Teams</span></div>
                                    <ArrowRight size={16} color="var(--color-text-muted)" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* RIGHT COLUMN: OPERATIONAL CONTEXT & TIMELINE                  */}
                {/* ------------------------------------------------------------- */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    {loadingContext ? (
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--color-text-secondary)' }}>
                            <Loader2 style={{ animation: 'spin 1.5s linear infinite', marginBottom: '16px' }} size={32} />
                            <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.75rem', fontWeight: 'bold' }}>Resolving Operational Footprint...</div>
                        </div>
                    ) : (
                        <>
                            {/* CLIENT CONTEXT */}
                            {isClient && (
                                <div className="card">
                                    <div className="card-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <FolderKanban size={22} color="var(--color-primary)" />
                                            <h2 style={{ fontSize: '1.2rem' }}>Active Engagements</h2>
                                        </div>
                                    </div>
                                    {projects.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                                            <p>No active operational projects linked to this identity.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {projects.map(p => (
                                                <div key={p.id} style={{ ...detailCardStyle, alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ ...valueStyle, fontSize: '1.1rem', marginBottom: '8px' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>{p.description || 'No operational description provided.'}</div>
                                                    </div>
                                                    <span className={`badge ${p.status === 'active' ? 'badge-intern' : 'badge-client'}`} style={{ alignSelf: 'center' }}>{p.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* INTERNAL CONTEXT */}
                            {!isClient && (
                                <div className="grid-2" style={{ gap: 'var(--space-xl)' }}>
                                    
                                    {/* Membership Block (Placement) */}
                                    <div className="card">
                                        <div className="card-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Briefcase size={20} color="var(--color-info)" />
                                                <h2 style={{ fontSize: '1.1rem' }}>Placement Node</h2>
                                            </div>
                                        </div>
                                        
                                        {teams.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '24px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                                <p style={{ fontSize: '0.85rem' }}>Not mapped to operational teams.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {teams.map(t => (
                                                    <div key={t.id} style={detailCardStyle}>
                                                        <span style={valueStyle}>{t.name}</span>
                                                        <span style={{ fontSize: '0.65rem', background: 'var(--color-bg-hover)', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Member</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Leadership Block (Executives) */}
                                    {isExecutive && (
                                        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
                                            <div className="card-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Users size={20} color="var(--color-primary)" />
                                                    <h2 style={{ fontSize: '1.1rem' }}>Leadership Matrix</h2>
                                                </div>
                                            </div>
                                            
                                            {managedTeams.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '24px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                                    <p style={{ fontSize: '0.85rem' }}>No underlying authority paths.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {managedTeams.map(t => (
                                                        <div key={t.id} style={{ ...detailCardStyle, borderLeft: '3px solid var(--color-primary)' }}>
                                                            <div style={valueStyle}>{t.name}</div>
                                                            <div style={{ fontSize: '0.65rem', background: 'var(--color-bg-hover)', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--color-primary)' }}>Director</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ------------- STEP 6: ACTIVITY TIMELINE ------------- */}
                            <div className="card" style={{ minHeight: '350px' }}>
                                <div className="card-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '32px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Activity size={20} color="var(--color-text-muted)" />
                                        <h2 style={{ fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>System Activity Log</h2>
                                    </div>
                                </div>

                                {timeline.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                                        <p>No recent system actions found for this identity.</p>
                                    </div>
                                ) : (
                                    <div className="timeline">
                                        {timeline.map((act, index) => (
                                            <div key={act.id || index} className="timeline-item">
                                                <div className={`timeline-dot ${act.type === 'task' ? 'done' : 'pending'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                                    <div>
                                                        <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{act.title}</h4>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{act.subtitle}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{act.timestamp}</div>
                                                        {act.status && (
                                                            <span style={{ fontSize: '0.65rem', background: 'var(--color-bg)', padding: '3px 6px', border: '1px solid var(--color-border)', borderRadius: '4px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>{act.status}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
