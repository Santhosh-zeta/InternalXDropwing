'use client';

import { Hexagon, LogOut, Crown, Building2, Briefcase, User as UserIcon } from 'lucide-react';
import type { User } from '@/lib/constants';
import { GROUP_ORDER, itemLabel, type MenuItem } from './menu';

export const LEVEL_COLORS: Record<number, string> = {
  1: '#8b5cf6', 2: '#a78bfa', 3: '#7c3aed',
  4: '#06b6d4', 5: '#f59e0b', 6: '#10b981',
  7: '#6366f1', 8: '#0ea5e9', 9: '#f43f5e',
};

interface SidebarBodyProps {
  user: User;
  items: MenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
}

/** Sidebar content, rendered in the desktop rail and in the mobile drawer. */
export default function SidebarBody({ user, items, activeId, onSelect, onLogout }: SidebarBodyProps) {
  const color = LEVEL_COLORS[user.accessLevel] ?? LEVEL_COLORS[7];
  const Avatar = user.accessLevel === 1 ? Crown : user.accessLevel === 2 ? Building2 : user.accessLevel === 9 ? Briefcase : UserIcon;

  return (
    <>
      <div className="border-b border-[var(--color-border)] p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-purple-glow)] text-white shadow-sm">
            <Hexagon size={16} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-none tracking-tight text-[var(--color-text-primary)]">InternalX</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Dropwing Groups</div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <Avatar size={18} style={{ color }} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{user.fullName}</div>
              <div className="truncate text-[11px] font-medium" style={{ color }}>{user.levelName}</div>
              {user.venture && (
                <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{user.venture.name}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-4 p-3">
        {GROUP_ORDER.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group}>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{group}</div>
              <ul className="m-0 list-none space-y-0.5 p-0">
                {groupItems.map((item) => {
                  const active = item.id === activeId;
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-purple-glow)] ${
                          active
                            ? 'bg-[var(--color-purple-glow)] text-white shadow-sm'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        <Icon size={16} strokeWidth={active ? 2.5 : 2} aria-hidden="true" className={`shrink-0 ${active ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                        <span className="truncate">{itemLabel(item, user)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[13px] font-medium text-rose-500 transition-colors hover:bg-rose-500/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-500"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </>
  );
}
