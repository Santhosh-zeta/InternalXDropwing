'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Folder, ListTodo, Plus } from 'lucide-react';
import { deleteTask, errMsg, getProjects, getTasks, getUsers, updateTask } from '@/lib/api';
import { unwrapList, useApi } from '@/lib/useApi';
import type { Task, TaskStatus } from '@/lib/types';
import type { User } from '@/lib/constants';
import { AsyncState, Button, EmptyState, Select, Skeleton, SkeletonCard, useConfirm } from '@/components/ui';
import TaskBoard from './tasks/TaskBoard';
import TaskForm from './tasks/TaskForm';

const STATUS_LABEL: Record<TaskStatus, string> = { pending: 'Pending', 'in-progress': 'In progress', completed: 'Completed' };

function BoardSkeleton() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex min-w-[280px] flex-1 flex-col gap-4 rounded-2xl bg-[var(--color-bg-secondary)] p-4">
          <Skeleton height={44} />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export default function TasksView({ currentUser }: { currentUser: User }) {
  const tasks = useApi('tasks', (s) => unwrapList(getTasks(s)), { toastOnError: 'auto' });
  // People and projects only feed the form and the filter; the board works without them.
  const users = useApi('tasks-users', (s) => unwrapList(getUsers(s)));
  const projects = useApi('tasks-projects', (s) => unwrapList(getProjects(s)));

  const [editing, setEditing] = useState<Task | null | undefined>(undefined); // undefined = closed, null = new
  const [projectFilter, setProjectFilter] = useState('all');
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'));
  const confirm = useConfirm();

  // Mirrors backend/src/routes/task.routes.js: create/edit L<=7, delete L<=5.
  const canWrite = currentUser.accessLevel <= 7;
  const canDelete = currentUser.accessLevel <= 5;
  const canEdit = (t: Task) =>
    canWrite && (currentUser.accessLevel <= 5 || currentUser.id === t.assigned_by || t.assignees?.some((a) => a.id === currentUser.id));

  const all = tasks.data ?? [];
  const visible = all.filter((t) => projectFilter === 'all' || t.project_id === Number(projectFilter));

  const move = async (task: Task, status: TaskStatus) => {
    tasks.setData((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      const res = await updateTask(task.id, { status });
      if (!res.success) throw new Error(res.message);
      toast.success(`Moved to ${STATUS_LABEL[status]}`);
    } catch (err) {
      toast.error(errMsg(err, 'Could not move the task'));
      tasks.refetch();
    }
  };

  const remove = async (task: Task) => {
    const ok = await confirm({
      title: 'Delete this task?',
      description: 'The task and its assignments will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await deleteTask(task.id);
      if (!res.success) throw new Error(res.message);
      toast.success('Task deleted');
      tasks.setData((prev) => prev?.filter((t) => t.id !== task.id));
    } catch (err) {
      toast.error(errMsg(err, 'Could not delete the task'));
    }
  };

  const newTaskButton = (label: string) => (
    <Button variant="primary" size="sm" leadingIcon={<Plus size={16} strokeWidth={2.5} aria-hidden="true" />} onClick={() => setEditing(null)}>
      {label}
    </Button>
  );

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Tasks</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Organize and track work. Drag a card, or use its arrows, to change its status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select aria-label="Filter tasks by project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-9 w-auto min-w-40">
            <option value="all">All projects</option>
            {(projects.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          {canWrite && newTaskButton('New task')}
        </div>
      </div>

      <AsyncState loading={tasks.loading} error={tasks.error} onRetry={tasks.refetch} what="tasks" skeleton={<BoardSkeleton />}>
        {all.length === 0 ? (
          <EmptyState
            icon={<ListTodo size={22} aria-hidden="true" />}
            title="No tasks yet"
            description={canWrite ? 'Tasks are how work gets assigned and tracked. Create the first one and it will appear on the board.' : 'Nothing has been assigned to you yet. A manager can assign you a task.'}
            action={canWrite ? newTaskButton('Create the first task') : undefined}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Folder size={22} aria-hidden="true" />}
            title="No tasks in this project"
            description="Nothing is assigned to the selected project yet. Clear the filter to see every task."
            action={<Button variant="secondary" onClick={() => setProjectFilter('all')}>Show all projects</Button>}
          />
        ) : (
          <TaskBoard tasks={visible} today={today} canMove={canWrite} canEdit={canEdit} canDelete={canDelete} onMove={move} onEdit={setEditing} onDelete={remove} />
        )}
      </AsyncState>

      {editing !== undefined && (
        <TaskForm
          key={editing?.id ?? 'new'}
          task={editing}
          users={users.data ?? []}
          projects={projects.data ?? []}
          tasks={all}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); tasks.refetch(); }}
        />
      )}
    </div>
  );
}
