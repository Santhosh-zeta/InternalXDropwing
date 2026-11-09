'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { logoutUser } from '@/lib/api';
import api from '@/lib/api';
import { VENTURES } from '@/lib/constants';
import { useAuthUser } from '@/components/AuthUserContext';
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
import BudgetView from './BudgetView';
import DepartmentKPIsView from './DepartmentKPIsView';
import ClientPortalView from './ClientPortalView';
import NotificationBell from './NotificationBell';
import LearningHubView from './LearningHubView';
import StrategyView from './StrategyView';
import CalendarView from './CalendarView';
import ApprovalsView from './ApprovalsView';
import { SocketProvider } from '@/components/SocketProvider';
import SearchPalette from '@/components/search/SearchPalette';

import {
  Hexagon, LayoutDashboard, FolderKanban, CheckSquare, Users,
  ShieldCheck, Activity, MessageSquare, BookOpen, Settings,
  FileText, BarChart3, TrendingUp, DollarSign,
  PieChart, Briefcase, FileSignature, LogOut, Search,
  User as UserIcon, Building2, Crown, Lock, Menu, X,
  CalendarDays, ClipboardCheck
} from 'lucide-react';

const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed',
  4: '#06b6d4', 5: '#f59e0b', 6: '#10b981',
  7: '#6366f1', 8: '#0ea5e9', 9: '#f43f5e',
};

const ACCESS_MENUS: Record<number, string[]> = {
  1: ['System Overview', 'Projects', 'Tasks', 'Calendar', 'Approvals', 'Documents', 'User Management', 'Audit Logs', 'Team Chat', 'Learning Hub', 'Settings', 'Invoices', 'Reports'],
  2: ['Executive Dashboard', 'Projects', 'Tasks', 'Calendar', 'Approvals', 'Documents', 'Strategy', 'Financials', 'HR Overview', 'Team Chat', 'Learning Hub', 'Invoices', 'Settings', 'Reports'],
  3: ['Admin Panel', 'Projects', 'User Management', 'Tasks', 'Calendar', 'Approvals', 'Documents', 'Team Chat', 'Learning Hub', 'Invoices', 'Settings', 'Reports'],
  4: ['C-Suite Overview', 'Projects', 'Department KPIs', 'Tasks', 'Calendar', 'Approvals', 'Documents', 'Team Management', 'Team Chat', 'Learning Hub', 'Settings', 'Budget', 'Reports'],
  5: ['Team Dashboard', 'Projects', 'Tasks', 'Calendar', 'Approvals', 'Documents', 'Team Members', 'Team Chat', 'Learning Hub', 'Settings', 'Reports'],
  6: ['My Projects', 'Tasks', 'Calendar', 'Documents', 'Timesheets', 'Team Chat', 'Settings'],
  7: ['My Dashboard', 'My Projects', 'My Tasks', 'Calendar', 'Documents', 'Timesheets', 'Team Chat', 'Settings'],
  8: ['My Dashboard', 'My Projects', 'My Tasks', 'Calendar', 'Documents', 'Learning Hub', 'Team Chat', 'Settings'],
  9: ['Project Status', 'My Tasks', 'Documents', 'Deliverables', 'Invoices', 'Messages', 'Settings'],
};

// Menus that render the dashboard home/overview. The welcome banner and the
// stat grid are scoped to these views only — every other module gets the full
// viewport for its own content.
const OVERVIEW_MENUS = ['System Overview', 'Executive Dashboard', 'Admin Panel', 'C-Suite Overview', 'Team Dashboard', 'My Dashboard'];

// Stable empty reference so hook dependencies don't change identity before the
// user object has been hydrated from storage.
const EMPTY_MENUS: string[] = [];

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
  'Audit Logs': Activity,
  'Team Chat': MessageSquare,
  'Messages': MessageSquare,
  'Learning Hub': BookOpen,
  'Settings': Settings,
  'Invoices': DollarSign,
  'Reports': BarChart3,
  'Strategy': TrendingUp,
  'Financials': DollarSign,
  'Budget': DollarSign,
  'HR Overview': PieChart,
  'Department KPIs': PieChart,
  'Timesheets': Briefcase,
  'Calendar': CalendarDays,
  'Approvals': ClipboardCheck
};

