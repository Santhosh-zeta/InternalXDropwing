'use client';

import { Calendar, LayoutList, UserPlus } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Badge } from '@/components/ui';
import { PRIORITIES, STATUSES, parseTags } from './constants';

interface Props {
  projects: Project[];
  /** `YYYY-MM-DD`; passed in so rendering stays pure. */
  today: string;
  onOpen: (project: Project) => void;
}

/** Projects grouped by phase. Each card is one real button, so it works by keyboard. */
export default function ProjectBoard({ projects, today, onOpen }: Props) {
  return (
    <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-4 sm:gap-6">
      {STATUSES.map((group) => {
        const items = projects.filter((p) => p.status === group.id);
        return (
          <section key={group.id} aria-label={`${group.label}, ${items.length} projects`} className="flex w-[300px] shrink-0 flex-col gap-4 sm:w-[340px]">
            <div className="flex items-center justify-between rounded-xl border bg-[var(--color-bg-secondary)] px-4 py-3 shadow-sm" style={{ borderColor: `${group.color}30` }}>
              <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: group.color }}>
                {group.icon} {group.label}
              </h3>
              <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: `${group.color}20`, color: group.color }}>{items.length}</span>
            </div>

            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {items.map((project) => {
                const color = project.venture_color || '#8b5cf6';
                const total = project.task_count ?? 0;
                const done = project.completed_task_count ?? 0;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                const prio = PRIORITIES.find((p) => p.id === project.priority)?.color ?? '#8b5cf6';
                const end = project.end_date?.slice(0, 10);
                const members = project.members ?? [];
                return (
                  <li key={project.id} className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 transition-colors hover:border-[var(--color-text-muted)] focus-within:border-[var(--color-purple-glow)]" style={{ borderLeft: `4px solid ${color}` }}>
                    <button
                      type="button"
                      onClick={() => onOpen(project)}
                      aria-label={`Open project ${project.name}`}
                      className="absolute inset-0 z-10 cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-purple-glow)]"
                    />
                    <div className="mb-3 flex flex-wrap gap-2">
                      {project.venture_name && <Badge color={color}>{project.venture_name}</Badge>}
                      {project.priority && <Badge color={prio}>{project.priority}</Badge>}
                      {parseTags(project.tags).map((tag) => (
                        <Badge key={tag} tone="neutral">{tag}</Badge>
                      ))}
                    </div>

                    <h4 className="mb-1 truncate text-[15px] font-bold leading-snug text-[var(--color-text-primary)]">{project.name}</h4>
                    <p className="mb-4 line-clamp-2 h-9 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{project.description || 'No description.'}</p>

                    <div className="mb-4">
                      <div className="mb-1.5 flex justify-between text-[11px] font-bold text-[var(--color-text-muted)]">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${project.name} progress`}>
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, background: color }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                      <div className="flex -space-x-2">
                        {members.slice(0, 3).map((m) => (
                          <div key={m.user_id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-bg-card)] bg-[var(--color-bg-secondary)] text-[10px] font-bold text-[var(--color-text-secondary)]" title={m.full_name}>
                            {m.full_name?.charAt(0)}
                          </div>
                        ))}
                        {members.length > 3 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-bg-card)] bg-[var(--color-bg-secondary)] text-[9px] font-bold text-[var(--color-text-muted)]">+{members.length - 3}</div>
                        )}
                        {members.length === 0 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-bg-card)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]" title="No members assigned">
                            <UserPlus size={10} aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
                          <LayoutList size={12} aria-hidden="true" /> {done}/{total}
                          <span className="sr-only"> tasks done</span>
                        </span>
                        {end && (
                          <span className={`flex items-center gap-1 text-[11px] font-bold ${end < today && project.status !== 'completed' ? 'text-[var(--color-rose)]' : 'text-[var(--color-text-secondary)]'}`}>
                            <Calendar size={12} aria-hidden="true" />
                            {new Date(`${end}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              {items.length === 0 && (
                <li className="list-none rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-[11px] font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
                  Nothing in {group.label.toLowerCase()}
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
