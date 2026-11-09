'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { createTask, errMsg, updateTask } from '@/lib/api';
import type { Priority, Project, Task, TeamMember } from '@/lib/types';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';

const FORM_ID = 'task-form';
const LABEL_CLASS = 'block text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';

interface Props {
  /** Task being edited, or null to create. */
  task: Task | null;
  users: TeamMember[];
  projects: Project[];
  /** Other tasks, offered as parents for a subtask. */
  tasks: Task[];
  onClose: () => void;
  onSaved: () => void;
}

/** Create / edit dialog. Mounted only while open (keyed by task), so its state always starts fresh. */
export default function TaskForm({ task, users, projects, tasks, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: (task?.priority ?? 'medium') as Priority,
    assigned_to: task?.assignees?.map((a) => String(a.id)) ?? ([] as string[]),
    due_date: task?.due_date ? task.due_date.slice(0, 10) : '',
    project_id: task?.project_id ? String(task.project_id) : '',
    parent_task_id: task?.parent_task_id ? String(task.parent_task_id) : '',
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || form.assigned_to.length === 0) {
      toast.error('A title and at least one assignee are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        due_date: form.due_date || undefined,
        project_id: form.project_id || undefined,
        parent_task_id: form.parent_task_id || undefined,
      };
      const res = task ? await updateTask(task.id, payload) : await createTask(payload);
      if (!res.success) throw new Error(res.message);
      toast.success(task ? 'Task updated' : 'Task created');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, task ? 'Failed to update task' : 'Failed to create task'));
    } finally {
      setSaving(false);
    }
  };

  const parents = tasks.filter((t) => t.id !== task?.id && (!form.project_id || t.project_id === Number(form.project_id)));

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      description={task ? 'Update the details of this task.' : 'Describe the work and pick who owns it.'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={saving}>{task ? 'Save changes' : 'Create task'}</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Title" required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required maxLength={255} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="E.g., Update landing page design" />
          )}
        </Field>

        <Field label="Description">
          {({ id, describedBy }) => (
            <Textarea id={id} aria-describedby={describedBy} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Task details…" />
          )}
        </Field>

        <div className="flex flex-col gap-4 sm:flex-row">
          <fieldset className="m-0 min-w-0 flex-1 border-0 p-0">
            <legend className={`${LABEL_CLASS} mb-2`}>
              Assign to
              <span className="ml-1 text-[var(--color-rose)]" aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </legend>
            <div className="custom-scrollbar flex max-h-[120px] w-full flex-col gap-1 overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-2">
              {users.map((u) => {
                const value = String(u.id);
                return (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-[13px] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-card-hover)]">
                    <input
                      type="checkbox"
                      checked={form.assigned_to.includes(value)}
                      onChange={(e) => set('assigned_to', e.target.checked ? [...form.assigned_to, value] : form.assigned_to.filter((x) => x !== value))}
                      className="h-3.5 w-3.5 accent-[var(--color-purple-glow)]"
                    />
                    {u.full_name}
                  </label>
                );
              })}
              {users.length === 0 && <p className="p-2 text-xs text-[var(--color-text-muted)]">No teammates available to assign.</p>}
            </div>
          </fieldset>

          <Field label="Priority" className="min-w-0 flex-1">
            {({ id }) => (
              <Select id={id} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Field label="Project" className="min-w-0 flex-1">
            {({ id }) => (
              <Select id={id} value={form.project_id} onChange={(e) => set('project_id', e.target.value)}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Parent task" hint="Makes this a subtask." className="min-w-0 flex-1">
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={form.parent_task_id} onChange={(e) => set('parent_task_id', e.target.value)}>
                <option value="">None (top-level)</option>
                {parents.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Due date">
          {({ id }) => <Input id={id} type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />}
        </Field>
      </form>
    </Modal>
  );
}
