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
import RoleManagementView from './RoleManagementView';

import { 
  Hexagon, LayoutDashboard, FolderKanban, CheckSquare, Users, 
  ShieldCheck, Activity, MessageSquare, BookOpen, Settings, 
  FileText, Database, BarChart3, TrendingUp, DollarSign,
  PieChart, Briefcase, FileSignature, LogOut, Search, Loader2, 
  User as UserIcon, Building2, Crown, ChevronRight, Lock
} from 'lucide-react';

const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed',
  4: '#06b6d4', 5: '#f59e0b', 6: '#10b981',
  7: '#6366f1', 8: '#0ea5e9', 9: '#f43f5e',
};

const ACCESS_MENUS: Record<number, string[]> = {
  1: ['System Overview', 'Projects', 'Tasks', 'Documents', 'User Management', 'Role Management', 'Access Control', 'Audit Logs', 'Team Chat', 'Learning Hub', 'Settings', 'Invoices', 'Database', 'Reports'],
  2: ['Executive Dashboard', 'Projects', 'Tasks', 'Documents', 'Strategy', 'Role Management', 'Financials', 'HR Overview', 'Team Chat', 'Learning Hub', 'Invoices', 'Settings', 'Reports'],
  3: ['Admin Panel', 'Projects', 'User Management', 'Tasks', 'Documents', 'Team Chat', 'Learning Hub', 'Invoices', 'Settings', 'Reports'],
  4: ['C-Suite Overview', 'Projects', 'Department KPIs', 'Tasks', 'Documents', 'Team Management', 'Role Management', 'Team Chat', 'Learning Hub', 'Settings', 'Budget', 'Reports'],
  5: ['Team Dashboard', 'Projects', 'Tasks', 'Documents', 'Team Members', 'Team Chat', 'Learning Hub', 'Settings', 'Reports'],
  6: ['My Projects', 'Tasks', 'Documents', 'Timesheets', 'Team Chat', 'Settings'],
  7: ['My Dashboard', 'My Projects', 'My Tasks', 'Documents', 'Timesheets', 'Team Chat', 'Settings'],
  8: ['My Dashboard', 'My Projects', 'My Tasks', 'Documents', 'Learning Hub', 'Team Chat', 'Settings'],
  9: ['Project Status', 'My Tasks', 'Documents', 'Deliverables', 'Invoices', 'Messages', 'Settings'],
};

