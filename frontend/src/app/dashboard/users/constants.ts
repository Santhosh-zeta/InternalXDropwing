import type { TeamMember } from '@/lib/types';
import type { User } from '@/lib/constants';

export const DEPARTMENTS = [
  'Executive', 'Engineering', 'Design', 'Product', 'Operations',
  'Marketing', 'Sales', 'HR', 'Finance', 'External', 'Other',
];

export const DESIGNATIONS = [
  'Super Administrator', 'Managing Director', 'Administrator',
  'Chief Executive Officer', 'Chief Technology Officer', 'Chief Operating Officer',
  'Product Manager', 'Project Manager', 'Senior Designer', 'UI/UX Designer',
  'Senior Developer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Software Intern', 'Executive Officer', 'Client', 'Other',
];

export const LEVELS: { level: number; name: string; desc: string }[] = [
  { level: 1, name: 'Super Admin', desc: 'Everything, in every venture' },
  { level: 2, name: 'Managing Director', desc: 'Strategic oversight across all ventures' },
  { level: 3, name: 'Admin', desc: 'Administers one venture and its people' },
  { level: 4, name: 'CXO', desc: 'Sees all data of one venture; creates projects' },
  { level: 5, name: 'Manager', desc: 'Manages a venture team; approves timesheets' },
  { level: 6, name: 'Executive Staff', desc: 'Works on the projects they are a member of' },
  { level: 7, name: 'Staff', desc: 'Standard employee access' },
  { level: 8, name: 'Intern', desc: 'Limited access for the internship period' },
  { level: 9, name: 'Client', desc: 'External: sees only the portal for their projects' },
];

export const SECTION_LABEL = 'block text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';

/**
 * Mirrors backend/src/utils/canManageUser.js: only L1-L3 manage people, L1 may
 * manage anyone, L2 and L3 only people below their own level, and L3 only in
 * their own venture. The server remains the authority.
 */
export function canManage(actor: User, target: TeamMember): boolean {
  const level = actor.accessLevel;
  if (level > 3) return false;
  if (level === 1) return true;
  if (target.access_level <= level) return false;
  return level <= 2 || target.venture_id === (actor.venture?.id ?? null);
}

export function canDelete(actor: User, target: TeamMember): boolean {
  return canManage(actor, target) && target.id !== actor.id;
}

/** Levels the actor may assign (create or change to). */
export const assignableLevels = (actor: User) =>
  LEVELS.filter((l) => actor.accessLevel === 1 || l.level > actor.accessLevel);
