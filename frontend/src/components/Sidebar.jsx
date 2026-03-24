import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import {
    LayoutDashboard, Users, Building2, Users2, Megaphone,
    ListTodo, FolderKanban, LogOut, Moon, Sun, Bell, X,
    UserCircle, CalendarClock, MessageSquare, BarChart2,
    ClipboardList, Plane, Briefcase, Activity
} from 'lucide-react';

const ROLE_LABELS = {
    managing_director: 'Managing Director',
    admin: 'Admin',
    ceo: 'CEO',
    manager: 'Manager',
    intern: 'Intern',
    client: 'Client',
};

export default function Sidebar() {
    const { profile, logout } = useAuth();
    const navigate = useNavigate();
    const [theme, toggleTheme] = useTheme();
    const { unreadCount, notifications, markAllRead, markOneRead } = useNotifications();
    const [showNotifs, setShowNotifs] = useState(false);

    const role = profile?.role;
    const isAdmin = role === 'managing_director' || role === 'admin';
    const isCEO = role === 'ceo';
    const isWebforgeCEO = isCEO; // Currently visible to any CEO. Can be restricted by company ID later.
    const isClient = role === 'client';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navLink = (to, icon, label, condition = true) => {
        if (!condition) return null;
        return (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {icon}
                <span>{label}</span>
            </NavLink>
        );
    };

    const initials = profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';

    return (
        <>
            <aside className="sidebar">
                {/* Logo */}
                <div className="sidebar-logo">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>⬡</span>
                        <div>
                            <h2>Dropwing</h2>
                            <span>Internal Portal</span>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <div className="nav-section-label">Overview</div>
                        {navLink('/dashboard', <LayoutDashboard size={18} />, 'Dashboard')}
                        {navLink('/analytics', <BarChart2 size={18} />, 'Analytics', !isClient)}
                        {navLink('/activity', <Activity size={18} />, 'Activity', !isClient)}
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-label">Management</div>
                        {navLink('/webforge', <Briefcase size={18} />, 'Webforge Desk', isWebforgeCEO)}
                        {navLink('/users', <Users size={18} />, 'Team Members', isAdmin || isCEO)}
                        {navLink('/companies', <Building2 size={18} />, 'Companies', isAdmin || isCEO)}
                        {navLink('/teams', <Users2 size={18} />, 'Teams', !isClient)}
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-label">Work</div>
                        {navLink('/announcements', <Megaphone size={18} />, 'Announcements', !isClient)}
                        {navLink('/tasks', <ListTodo size={18} />, 'Tasks', !isClient)}
                        {navLink('/projects', <FolderKanban size={18} />, 'Projects')}
                        {navLink('/messages', <MessageSquare size={18} />, 'Messages', !isClient)}
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-label">HR</div>
                        {navLink('/attendance', <CalendarClock size={18} />, 'Attendance', !isClient)}
                        {navLink('/leave', <Plane size={18} />, 'Leave', !isClient)}
                        {navLink('/reviews', <ClipboardList size={18} />, 'Reviews', !isClient)}
                    </div>
                </nav>

                {/* Bottom Controls */}
                <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                            {theme === 'dark' ? 'Light' : 'Dark'}
                        </button>
                        <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markAllRead(); }}
                            title="Notifications"
                            style={{ position: 'relative' }}
                        >
                            <Bell size={16} />
                            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                        </button>
                    </div>

                    <div className="sidebar-user" style={{ padding: 0 }}>
                        <div
                            className="avatar-fallback avatar-sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate('/profile')}
                            title="Your profile"
                        >
                            {profile?.avatar_url
                                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                                : initials
                            }
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{profile?.full_name}</div>
                            <div className="sidebar-user-role">{ROLE_LABELS[role] || role}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-icon btn-ghost" onClick={() => navigate('/profile')} title="Profile">
                                <UserCircle size={16} />
                            </button>
                            <button className="btn btn-icon btn-ghost" onClick={handleLogout} title="Sign out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Notification Drawer */}
            {showNotifs && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 899 }} onClick={() => setShowNotifs(false)} />
                    <div className="notif-drawer">
                        <div className="notif-drawer-header">
                            <h4>Notifications</h4>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowNotifs(false)}><X size={16} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <Bell size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                                    <p>No notifications yet</p>
                                </div>
                            ) : notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${!n.read ? 'unread' : ''}`}
                                    onClick={() => { markOneRead(n.id); if (n.link) navigate(n.link); setShowNotifs(false); }}
                                >
                                    <div style={{ fontSize: '0.85rem', fontWeight: n.read ? 400 : 600, color: 'var(--color-text-primary)' }}>{n.message}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                        {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
