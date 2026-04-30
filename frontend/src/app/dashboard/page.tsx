'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { logoutUser } from '@/lib/api';
import { User, VENTURES } from '@/lib/constants';
import TasksView from './TasksView';
import OverviewView from './OverviewView';
import UserManagementView from './UserManagementView';
import ProjectsView from './ProjectsView';
import ChatView from './ChatView';
import AuditLogsView from './AuditLogsView';
import DocumentsView from './DocumentsView';
import TimesheetsView from './TimesheetsView';
import SettingsView from './SettingsView';
import InvoicesView from './InvoicesView';
import ReportsView from './ReportsView';
import AccessControlView from './AccessControlView';
import BudgetView from './BudgetView';
import DepartmentKPIsView from './DepartmentKPIsView';
import ClientPortalView from './ClientPortalView';
import NotificationBell from './NotificationBell';
import DatabaseView from './DatabaseView';
import LearningHubView from './LearningHubView';
import StrategyView from './StrategyView';

const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed',
  4: '#06b6d4', 5: '#f59e0b', 6: '#10b981',
  7: '#6366f1', 8: '#0ea5e9', 9: '#f43f5e',
};

const ACCESS_MENUS: Record<number, string[]> = {
  1: ['System Overview', 'Projects', 'Tasks', 'Documents', 'User Management', 'Access Control', 'Audit Logs', 'Team Chat', 'Learning Hub', 'Settings', 'Invoices', 'Database', 'Reports'],
  2: ['Executive Dashboard', 'Projects', 'Tasks', 'Documents', 'Strategy', 'Financials', 'HR Overview', 'Team Chat', 'Learning Hub', 'Invoices', 'Settings', 'Reports'],
  3: ['Admin Panel', 'Projects', 'User Management', 'Tasks', 'Documents', 'Team Chat', 'Learning Hub', 'Invoices', 'Settings', 'Reports'],
  4: ['C-Suite Overview', 'Projects', 'Department KPIs', 'Tasks', 'Documents', 'Team Management', 'Team Chat', 'Learning Hub', 'Settings', 'Budget', 'Reports'],
  5: ['Team Dashboard', 'Projects', 'Tasks', 'Documents', 'Team Members', 'Team Chat', 'Learning Hub', 'Settings', 'Reports'],
  6: ['My Projects', 'Tasks', 'Documents', 'Timesheets', 'Team Chat', 'Settings'],
  7: ['My Dashboard', 'My Projects', 'My Tasks', 'Documents', 'Timesheets', 'Team Chat', 'Settings'],
  8: ['My Dashboard', 'My Projects', 'My Tasks', 'Documents', 'Learning Hub', 'Team Chat', 'Settings'],
  9: ['Project Status', 'My Tasks', 'Documents', 'Deliverables', 'Invoices', 'Messages', 'Settings'],
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('internalx_user');
    if (!stored) { router.push('/'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    localStorage.removeItem('internalx_token');
    localStorage.removeItem('internalx_user');
    toast.success('Logged out successfully');
    router.push('/');
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin-slow" style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const color = LEVEL_COLORS[user.accessLevel] || '#8b5cf6';
  const menus = ACCESS_MENUS[user.accessLevel] || ACCESS_MENUS[7];
  const ventureColor = user.venture?.primaryColor || color;

  const getSearchResults = () => {
    const q = searchQuery.toLowerCase();
    if (!q) return [];
    
    const results: { type: string, title: string, subtitle?: string, action: () => void, icon: string }[] = [];
    
    // 1. Navigation / Menu matches
    menus.forEach((item, index) => {
      if (item.toLowerCase().includes(q)) {
        results.push({ type: 'module', title: item, subtitle: 'Go to module', action: () => setActiveMenu(index), icon: '✦' });
      }
    });

    // 2. Mock Global Items based on query keywords
    if ('marketing campaign'.includes(q)) {
      results.push({ type: 'task', title: 'Q3 Marketing Campaign', subtitle: 'Task in Dropwing Design', action: () => { setActiveMenu(menus.indexOf('Tasks') !== -1 ? menus.indexOf('Tasks') : 0); }, icon: '✓' });
    }
    if ('invoice'.includes(q) || 'payment'.includes(q)) {
      results.push({ type: 'document', title: 'Invoice #INV-2026', subtitle: 'Document / Financials', action: () => { setActiveMenu(menus.indexOf('Invoices') !== -1 ? menus.indexOf('Invoices') : 0); }, icon: '📄' });
    }
    if ('john doe'.includes(q) || 'user'.includes(q)) {
      results.push({ type: 'user', title: 'John Doe', subtitle: 'Level 5 Developer', action: () => { setActiveMenu(menus.indexOf('User Management') !== -1 ? menus.indexOf('User Management') : 0); }, icon: '👤' });
    }

    return results;
  };

  const searchResults = getSearchResults();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg-primary)' }}>
      {/* Sidebar */}
      <aside
        className="glass"
        style={{
          width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--color-border)', borderRadius: 0,
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              className="animate-pulse-glow"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}
            >
              ✦
            </div>
            <div>
              <div className="gradient-text" style={{ fontWeight: 700, fontSize: 16 }}>InternalX</div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: 2 }}>DROPWING GROUPS</div>
            </div>
          </div>

          {/* User card */}
          <div
            style={{
              background: `${color}15`,
              border: `1px solid ${color}30`,
              borderRadius: 12,
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${color}30`,
                  border: `2px solid ${color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}
              >
                {user.accessLevel === 1 ? '👑' : user.accessLevel === 2 ? '🏛️' : user.accessLevel === 9 ? '🤝' : '👤'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: 10, color, fontWeight: 600 }}>{user.levelName}</div>
                {user.venture && (
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.venture.name}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 8, padding: '4px 8px', background: `${color}20`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color, fontWeight: 700 }}>Level {user.accessLevel}</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 6 }}>· {user.employeeId}</span>
            </div>
          </div>
        </div>

        {/* Nav menu */}
        <nav style={{ flex: 1, padding: '12px 12px' }}>
          {menus.map((item, i) => (
            <button
              key={item}
              onClick={() => setActiveMenu(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', textAlign: 'left', padding: '10px 14px',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                marginBottom: 4, fontSize: 13, fontWeight: activeMenu === i ? 700 : 400,
                color: activeMenu === i ? color : 'var(--color-text-secondary)',
                background: activeMenu === i ? `${color}18` : 'transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (activeMenu !== i) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (activeMenu !== i) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: activeMenu === i ? color : 'var(--color-text-muted)',
              }} />
              {item}
            </button>
          ))}
        </nav>

        {/* Ventures filter (Super Admin/MD only) */}
        {user.accessLevel <= 2 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Ventures</div>
            {VENTURES.map(v => (
              <div key={v.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{v.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button
            id="btn-logout"
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(244,63,94,0.3)',
              background: 'rgba(244,63,94,0.08)', color: '#f43f5e',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.08)'; }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {menus[activeMenu]}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Global Search Bar */}
            <div style={{ position: 'relative' }}>
              <div 
                style={{ 
                  display: 'flex', alignItems: 'center', background: 'var(--color-bg-tertiary)', 
                  border: `1px solid ${isSearchFocused ? color : 'var(--color-border)'}`, 
                  borderRadius: 12, padding: '8px 16px', width: 280, transition: 'all 0.2s',
                  boxShadow: isSearchFocused ? `0 0 0 2px ${color}33` : 'none'
                }}
              >
                <span style={{ marginRight: 8, opacity: 0.5, fontSize: 14 }}>🔍</span>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search globally... (Ctrl+K)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  style={{ 
                    border: 'none', background: 'transparent', outline: 'none', 
                    color: 'var(--color-text-primary)', width: '100%', fontSize: 13 
                  }}
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim() && (
                <div 
                  className="glass"
                  style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, 
                    borderRadius: 12, overflow: 'hidden', zIndex: 100,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid var(--color-border)',
                    maxHeight: 300, overflowY: 'auto'
                  }}
                >
                  {searchResults.length > 0 ? (
                    searchResults.map((res, i) => (
                      <div 
                        key={i}
                        onClick={() => {
                          res.action();
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        style={{ 
                          padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                          borderBottom: i < searchResults.length - 1 ? '1px solid var(--color-border)' : 'none'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, border: '1px solid var(--color-border)' }}>
                          {res.icon}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{res.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{res.subtitle}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <NotificationBell color={color} />
            <div
              style={{
                padding: '8px 16px', borderRadius: 20,
                background: `${color}18`, border: `1px solid ${color}33`,
                fontSize: 12, color, fontWeight: 600,
              }}
            >
              ● Level {user.accessLevel} — {user.levelName}
            </div>
          </div>
        </div>

        {/* Welcome banner */}
        <div
          className="glass"
          style={{
            borderRadius: 20, padding: '28px 32px', marginBottom: 24,
            background: `linear-gradient(135deg, ${color}18 0%, rgba(6,182,212,0.08) 100%)`,
            border: `1px solid ${color}30`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.06 }}>
            {user.accessLevel === 1 ? '👑' : user.accessLevel === 2 ? '🏛️' : user.accessLevel === 9 ? '🤝' : '✦'}
          </div>
          <div style={{ fontSize: 13, color, fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>
            WELCOME BACK
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Hello, {user.fullName.split(' ')[0]}! 👋
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 600 }}>
            You are logged in as <strong style={{ color }}>{user.levelName}</strong>
            {user.venture ? ` at ${user.venture.name}` : ' with global access'}.
            {user.designation && ` Your role: ${user.designation}.`}
          </p>
          {user.accessLevel <= 3 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {VENTURES.map(v => (
                <span key={v.slug} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: `${v.color}18`, color: v.color, border: `1px solid ${v.color}30` }}>
                  {v.emoji} {v.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Access Level', value: `L${user.accessLevel}`, sub: user.levelName, c: color },
            { label: 'Department', value: user.department || 'N/A', sub: user.designation || '', c: ventureColor },
            { label: 'Employee ID', value: user.employeeId || 'N/A', sub: 'Internal ID', c: '#06b6d4' },
            { label: 'Venture', value: user.venture?.name?.split(' ')[0] || 'All', sub: 'Active workspace', c: '#10b981' },
          ].map(s => (
            <div
              key={s.label}
              className="glass"
              style={{ borderRadius: 16, padding: '20px', border: `1px solid ${s.c}20` }}
            >
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Placeholder content area */}
        {['System Overview', 'Executive Dashboard', 'Admin Panel', 'C-Suite Overview', 'Team Dashboard', 'My Dashboard'].includes(menus[activeMenu]) ? (
          <OverviewView currentUser={user} />
        ) : menus[activeMenu] === 'Tasks' || menus[activeMenu] === 'My Tasks' ? (
          <TasksView currentUser={user} />
        ) : menus[activeMenu] === 'User Management' || menus[activeMenu] === 'Team Members' ? (
          <UserManagementView currentUser={user} />
        ) : ['Projects', 'My Projects', 'Project Status', 'Deliverables'].includes(menus[activeMenu]) ? (
          <ProjectsView currentUser={user} />
        ) : ['Team Chat', 'Messages'].includes(menus[activeMenu]) ? (
          <ChatView currentUser={user} />
        ) : menus[activeMenu] === 'Audit Logs' ? (
          <AuditLogsView />
        ) : menus[activeMenu] === 'Documents' ? (
          <DocumentsView currentUser={user} />
        ) : menus[activeMenu] === 'Timesheets' ? (
          <TimesheetsView currentUser={user} />
        ) : menus[activeMenu] === 'Strategy' ? (
          <StrategyView currentUser={user} />
        ) : menus[activeMenu] === 'Financials' || menus[activeMenu] === 'Budget' ? (
          <BudgetView currentUser={user} />
        ) : menus[activeMenu] === 'Department KPIs' || menus[activeMenu] === 'HR Overview' || menus[activeMenu] === 'Team Management' ? (
          <DepartmentKPIsView currentUser={user} />
        ) : ['Project Status', 'Deliverables', 'Messages'].includes(menus[activeMenu]) && user.accessLevel === 9 ? (
          <ClientPortalView currentUser={user} />
        ) : menus[activeMenu] === 'Invoices' ? (
          <InvoicesView currentUser={user} />
        ) : menus[activeMenu] === 'Settings' ? (
          <SettingsView currentUser={user} />
        ) : menus[activeMenu] === 'Reports' ? (
          <ReportsView currentUser={user} />
        ) : menus[activeMenu] === 'Learning Hub' ? (
          <LearningHubView currentUser={user} />
        ) : menus[activeMenu] === 'Database' ? (
          <DatabaseView />
        ) : menus[activeMenu] === 'Access Control' ? (
          <AccessControlView currentUser={user} />
        ) : (
          <div className="glass" style={{ borderRadius: 16, padding: '40px', textAlign: 'center', border: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              {menus[activeMenu]} — Coming Soon
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
              This section is being built. Your access level ({user.levelName}) grants you access to this feature when it's ready.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
