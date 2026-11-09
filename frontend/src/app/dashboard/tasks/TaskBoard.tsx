'use client';

import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Clock4, CornerDownRight, Edit2, Folder,
  GripVertical, ListTodo, Trash2, type LucideIcon,
} from 'lucide-react';
import type { Priority, Task, TaskStatus } from '@/lib/types';
import { Badge, Button, type BadgeTone } from '@/components/ui';

const PRIORITY_TONES: Record<Priority, BadgeTone> = { low: 'success', medium: 'info', high: 'warning', urgent: 'danger' };

const COLUMNS: { id: TaskStatus; title: string; icon: LucideIcon; color: string }[] = [
  { id: 'pending', title: 'Pending', icon: ListTodo, color: '#8b5cf6' },
  { id: 'in-progress', title: 'In progress', icon: Clock, color: '#0ea5e9' },
  { id: 'completed', title: 'Completed', icon: CheckCircle2, color: '#10b981' },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

interface Props {
  tasks: Task[];
  /** `YYYY-MM-DD` for "today"; passed in so rendering stays pure. */
  today: string;
  /** Status changes (drag / arrows). */
  canMove: boolean;
  canEdit: (task: Task) => boolean;
  canDelete: boolean;
  onMove: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

/** Three-column board. Cards can be dragged, or moved with the arrow buttons (touch and keyboard). */
export default function TaskBoard({ tasks, today, canMove, canEdit, canDelete, onMove, onEdit, onDelete }: Props) {
  const drop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('taskId'));
    const task = tasks.find((t) => t.id === id);
    if (canMove && task && task.status !== status) onMove(task, status);
  };

  return (
    <div className="flex min-h-[420px] gap-4 overflow-x-auto pb-4 sm:gap-6">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        return (
          <section
            key={col.id}
            aria-label={`${col.title}, ${items.length} tasks`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => drop(e, col.id)}
            className="flex min-w-[280px] flex-1 flex-col gap-4 rounded-2xl border border-transparent bg-[var(--color-bg-secondary)] p-3 transition-colors hover:border-[var(--color-border)] sm:min-w-[320px] sm:p-4"
          >
            <div className="flex items-center gap-2.5 rounded-xl border bg-[var(--color-bg-card)] px-4 py-3" style={{ borderColor: `${col.color}20` }}>
              <col.icon size={18} style={{ color: col.color }} strokeWidth={2.5} aria-hidden="true" />
              <h3 className="text-[14px] font-bold tracking-wide" style={{ color: col.color }}>{col.title}</h3>
              <span className="ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${col.color}10`, color: col.color, borderColor: `${col.color}30` }}>
                {items.length}
              </span>
            </div>

            <ul className="m-0 flex min-h-[100px] list-none flex-col gap-3 p-0">
              {items.map((task) => {
                const due = task.due_date?.slice(0, 10);
                const overdue = !!due && due < today && task.status !== 'completed';
                const others = task.assignees ?? [];
                return (
                  <li
                    key={task.id}
                    draggable={canMove}
                    onDragStart={(e) => { e.dataTransfer.setData('taskId', String(task.id)); e.dataTransfer.effectAllowed = 'move'; }}
                    className={`group relative overflow-hidden rounded-xl border bg-[var(--color-bg-card)] p-4 shadow-sm transition-shadow hover:shadow-md ${canMove ? 'cursor-grab' : ''}`}
                    style={{ borderColor: overdue ? 'color-mix(in srgb, var(--color-rose) 40%, transparent)' : 'var(--color-border)' }}
                  >
                    {overdue && <div aria-hidden="true" className="absolute left-0 top-0 h-full w-1 bg-[var(--color-rose)]" />}

                    <div className="mb-3 flex items-center justify-between">
                      <Badge tone={PRIORITY_TONES[task.priority]}>{task.priority}</Badge>
                      <div className="flex items-center gap-1">
                        <GripVertical size={14} aria-hidden="true" className="text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                        {canEdit(task) && (
                          <Button iconOnly aria-label={`Edit task: ${task.title}`} variant="ghost" size="sm" onClick={() => onEdit(task)} className="opacity-60 hover:opacity-100 focus-visible:opacity-100">
                            <Edit2 size={14} aria-hidden="true" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button iconOnly aria-label={`Delete task: ${task.title}`} variant="ghost" size="sm" onClick={() => onDelete(task)} className="opacity-60 hover:text-[var(--color-rose)] hover:opacity-100 focus-visible:opacity-100">
                            <Trash2 size={14} aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <h4 className="mb-2 text-[14px] font-semibold leading-snug text-[var(--color-text-primary)] [overflow-wrap:anywhere]">{task.title}</h4>

                    {task.project_name && (
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-purple-glow)]">
                        <Folder size={12} aria-hidden="true" /> <span className="truncate">{task.project_name}</span>
                      </div>
                    )}
                    {task.parent_task_title && (
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                        <CornerDownRight size={12} aria-hidden="true" /> <span className="truncate">Subtask of {task.parent_task_title}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className={`mb-3 flex items-center gap-1.5 text-[11px] font-semibold ${overdue ? 'text-[var(--color-rose)]' : 'text-[var(--color-text-muted)]'}`}>
                        {overdue ? <AlertCircle size={12} aria-hidden="true" /> : <Clock4 size={12} aria-hidden="true" />}
                        {fmtDate(task.due_date)}
                        {overdue && <span>(overdue)</span>}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex -space-x-2">
                          {others.slice(0, 3).map((a) => (
                            <div key={a.id} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[10px] font-bold text-[var(--color-text-primary)]" title={a.name}>
                              {a.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                        <span className="truncate text-[11px] font-medium text-[var(--color-text-secondary)]">
                          {others.length === 0 ? 'Unassigned' : others.length === 1 ? others[0].name : `${others.length} assignees`}
                        </span>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        {canMove && COLUMNS.filter((c) => c.id !== col.id).map((c) => (
                          <Button
                            key={c.id}
                            iconOnly
                            size="sm"
                            variant="secondary"
                            aria-label={`Move "${task.title}" to ${c.title}`}
                            onClick={() => onMove(task, c.id)}
                          >
                            {COLUMNS.findIndex((x) => x.id === c.id) > COLUMNS.findIndex((x) => x.id === col.id)
                              ? <ChevronRight size={14} aria-hidden="true" />
                              : <ChevronLeft size={14} aria-hidden="true" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}

              {items.length === 0 && (
                <li className="list-none rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 text-center text-[12px] font-medium text-[var(--color-text-muted)]">
                  Nothing in {col.title.toLowerCase()}. Drag a card here.
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
