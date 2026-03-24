import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUsers, getCompanies, getAnnouncements, getTasks, getTeams, getProjects, extractData } from '../../api';
import { Users, Building2, ListTodo, FolderKanban, Bell, Clock } from 'lucide-react';

const ROLE_GREET = {
    managing_director: 'Here\'s the Dropwing Groups overview',
    admin: 'Welcome, Admin',
    ceo: 'Here\'s your company overview',
    manager: 'Here\'s your team summary',
    intern: 'Here\'s your work summary',
    client: 'Here\'s your project status',
};

const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

function StatCard({ icon, label, value, color, subtitle }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{label}</div>
                {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { profile } = useAuth();
    const [stats, setStats] = useState({});
    const [announcements, setAnnouncements] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const role = profile?.role;
                const results = await Promise.allSettled([
                    role !== 'client' ? getAnnouncements() : Promise.resolve({ data: [] }),
                    getTasks().catch(() => ({ data: [] })),
                    (role === 'managing_director' || role === 'admin') ? getUsers() : Promise.resolve({ data: [] }),
                    (role === 'managing_director' || role === 'admin') ? getCompanies() : Promise.resolve({ data: [] }),
                    (role !== 'client') ? getTeams().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
                    (role !== 'intern') ? getProjects().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
                ]);

                const getValue = (r) => r.status === 'fulfilled' ? extractData(r.value?.data) : [];
                const [ann, tsk, usr, ven, tms, prj] = results.map(getValue);

                setAnnouncements((ann || []).slice(0, 5));
                setTasks((tsk || []).slice(0, 10));
                setStats({
                    users: usr?.length || 0,
                    companies: ven?.length || 0,
                    teams: tms?.length || 0,
                    projects: prj?.length || 0,
                    totalTasks: tsk?.length || 0,
                    myTasks: tsk?.filter(t => t.assignee_id === profile?.id).length || 0,
                    pendingTasks: tsk?.filter(t => t.status === 'todo' || t.status === 'in_progress').length || 0,
                    doneTasks: tsk?.filter(t => t.status === 'done').length || 0,
                });
            } catch (e) {
                console.error('Dashboard fetch error:', e);
            } finally {
                setLoading(false);
            }
        };

        if (profile) fetchAll();
    }, [profile]);

    const renderStats = () => {
        const { role } = profile;
        if (role === 'managing_director' || role === 'admin') {
            return [
                <StatCard key="v" icon={<Building2 size={24} />} label="Companies" value={stats.companies} color="var(--color-primary)" />,
                <StatCard key="u" icon={<Users size={24} />} label="Total Members" value={stats.users} color="var(--color-info)" />,
                <StatCard key="t" icon={<ListTodo size={24} />} label="Active Tasks" value={stats.pendingTasks} color="var(--color-warning)" subtitle={`${stats.doneTasks} completed`} />,
                <StatCard key="p" icon={<FolderKanban size={24} />} label="Projects" value={stats.projects} color="var(--color-success)" />,
            ];
        }
        if (role === 'ceo') {
            return [
                <StatCard key="t" icon={<Users size={24} />} label="Teams" value={stats.teams} color="var(--color-primary)" />,
                <StatCard key="p" icon={<FolderKanban size={24} />} label="Projects" value={stats.projects} color="var(--color-success)" />,
                <StatCard key="at" icon={<ListTodo size={24} />} label="Active Tasks" value={stats.pendingTasks} color="var(--color-warning)" />,
                <StatCard key="dt" icon={<ListTodo size={24} />} label="Completed" value={stats.doneTasks} color="var(--color-success)" />,
            ];
        }
        if (role === 'manager') {
            return [
                <StatCard key="t" icon={<Users size={24} />} label="My Teams" value={stats.teams} color="var(--color-primary)" />,
                <StatCard key="at" icon={<ListTodo size={24} />} label="Open Tasks" value={stats.pendingTasks} color="var(--color-warning)" />,
                <StatCard key="dt" icon={<ListTodo size={24} />} label="Completed" value={stats.doneTasks} color="var(--color-success)" />,
            ];
        }
        if (role === 'intern') {
            return [
                <StatCard key="m" icon={<ListTodo size={24} />} label="My Tasks" value={stats.myTasks} color="var(--color-primary)" />,
                <StatCard key="p" icon={<ListTodo size={24} />} label="Pending" value={stats.pendingTasks} color="var(--color-warning)" />,
                <StatCard key="d" icon={<ListTodo size={24} />} label="Done" value={stats.doneTasks} color="var(--color-success)" />,
            ];
        }
        if (role === 'client') {
            return [
                <StatCard key="p" icon={<FolderKanban size={24} />} label="My Projects" value={stats.projects} color="var(--color-primary)" />,
            ];
        }
        return [];
    };

    const statusColor = { todo: 'var(--color-text-muted)', in_progress: 'var(--color-warning)', done: 'var(--color-success)' };
    const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

    return (
        <div>
            {/* Greeting */}
            <div className="card mb-xl" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(255,101,132,0.06))', borderColor: 'rgba(108,99,255,0.2)' }}>
                <div className="flex items-center gap-md" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>
                            {getTimeOfDay()}, {profile?.full_name?.split(' ')[0]} 👋
                        </h1>
                        <p style={{ fontSize: '0.9rem' }}>
                            {ROLE_GREET[profile?.role] || 'Welcome back'}
                            {profile?.companies?.name && ` · ${profile.companies.name}`}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <span className={`badge badge-${profile?.role}`} style={{ marginTop: '4px' }}>
                            {profile?.role?.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid-4" style={{ marginBottom: '24px' }}>
                        {renderStats()}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Announcements */}
                        {profile?.role !== 'client' && (
                            <div className="card">
                                <div className="flex items-center gap-sm mb-lg">
                                    <Bell size={18} style={{ color: 'var(--color-primary)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Announcements</h3>
                                </div>
                                {announcements.length === 0 ? (
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>No announcements yet</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {announcements.map(a => (
                                            <div key={a.id} style={{ padding: '12px', background: 'var(--color-bg)', borderRadius: '10px', borderLeft: '3px solid var(--color-primary)' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{a.title}</div>
                                                {a.body && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.body}</div>}
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                                                    {a.author?.full_name} · {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tasks */}
                        <div className="card">
                            <div className="flex items-center gap-sm mb-lg">
                                <Clock size={18} style={{ color: 'var(--color-warning)' }} />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Tasks</h3>
                            </div>
                            {tasks.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>No tasks yet</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {tasks.slice(0, 6).map(t => (
                                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--color-bg)', borderRadius: '10px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor[t.status], flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                                                {t.assignee?.full_name && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t.assignee.full_name}</div>}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: statusColor[t.status], fontWeight: 600, flexShrink: 0 }}>{statusLabel[t.status]}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