export default function DashboardPage() {
  const router = useRouter();
  // Verified server-side by RequireAuth before this component ever renders —
  // see AuthUserContext for why this isn't sourced from localStorage/cookies.
  const { user } = useAuthUser();
  const [activeMenu, setActiveMenu] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ type: string; title: string; subtitle?: string; action: () => void; icon: React.ElementType }[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // NOTE: every hook must run before the `if (!user)` early return below,
  // otherwise the hook order changes between the loading render and the
  // hydrated render.
  const menus = user ? (ACCESS_MENUS[user.accessLevel] || ACCESS_MENUS[7]) : EMPTY_MENUS;
  const color = (user && LEVEL_COLORS[user.accessLevel]) || '#8b5cf6';

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

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Return focus to the control that opened the drawer.
    hamburgerRef.current?.focus();
  }, []);

  // Drawer behaviour: Escape to close, a simple focus trap, and a body scroll
  // lock while the off-canvas panel is open.
  useEffect(() => {
    if (!isDrawerOpen) return;

    drawerCloseRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsDrawerOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;

      const node = drawerRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active ? node.contains(active) : false;

      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  // If the viewport grows past the `lg` breakpoint while the drawer is open the
  // panel is hidden by CSS — close it so the body scroll lock is released too.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => { if (mq.matches) setIsDrawerOpen(false); };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [isDrawerOpen]);

  const handleSearch = useCallback(async (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const results: { type: string; title: string; subtitle?: string; action: () => void; icon: React.ElementType }[] = [];

    // Module matching (instant, no API needed)
    menus.forEach((item, index) => {
      if (item.toLowerCase().includes(q)) {
        results.push({ type: 'module', title: item, subtitle: 'Go to module', action: () => setActiveMenu(index), icon: MENU_ICONS[item] || LayoutDashboard });
      }
    });

    // API search across tasks and team members
    try {
      const [tasksRes, usersRes] = await Promise.allSettled([
        api.get(`/tasks?search=${encodeURIComponent(query)}&limit=5`),
        api.get(`/team-members?search=${encodeURIComponent(query)}&limit=5`),
      ]);

      if (tasksRes.status === 'fulfilled') {
        const tasks = tasksRes.value.data?.data || tasksRes.value.data || [];
        (Array.isArray(tasks) ? tasks : []).slice(0, 5).forEach((t: any) => {
          results.push({ type: 'task', title: t.title, subtitle: t.status, action: () => { const idx = menus.indexOf('Tasks') !== -1 ? menus.indexOf('Tasks') : menus.indexOf('My Tasks'); if (idx !== -1) setActiveMenu(idx); }, icon: CheckSquare });
        });
      }
      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value.data?.data || usersRes.value.data || [];
        (Array.isArray(users) ? users : []).slice(0, 5).forEach((u: any) => {
          results.push({ type: 'user', title: u.full_name || u.fullName, subtitle: u.email, action: () => { const idx = menus.indexOf('User Management') !== -1 ? menus.indexOf('User Management') : menus.indexOf('Team Members'); if (idx !== -1) setActiveMenu(idx); }, icon: UserIcon });
        });
      }
    } catch {
      // API search failed — module results still shown
    }

    setSearchResults(results);
  }, [menus]);

  const handleLogout = async () => {
    try {
      // This is what actually ends the session: it deletes the server-side
      // session row, so the cookie the browser holds stops working
      // immediately rather than merely being forgotten client-side.
      await logoutUser();
    } catch {
      // Best-effort — even if this fails (e.g. offline), still take the user
      // back to the sign-in screen; RequireAuth will re-verify on next load.
    }
    toast.success('Logged out successfully');
    router.push('/');
  };

  const currentMenu = menus[activeMenu];
  // The welcome banner + stat grid belong to the landing view only. Level 9
  // (client portal) has no "overview" menu, so its first menu acts as home.
  const showHomeWidgets = OVERVIEW_MENUS.includes(currentMenu) || (user.accessLevel === 9 && activeMenu === 0);

  const selectMenu = (index: number) => {
    setActiveMenu(index);
    if (isDrawerOpen) closeDrawer();
  };

  // Shared sidebar body — rendered once in the persistent desktop rail and once
  // inside the mobile off-canvas drawer.
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-purple-glow)] text-white shadow-sm shrink-0">
            <Hexagon size={16} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[15px] tracking-tight leading-none text-[var(--color-text-primary)]">InternalX</div>
            <div className="text-[9px] font-semibold tracking-widest uppercase mt-1 text-[var(--color-text-muted)]">Dropwing Groups</div>
          </div>
        </div>

        {/* User card */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
              {user.accessLevel === 1 ? <Crown size={18} style={{ color }} aria-hidden="true" /> :
               user.accessLevel === 2 ? <Building2 size={18} style={{ color }} aria-hidden="true" /> :
               user.accessLevel === 9 ? <Briefcase size={18} style={{ color }} aria-hidden="true" /> :
               <UserIcon size={18} style={{ color }} aria-hidden="true" />}
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
      <nav aria-label="Main navigation" className="flex-1 p-3 space-y-0.5">
        {menus.map((item, i) => {
          const Icon = MENU_ICONS[item] || LayoutDashboard;
          const isActive = activeMenu === i;
          return (
            <button
              key={item}
              type="button"
              onClick={() => selectMenu(i)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-all ${
                isActive
                  ? 'bg-[var(--color-purple-glow)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" className={`shrink-0 ${isActive ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
              <span className="truncate">{item}</span>
            </button>
          );
        })}
      </nav>

      {/* Ventures filter (Super Admin/MD only) */}
      {user.accessLevel <= 2 && (
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="text-[10px] font-semibold text-[var(--color-text-muted)] tracking-wider uppercase mb-3">Ventures</div>
          <ul className="list-none m-0 p-0">
            {VENTURES.map(v => (
              <li key={v.slug} className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: v.color }} aria-hidden="true" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)] truncate">{v.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Logout */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <SocketProvider user={user}>
      <div className="min-h-screen flex bg-[var(--color-bg-primary)] font-sans text-[var(--color-text-primary)]">
        <SearchPalette menus={menus} onNavigate={selectMenu} />

        {/* Sidebar — persistent rail from `lg` up */}
        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-[var(--color-border)] sticky top-0 h-screen bg-[var(--color-bg-secondary)] overflow-y-auto">
          {sidebarContent}
        </aside>

        {/* Sidebar — off-canvas drawer below `lg` */}
        {isDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeDrawer}
              aria-hidden="true"
            />
            <div
              ref={drawerRef}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="absolute inset-y-0 left-0 w-[260px] max-w-[85vw] flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] shadow-2xl"
            >
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                className="absolute top-4 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X size={16} aria-hidden="true" />
              </button>
              <div className="flex-1 flex flex-col overflow-y-auto">
                {sidebarContent}
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-10">

          {/* Top bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 sm:mb-8 border-b border-[var(--color-border)] pb-5 sm:pb-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                ref={hamburgerRef}
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
                aria-controls="mobile-nav-drawer"
                className="lg:hidden shrink-0 w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)] flex items-center justify-center transition-colors"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] truncate">
                  {currentMenu}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[var(--color-text-muted)] mt-1 truncate">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto">
              {/* Global Search Bar */}
              <div
                className="relative z-50 flex-1 min-w-0 md:flex-none"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={(e) => {
                  // Keep the panel open while focus moves between the input and
                  // its result buttons.
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                  setIsSearchFocused(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchFocused(false);
                    searchInputRef.current?.blur();
                  }
                }}
              >
                <div
                  className={`flex items-center bg-[var(--color-bg-secondary)] border rounded-lg px-3 py-1.5 w-full md:w-64 lg:w-72 transition-all ${
                    isSearchFocused ? 'border-[var(--color-purple-glow)] ring-1 ring-[var(--color-purple-glow)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <Search size={14} className="text-[var(--color-text-muted)] mr-2 shrink-0" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    aria-label="Search globally"
                    placeholder="Search globally... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setIsSearchFocused(true); handleSearch(e.target.value); }}
                    className="bg-transparent border-none outline-none text-[13px] text-[var(--color-text-primary)] w-full min-w-0 placeholder:text-[var(--color-text-muted)]"
                  />
                </div>

                {/* Search Results Dropdown */}
                {isSearchFocused && searchQuery.trim() && (
                  <div
                    role="group"
                    aria-label="Search results"
                    className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl max-h-80 overflow-y-auto"
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((res, i) => (
                        <button
                          key={i}
                          type="button"
                          // Keep focus in the input so the panel survives the
                          // press in every browser; the click still fires.
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            res.action();
                            setSearchQuery('');
                            setSearchResults([]);
                            setIsSearchFocused(false);
                            // Keyboard users activate a result while it holds
                            // focus — hand focus back to the input before the
                            // panel unmounts.
                            searchInputRef.current?.focus();
                          }}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--color-bg-card-hover)] focus:bg-[var(--color-bg-card-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-purple-glow)] border-b border-[var(--color-border)] last:border-0 transition-colors"
                        >
                          <span className="w-7 h-7 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center shrink-0">
                            <res.icon size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate">{res.title}</span>
                            <span className="block text-[11px] text-[var(--color-text-muted)] truncate">{res.subtitle}</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[13px] text-[var(--color-text-muted)]">
                        No results found for &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              <NotificationBell color={color} />

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Level {user.accessLevel}</span>
              </div>
            </div>
          </div>

          {showHomeWidgets && (
            <>
              {/* Welcome banner */}
              <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] mb-6 sm:mb-8 p-5 sm:p-6 lg:p-8 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-purple-glow)] opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" aria-hidden="true" />

                <div className="relative z-10 flex items-start justify-between gap-4 sm:gap-6">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color }}>
                      Workspace Active
                    </div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
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
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} aria-hidden="true" />
                            {v.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="hidden md:flex shrink-0 w-12 h-12 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] items-center justify-center">
                     <Hexagon size={24} style={{ color }} strokeWidth={2} aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {[
                  { label: 'Access Level', value: `Level ${user.accessLevel}`, sub: user.levelName, icon: ShieldCheck },
                  { label: 'Department', value: user.department || 'Executive', sub: user.designation || 'Oversight', icon: Briefcase },
                  { label: 'Employee ID', value: user.employeeId || 'Global Auth', sub: 'Verified Session', icon: Lock },
                  { label: 'Workspace', value: user.venture?.name || 'All Ventures', sub: 'Active Environment', icon: Building2 },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--color-bg-card)] rounded-xl p-4 sm:p-5 border border-[var(--color-border)] shadow-sm hover:border-[var(--color-text-muted)] transition-colors min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">
                        {s.label}
                      </div>
                      <s.icon size={14} className="text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)] mb-0.5 truncate">
                      {s.value}
                    </div>
                    <div className="text-[12px] font-medium text-[var(--color-text-secondary)] truncate">{s.sub}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Content Area */}
          <div className="min-h-[400px]">
            {user.accessLevel === 9 && currentMenu !== 'Settings' ? (
              <ClientPortalView currentUser={user} />
            ) : OVERVIEW_MENUS.includes(currentMenu) ? (
              <OverviewView currentUser={user} />
            ) : currentMenu === 'Tasks' || currentMenu === 'My Tasks' ? (
              <TasksView currentUser={user} />
            ) : currentMenu === 'User Management' || currentMenu === 'Team Members' ? (
              <UserManagementView currentUser={user} />
            ) : ['Projects', 'My Projects', 'Project Status', 'Deliverables'].includes(currentMenu) ? (
              <ProjectsView currentUser={user} />
            ) : ['Team Chat', 'Messages'].includes(currentMenu) ? (
              <ChatView currentUser={user} />
            ) : currentMenu === 'Audit Logs' ? (
              <AuditLogsView />
            ) : currentMenu === 'Documents' ? (
              <DocumentsView currentUser={user} />
            ) : currentMenu === 'Timesheets' ? (
              <TimesheetsView currentUser={user} />
            ) : currentMenu === 'Calendar' ? (
              <CalendarView currentUser={user} />
            ) : currentMenu === 'Approvals' ? (
              <ApprovalsView currentUser={user} />
            ) : currentMenu === 'Strategy' ? (
              <StrategyView currentUser={user} />
            ) : currentMenu === 'Financials' || currentMenu === 'Budget' ? (
              <BudgetView currentUser={user} />
            ) : currentMenu === 'Department KPIs' || currentMenu === 'HR Overview' || currentMenu === 'Team Management' ? (
              <DepartmentKPIsView currentUser={user} />
            ) : currentMenu === 'Invoices' ? (
              <InvoicesView currentUser={user} />
            ) : currentMenu === 'Settings' ? (
              <SettingsView currentUser={user} />
            ) : currentMenu === 'Reports' ? (
              <ReportsView currentUser={user} />
            ) : currentMenu === 'Learning Hub' ? (
              <LearningHubView currentUser={user} />
            ) : (
              <div className="bg-[var(--color-bg-card)] rounded-2xl p-8 sm:p-12 border border-[var(--color-border)] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] flex items-center justify-center mb-6">
                  <Lock size={24} className="text-[var(--color-text-muted)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  {currentMenu} Module
                </h3>
                <p className="text-sm font-medium text-[var(--color-text-secondary)] max-w-md">
                  This section is currently under development. Your workspace environment will be updated automatically when it becomes available.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SocketProvider>
  );
}
