import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import {
  Home, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, ClipboardCheck, FileText,
  Clock, Users, TrendingUp, Wallet, PieChart, Receipt, BarChart3, MessageSquare, BookOpen,
  ShieldCheck, Settings, Briefcase, Sparkles, type LucideIcon,
} from 'lucide-react';
import type { User } from '@/lib/constants';
import { SkeletonTable } from '@/components/ui';

export type ViewProps = { currentUser: User };

/** Each view is its own chunk, so recharts / jsPDF load only when needed. */
const load = (importer: () => Promise<{ default: ComponentType<ViewProps> }>) =>
  dynamic(importer, {
    loading: () => (
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading…</span>
        <SkeletonTable rows={5} columns={4} />
      </div>
    ),
  });

export type MenuGroup = 'Work' | 'Company' | 'Team' | 'Account';

export interface MenuItem {
  /** URL id: `/dashboard?view=<id>`. Stable, lowercase, no spaces. */
  id: string;
  label: string | ((user: User) => string);
  icon: LucideIcon;
  group: MenuGroup;
  component: ComponentType<ViewProps>;
  /**
   * Level bounds, mirroring the API (docs/data-isolation.md). Lower number =
   * more power: `maxLevel: 5` means levels 1..5 may open it, `minLevel: 9`
   * means clients only. Defaults: 1 and 8 (every internal level, no clients).
   */
  minLevel?: number;
  maxLevel?: number;
  /** Extra rule on top of the level bounds. */
  visible?: (user: User) => boolean;
}

/**
 * The single list of dashboard views. To add one, append an entry: the
 * sidebar, the URL (`?view=<id>`), access gating and the page title all come
 * from here. The server enforces the same rules; this only decides what to
 * offer. Order is the sidebar order within each group.
 */
export const MENU: MenuItem[] = [
  { id: 'home', label: 'Today', icon: Home, group: 'Work', component: load(() => import('./HomeView')) },
  { id: 'portal', label: 'Project Status', icon: Briefcase, group: 'Work', minLevel: 9, maxLevel: 9, component: load(() => import('./ClientPortalView')) },
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Work', maxLevel: 5, component: load(() => import('./OverviewView')) },
  { id: 'projects', label: (u) => (u.accessLevel >= 6 ? 'My Projects' : 'Projects'), icon: FolderKanban, group: 'Work', component: load(() => import('./ProjectsView')) },
  { id: 'tasks', label: (u) => (u.accessLevel >= 6 ? 'My Tasks' : 'Tasks'), icon: CheckSquare, group: 'Work', component: load(() => import('./TasksView')) },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, group: 'Work', component: load(() => import('./CalendarView')) },
  { id: 'approvals', label: 'Approvals', icon: ClipboardCheck, group: 'Work', maxLevel: 5, component: load(() => import('./ApprovalsView')) },
  { id: 'timesheets', label: 'Timesheets', icon: Clock, group: 'Work', minLevel: 6, component: load(() => import('./TimesheetsView')) },
  { id: 'documents', label: 'Documents', icon: FileText, group: 'Work', component: load(() => import('./DocumentsView')) },

  { id: 'team', label: (u) => (u.accessLevel <= 3 ? 'User Management' : 'Team'), icon: Users, group: 'Company', maxLevel: 5, component: load(() => import('./UserManagementView')) },
  { id: 'strategy', label: 'Strategy', icon: TrendingUp, group: 'Company', maxLevel: 4, component: load(() => import('./StrategyView')) },
  { id: 'kpis', label: 'Department KPIs', icon: PieChart, group: 'Company', maxLevel: 4, component: load(() => import('./DepartmentKPIsView')) },
  { id: 'budget', label: 'Budget', icon: Wallet, group: 'Company', maxLevel: 4, component: load(() => import('./BudgetView')) },
  { id: 'invoices', label: 'Invoices', icon: Receipt, group: 'Company', maxLevel: 5, component: load(() => import('./InvoicesView')) },
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'Company', maxLevel: 5, component: load(() => import('./ReportsView')) },

  { id: 'chat', label: 'Team Chat', icon: MessageSquare, group: 'Team', component: load(() => import('./ChatView')) },
  { id: 'assistant', label: 'Ask InternalX', icon: Sparkles, group: 'Team', component: load(() => import('./AssistantView')) },
  { id: 'learning', label: 'Learning Hub', icon: BookOpen, group: 'Team', visible: (u) => u.accessLevel <= 5 || u.accessLevel === 8, component: load(() => import('./LearningHubView')) },

  { id: 'audit', label: 'Audit Logs', icon: ShieldCheck, group: 'Account', maxLevel: 2, component: load(() => import('./AuditLogsView')) },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Account', minLevel: 1, maxLevel: 9, component: load(() => import('./SettingsView')) },
];

export const GROUP_ORDER: MenuGroup[] = ['Work', 'Company', 'Team', 'Account'];

export const itemLabel = (item: MenuItem, user: User): string =>
  typeof item.label === 'function' ? item.label(user) : item.label;

export function canSee(item: MenuItem, user: User): boolean {
  const level = user.accessLevel;
  if (level < (item.minLevel ?? 1) || level > (item.maxLevel ?? 8)) return false;
  return item.visible ? item.visible(user) : true;
}

/** Menu entries this user is offered, in sidebar order. */
export const menuFor = (user: User): MenuItem[] => MENU.filter((item) => canSee(item, user));

/** The first view a user lands on: Today for staff, the portal for clients. */
export const defaultViewId = (user: User): string => (user.accessLevel === 9 ? 'portal' : 'home');

/** Resolve `?view=` to an allowed item, falling back to the user's landing view. */
export function resolveView(user: User, id: string | null): MenuItem {
  const items = menuFor(user);
  return items.find((i) => i.id === id) ?? items.find((i) => i.id === defaultViewId(user)) ?? items[0];
}
