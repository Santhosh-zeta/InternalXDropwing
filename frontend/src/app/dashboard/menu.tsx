import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import {
  Home, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, ClipboardCheck, FileText,
  Clock, Users, Wallet, PieChart, BarChart3, MessageSquare, BookOpen,
  ShieldCheck, Settings, Briefcase, Sparkles, Code2, type LucideIcon,
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

export type MenuGroup = 'Engineering' | 'Quality & Specs' | 'Management' | 'Studio';

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
 * Fenixa Solutions - End-to-end Software Development & Management Suite.
 * Primary focus is software lifecycle: Requirements, Sprints, Kanban Board,
 * Roadmaps, QA Defects, Releases, and Retrospectives.
 */
export const MENU: MenuItem[] = [
  // Engineering Core Lifecycle
  { id: 'software', label: 'Software Studio', icon: Code2, group: 'Engineering', component: load(() => import('./SoftwareStudioView')) },
  { id: 'tasks', label: (u) => (u.accessLevel >= 6 ? 'My Issues & Bugs' : 'Issues & Bugs'), icon: CheckSquare, group: 'Engineering', component: load(() => import('./TasksView')) },
  { id: 'projects', label: 'Software Projects', icon: FolderKanban, group: 'Engineering', component: load(() => import('./ProjectsView')) },
  { id: 'calendar', label: 'Sprint Deadlines & Releases', icon: CalendarDays, group: 'Engineering', component: load(() => import('./CalendarView')) },
  { id: 'home', label: 'Daily Standup', icon: Home, group: 'Engineering', component: load(() => import('./HomeView')) },

  // Quality, Specs & Delivery
  { id: 'documents', label: 'Architecture & Tech Specs', icon: FileText, group: 'Quality & Specs', component: load(() => import('./DocumentsView')) },
  { id: 'approvals', label: 'Code & Sprint Approvals', icon: ClipboardCheck, group: 'Quality & Specs', maxLevel: 5, component: load(() => import('./ApprovalsView')) },
  { id: 'timesheets', label: 'Dev Worklogs', icon: Clock, group: 'Quality & Specs', minLevel: 6, component: load(() => import('./TimesheetsView')) },
  { id: 'portal', label: 'Client Delivery Portal', icon: Briefcase, group: 'Quality & Specs', minLevel: 9, maxLevel: 9, component: load(() => import('./ClientPortalView')) },

  // Engineering Operations & Management
  { id: 'overview', label: 'Engineering Overview', icon: LayoutDashboard, group: 'Management', maxLevel: 5, component: load(() => import('./OverviewView')) },
  { id: 'kpis', label: 'Velocity & KPIs', icon: PieChart, group: 'Management', maxLevel: 4, component: load(() => import('./DepartmentKPIsView')) },
  { id: 'team', label: (u) => (u.accessLevel <= 3 ? 'Engineer Management' : 'Engineering Team'), icon: Users, group: 'Management', maxLevel: 5, component: load(() => import('./UserManagementView')) },
  { id: 'budget', label: 'Cloud & Project Costing', icon: Wallet, group: 'Management', maxLevel: 4, component: load(() => import('./BudgetView')) },
  { id: 'reports', label: 'Sprint & Release Reports', icon: BarChart3, group: 'Management', maxLevel: 5, component: load(() => import('./ReportsView')) },

  // Collaboration & Studio
  { id: 'chat', label: 'Developer Chat', icon: MessageSquare, group: 'Studio', component: load(() => import('./ChatView')) },
  { id: 'assistant', label: 'Fenixa AI Architect', icon: Sparkles, group: 'Studio', component: load(() => import('./AssistantView')) },
  { id: 'learning', label: 'Engineering Wiki & Docs', icon: BookOpen, group: 'Studio', visible: (u) => u.accessLevel <= 5 || u.accessLevel === 8, component: load(() => import('./LearningHubView')) },
  { id: 'audit', label: 'DevOps & Audit Logs', icon: ShieldCheck, group: 'Studio', maxLevel: 2, component: load(() => import('./AuditLogsView')) },
  { id: 'settings', label: 'Studio Settings', icon: Settings, group: 'Studio', minLevel: 1, maxLevel: 9, component: load(() => import('./SettingsView')) },
];

export const GROUP_ORDER: MenuGroup[] = ['Engineering', 'Quality & Specs', 'Management', 'Studio'];

export const itemLabel = (item: MenuItem, user: User): string =>
  typeof item.label === 'function' ? item.label(user) : item.label;

export function canSee(item: MenuItem, user: User): boolean {
  const level = user.accessLevel;
  if (level < (item.minLevel ?? 1) || level > (item.maxLevel ?? 8)) return false;
  return item.visible ? item.visible(user) : true;
}

/** Menu entries this user is offered, in sidebar order. */
export const menuFor = (user: User): MenuItem[] => MENU.filter((item) => canSee(item, user));

/** The first view a user lands on: Software Studio for engineers/staff, client portal for clients. */
export const defaultViewId = (user: User): string => (user.accessLevel === 9 ? 'portal' : 'software');

/** Resolve `?view=` to an allowed item, falling back to the user's landing view. */
export function resolveView(user: User, id: string | null): MenuItem {
  const items = menuFor(user);
  return items.find((i) => i.id === id) ?? items.find((i) => i.id === defaultViewId(user)) ?? items[0];
}
