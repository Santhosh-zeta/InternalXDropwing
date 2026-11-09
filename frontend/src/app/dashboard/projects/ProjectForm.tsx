'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Plus, Tag, Trash2, X } from 'lucide-react';
import { createProject, deleteProject, errMsg, getProject, updateProject } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { Milestone, Project, TeamMember } from '@/lib/types';
import { Button, Field, Input, Modal, Select, Textarea, TextField, useConfirm } from '@/components/ui';
import { MEMBER_ROLES, PRIORITIES, STATUSES, parseTags } from './constants';

const SECTION_LABEL = 'block text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';
const emptyMilestone = (): Milestone => ({ title: '', description: '', due_date: '', status: 'pending' });

interface Props {
  /** Project being edited, or null to create. */
  project: Project | null;
  users: TeamMember[];
  /** Ventures a global user (L1/L2) can create a project in. */
  ventures: { id: number; name: string }[];
  ownVentureId: number | null;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Create / edit drawer. Mounted only while open, keyed by project, so state starts fresh. */
export default function ProjectForm({ project, users, ventures, ownVentureId, canEdit, canDelete, onClose, onSaved }: Props) {
  const confirm = useConfirm();
  const isGlobal = ownVentureId === null;

  const [form, setForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'planning',
    priority: project?.priority ?? 'medium',
    budget: project?.budget ? String(project.budget) : '',
    venture_id: String(project?.venture_id ?? ownVentureId ?? ventures[0]?.id ?? ''),
    start_date: project?.start_date?.slice(0, 10) ?? '',
    end_date: project?.end_date?.slice(0, 10) ?? '',
    client_name: project?.client_name ?? '',
    client_email: project?.client_email ?? '',
    members: (project?.members ?? []).map((m) => ({ user_id: m.user_id, role: m.role || 'Contributor' })),
    tags: parseTags(project?.tags),
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  // Milestones come from the detail endpoint; `edited` holds local changes on top of it.
  const projectId = project?.id ?? 0;
  const detail = useApi(project ? `project-${projectId}` : null, async () => (await getProject(projectId)).data.milestones ?? []);
  const [edited, setEdited] = useState<Milestone[] | null>(null);
  const milestones = edited ?? detail.data ?? [];

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setMilestone = (index: number, patch: Partial<Milestone>) =>
    setEdited(milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const ventureId = Number(form.venture_id);
  const pool = users.filter((u) => u.is_active && (!isGlobal || !ventureId || u.venture_id === ventureId || u.access_level === 9 || u.access_level <= 2));

  const toggleMember = (id: number) =>
    set('members', form.members.some((m) => m.user_id === id) ? form.members.filter((m) => m.user_id !== id) : [...form.members, { user_id: id, role: 'Contributor' }]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    if (!project && isGlobal && !ventureId) return toast.error('Choose a venture');
    setSaving(true);
    try {
      const { venture_id, budget, ...rest } = form;
      const payload = {
        ...rest,
        name: form.name.trim(),
        budget: budget === '' ? 0 : Number(budget),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        // Only touch milestones when they were loaded (or edited), never blank them by accident.
        ...(edited !== null || detail.data ? { milestones } : {}),
        ...(project ? {} : { venture_id: Number(venture_id) || undefined }),
      };
      const res = project ? await updateProject(project.id, payload) : await createProject(payload);
      if (!res.success) throw new Error(res.message);
      toast.success(project ? 'Project updated' : 'Project created');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the project'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!project) return;
    const ok = await confirm({
      title: 'Delete this project?',
      description: 'The project, its milestones and its team assignments will be removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await deleteProject(project.id);
      if (!res.success) throw new Error(res.message);
      toast.success('Project deleted');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, 'Could not delete the project'));
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) set('tags', [...form.tags, tag]);
    setTagInput('');
  };

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      title={project ? (canEdit ? 'Edit project' : 'Project details') : 'New project'}
      description={project?.venture_name ?? undefined}
      footer={
        <>
          {canDelete && project && (
            <Button variant="danger" leadingIcon={<Trash2 size={16} aria-hidden="true" />} onClick={remove} className="mr-auto">Delete</Button>
          )}
          <Button variant="secondary" onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
          {canEdit && (
            <Button variant="primary" type="submit" form="project-form" loading={saving} leadingIcon={<Check size={16} strokeWidth={3} aria-hidden="true" />}>
              {project ? 'Save changes' : 'Create project'}
            </Button>
          )}
        </>
      }
    >
      <form id="project-form" onSubmit={save} className="flex flex-col gap-8">
        <fieldset disabled={!canEdit} className="m-0 flex min-w-0 flex-col gap-8 border-0 p-0">
          <section className="space-y-5">
            <TextField label="Name" required value={form.name} maxLength={255} onChange={(e) => set('name', e.target.value)} placeholder="Project title" />

            {!project && isGlobal && (
              <Field label="Venture" required>
                {({ id }) => (
                  <Select id={id} required value={form.venture_id} onChange={(e) => setForm((f) => ({ ...f, venture_id: e.target.value, members: [] }))}>
                    {ventures.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            <Field label="Description">
              {({ id }) => <Textarea id={id} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Scope and objectives" />}
            </Field>

            <Field label="Tags" hint="Type a tag and press Enter.">
              {({ id, describedBy }) => (
                <>
                  {form.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {form.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1.5 rounded-md border border-[var(--color-purple-glow)]/20 bg-[var(--color-purple-glow)]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-purple-glow)]">
                          {tag}
                          <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => set('tags', form.tags.filter((t) => t !== tag))} className="transition-colors hover:text-[var(--color-rose)]">
                            <X size={10} aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Tag size={14} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      placeholder="Add a tag…"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                </>
              )}
            </Field>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <Field label="Status">
              {({ id }) => (
                <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Priority">
              {({ id }) => (
                <Select id={id} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Start date">
              {({ id }) => <Input id={id} type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />}
            </Field>
            <Field label="End date">
              {({ id }) => <Input id={id} type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />}
            </Field>
            <Field label="Budget" className="sm:col-span-2">
              {({ id }) => <Input id={id} type="number" min={0} step="any" inputMode="decimal" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="0" />}
            </Field>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <span id="project-team-label" className={SECTION_LABEL}>Team</span>
              <span className="rounded-full bg-[var(--color-purple-glow)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-purple-glow)]">{form.members.length} assigned</span>
            </div>
            <div role="group" aria-labelledby="project-team-label" className="custom-scrollbar max-h-[240px] space-y-2 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
              {pool.map((u) => {
                const member = form.members.find((m) => m.user_id === u.id);
                return (
                  <div key={u.id} className={`flex flex-col gap-2 rounded-xl border p-2.5 transition-colors ${member ? 'border-[var(--color-purple-glow)]/30 bg-[var(--color-purple-glow)]/10' : 'border-transparent hover:bg-[var(--color-bg-card)]'}`}>
                    <button type="button" aria-pressed={!!member} onClick={() => toggleMember(u.id)} className="flex w-full items-center justify-between text-left disabled:cursor-not-allowed" disabled={!canEdit}>
                      <span className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] text-xs font-bold text-[var(--color-text-primary)]">{u.full_name.charAt(0)}</span>
                        <span>
                          <span className="block text-[13px] font-bold text-[var(--color-text-primary)]">{u.full_name}</span>
                          <span className="block text-[11px] text-[var(--color-text-muted)]">{u.designation || u.level_name || 'Team member'}</span>
                        </span>
                      </span>
                      <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${member ? 'border-[var(--color-purple-glow)] bg-[var(--color-purple-glow)] text-white' : 'border-[var(--color-border)]'}`}>
                        {member && <Check size={12} strokeWidth={3} />}
                      </span>
                    </button>
                    {member && (
                      <div className="pl-11 pr-2 pb-1">
                        <select
                          aria-label={`Project role for ${u.full_name}`}
                          value={member.role}
                          disabled={!canEdit}
                          onChange={(e) => set('members', form.members.map((m) => (m.user_id === u.id ? { ...m, role: e.target.value } : m)))}
                          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-[11px] font-bold text-[var(--color-purple-glow)] outline-none focus-visible:border-[var(--color-purple-glow)]"
                        >
                          {MEMBER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
              {pool.length === 0 && <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">No teammates available. Add people in the Team page first.</p>}
            </div>
          </section>

          <section className="space-y-4">
            <p className={SECTION_LABEL}>Client</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Client name" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} placeholder="Client or company" />
              <TextField label="Contact email" type="email" value={form.client_email} onChange={(e) => set('client_email', e.target.value)} placeholder="name@company.com" />
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <span className={SECTION_LABEL}>Milestones</span>
              {canEdit && (
                <Button variant="ghost" size="sm" leadingIcon={<Plus size={12} aria-hidden="true" />} onClick={() => setEdited([...milestones, emptyMilestone()])}>
                  Add milestone
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="relative space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  {canEdit && (
                    <Button iconOnly aria-label={`Remove milestone ${i + 1}`} variant="ghost" size="sm" onClick={() => setEdited(milestones.filter((_, j) => j !== i))} className="absolute right-2 top-2 hover:text-[var(--color-rose)]">
                      <X size={14} aria-hidden="true" />
                    </Button>
                  )}
                  <Input aria-label={`Milestone ${i + 1} title`} placeholder="Milestone title" value={m.title} onChange={(e) => setMilestone(i, { title: e.target.value })} className="pr-10" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input type="date" aria-label={`Milestone ${i + 1} due date`} value={m.due_date ? m.due_date.slice(0, 10) : ''} onChange={(e) => setMilestone(i, { due_date: e.target.value })} />
                    <Select aria-label={`Milestone ${i + 1} status`} value={m.status} onChange={(e) => setMilestone(i, { status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </Select>
                  </div>
                </div>
              ))}
              {milestones.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
                  {detail.loading ? 'Loading milestones…' : 'No milestones yet.'}
                </div>
              )}
            </div>
          </section>
        </fieldset>
      </form>
    </Modal>
  );
}