const MENU_ICONS: Record<string, React.ElementType> = {
  'System Overview': LayoutDashboard,
  'Executive Dashboard': LayoutDashboard,
  'Admin Panel': LayoutDashboard,
  'C-Suite Overview': LayoutDashboard,
  'Team Dashboard': LayoutDashboard,
  'My Dashboard': LayoutDashboard,
  'Projects': FolderKanban,
  'My Projects': FolderKanban,
  'Project Status': Activity,
  'Tasks': CheckSquare,
  'My Tasks': CheckSquare,
  'Documents': FileText,
  'Deliverables': FileSignature,
  'User Management': Users,
  'Team Members': Users,
  'Team Management': Users,
  'Role Management': Users,
  'Access Control': ShieldCheck,
  'Audit Logs': Activity,
  'Team Chat': MessageSquare,
  'Messages': MessageSquare,
  'Learning Hub': BookOpen,
  'Settings': Settings,
  'Invoices': DollarSign,
  'Database': Database,
  'Reports': BarChart3,
  'Strategy': TrendingUp,
  'Financials': DollarSign,
  'Budget': DollarSign,
  'HR Overview': PieChart,
  'Department KPIs': PieChart,
  'Timesheets': Briefcase
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
          <p className="text-[var(--color-text-muted)] text-sm font-medium tracking-wide">Loading workspace...</p>
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
    
    const results: { type: string, title: string, subtitle?: string, action: () => void, icon: React.ElementType }[] = [];
    
    menus.forEach((item, index) => {
      if (item.toLowerCase().includes(q)) {
        results.push({ type: 'module', title: item, subtitle: 'Go to module', action: () => setActiveMenu(index), icon: MENU_ICONS[item] || LayoutDashboard });
      }
    });

    if ('marketing campaign'.includes(q)) {
      results.push({ type: 'task', title: 'Q3 Marketing Campaign', subtitle: 'Task in Dropwing Design', action: () => { setActiveMenu(menus.indexOf('Tasks') !== -1 ? menus.indexOf('Tasks') : 0); }, icon: CheckSquare });
    }
    if ('invoice'.includes(q) || 'payment'.includes(q)) {
      results.push({ type: 'document', title: 'Invoice #INV-2026', subtitle: 'Document / Financials', action: () => { setActiveMenu(menus.indexOf('Invoices') !== -1 ? menus.indexOf('Invoices') : 0); }, icon: FileText });
    }
    if ('john doe'.includes(q) || 'user'.includes(q)) {
      results.push({ type: 'user', title: 'John Doe', subtitle: 'Level 5 Developer', action: () => { setActiveMenu(menus.indexOf('User Management') !== -1 ? menus.indexOf('User Management') : 0); }, icon: UserIcon });
    }

    return results;
  };

  const searchResults = getSearchResults();

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-primary)] font-sans text-[var(--color-text-primary)]">
      
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r border-[var(--color-border)] sticky top-0 h-screen bg-[var(--color-bg-secondary)] overflow-y-auto">
        
        {/* Logo */}
        <div className="p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-purple-glow)] text-white shadow-sm">
              <Hexagon size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight leading-none text-[var(--color-text-primary)]">InternalX</div>
              <div className="text-[9px] font-semibold tracking-widest uppercase mt-1 text-[var(--color-text-muted)]">Dropwing Groups</div>
            </div>
          </div>

          {/* User card */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                {user.accessLevel === 1 ? <Crown size={18} style={{ color }} /> : 
                 user.accessLevel === 2 ? <Building2 size={18} style={{ color }} /> : 
                 user.accessLevel === 9 ? <Briefcase size={18} style={{ color }} /> : 
                 <UserIcon size={18} style={{ color }} />}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[var(--color-text-primary)] truncate">
                  {user.fullName}
                </div>
                <div className="text-[10px] font-medium truncate" style={{ color }}>{user.levelName}</div>
                {user.venture && (
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                    {user.venture.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nav menu */}
        <nav className="flex-1 p-3 space-y-0.5">
          {menus.map((item, i) => {
            const Icon = MENU_ICONS[item] || LayoutDashboard;
            const isActive = activeMenu === i;
            return (
              <button
                key={item}
                onClick={() => setActiveMenu(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  isActive 
                    ? 'bg-[var(--color-purple-glow)] text-white shadow-sm' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-[var(--color-text-muted)]'} />
                {item}
              </button>
            );
          })}
        </nav>

        {/* Ventures filter (Super Admin/MD only) */}
        {user.accessLevel <= 2 && (
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="text-[10px] font-semibold text-[var(--color-text-muted)] tracking-wider uppercase mb-3">Ventures</div>
            {VENTURES.map(v => (
              <div key={v.slug} className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} />
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{v.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-10">
        
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[var(--color-border)] pb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {menus[activeMenu]}
            </h1>
            <p className="text-sm font-medium text-[var(--color-text-muted)] mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Global Search Bar */}
            <div className="relative z-50">
              <div 
                className={`flex items-center bg-[var(--color-bg-secondary)] border rounded-lg px-3 py-1.5 w-64 lg:w-72 transition-all ${
                  isSearchFocused ? 'border-[var(--color-purple-glow)] ring-1 ring-[var(--color-purple-glow)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                <Search size={14} className="text-[var(--color-text-muted)] mr-2 shrink-0" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search globally... (Ctrl+K)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="bg-transparent border-none outline-none text-[13px] text-[var(--color-text-primary)] w-full placeholder:text-[var(--color-text-muted)]"
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((res, i) => (
                      <div 
                        key={i}
                        onClick={() => {
                          res.action();
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--color-bg-card-hover)] border-b border-[var(--color-border)] last:border-0 transition-colors"
                      >
                        <div className="w-7 h-7 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center shrink-0">
                          <res.icon size={14} className="text-[var(--color-text-muted)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{res.title}</div>
                          <div className="text-[11px] text-[var(--color-text-muted)] truncate">{res.subtitle}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[13px] text-[var(--color-text-muted)]">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <NotificationBell color={color} />
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Level {user.accessLevel}</span>
            </div>
          </div>
        </div>

        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] mb-8 p-6 lg:p-8 shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-purple-glow)] opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10 flex items-start justify-between gap-6">
            <div>
              <div className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color }}>
                Workspace Active
              </div>
              <h2 className="text-xl lg:text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
                Welcome back, {user.fullName.split(' ')[0]}.
              </h2>
              <p className="text-[13px] lg:text-sm text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
                You are authenticated as <span className="font-medium text-[var(--color-text-primary)]">{user.levelName}</span>
                {user.venture ? ` within ${user.venture.name}` : ' with global administrative privileges'}.
                {user.designation && ` Active designation: ${user.designation}.`}
              </p>
              
              {user.accessLevel <= 3 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {VENTURES.map(v => (
                    <div key={v.slug} className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} />
                      {v.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="hidden md:flex shrink-0 w-12 h-12 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] items-center justify-center">
               <Hexagon size={24} style={{ color }} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Access Control', value: `Level ${user.accessLevel}`, sub: user.levelName, icon: ShieldCheck },
            { label: 'Department', value: user.department || 'Executive', sub: user.designation || 'Oversight', icon: Briefcase },
            { label: 'Employee ID', value: user.employeeId || 'Global Auth', sub: 'Verified Session', icon: Lock },
            { label: 'Workspace', value: user.venture?.name || 'All Ventures', sub: 'Active Environment', icon: Building2 },
          ].map((s, idx) => (
            <div
              key={idx}
              className="bg-[var(--color-bg-card)] rounded-xl p-5 border border-[var(--color-border)] shadow-sm hover:border-[var(--color-text-muted)] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  {s.label}
                </div>
                <s.icon size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="text-lg font-semibold text-[var(--color-text-primary)] mb-0.5 truncate">
                {s.value}
              </div>
              <div className="text-[12px] font-medium text-[var(--color-text-secondary)] truncate">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
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
          ) : menus[activeMenu] === 'Role Management' ? (
            <RoleManagementView currentUser={user} />
          ) : menus[activeMenu] === 'Access Control' ? (
            <AccessControlView currentUser={user} />
          ) : (
            <div className="bg-[var(--color-bg-card)] rounded-2xl p-12 border border-[var(--color-border)] shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] flex items-center justify-center mb-6">
                <Lock size={24} className="text-[var(--color-text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                {menus[activeMenu]} Module
              </h3>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] max-w-md">
                This section is currently under development. Your workspace environment will be updated automatically when it becomes available.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
