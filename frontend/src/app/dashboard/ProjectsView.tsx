'use client';

import { useState, useEffect } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getProjects, getProject, createProject, updateProject, deleteProject, getUsers } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Briefcase, Calendar,
  Clock, CheckCircle2, Circle, AlertCircle,
  X, Check, DollarSign, LayoutList, Trash2,
  UserPlus, Building2, Tag
} from 'lucide-react';
import {
  Badge, Button, EmptyState, Field, Input, Modal, Select, Skeleton, SkeletonCard, Textarea,
  TextField, useConfirm,
} from '@/components/ui';

interface ProjectsViewProps {
  currentUser: User;
}

const STATUSES = [
  { id: 'planning', label: 'Planning', color: '#8b5cf6', icon: <Circle size={14} aria-hidden="true" /> },
  { id: 'active', label: 'Active', color: '#06b6d4', icon: <Clock size={14} aria-hidden="true" /> },
  { id: 'on-hold', label: 'On Hold', color: '#f59e0b', icon: <AlertCircle size={14} aria-hidden="true" /> },
  { id: 'completed', label: 'Completed', color: '#10b981', icon: <CheckCircle2 size={14} aria-hidden="true" /> }
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#10b981' },
  { id: 'medium', label: 'Medium', color: '#8b5cf6' },
  { id: 'high', label: 'High', color: '#f59e0b' },
  { id: 'urgent', label: 'Urgent', color: '#f43f5e' }
];

const CATEGORIES = ['General', 'Development', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance', 'Design'];

const SECTION_LABEL_CLASS =
  'block text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';

export default function ProjectsView({ currentUser }: ProjectsViewProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [ventureFilter, setVentureFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    category: 'General',
    budget: 0,
    venture_id: currentUser.venture?.id || 1,
    start_date: '',
    end_date: '',
    client_name: '',
    client_email: '',
    members: [] as { user_id: number, role: string }[],
    tags: [] as string[],
    milestones: [] as { title: string, description: string, due_date: string, status: string }[]
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const confirm = useConfirm();

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      if (res.success) setProjects(res.data);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      if (res.success) setAvailableUsers(res.data);
    } catch {}
  };

  const handleOpenModal = async (project?: any) => {
    if (project) {
      setEditingProject(project);

      // Initialize with what we have
      setForm({
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority || 'medium',
        category: project.category || 'General',
        budget: project.budget ? parseFloat(project.budget) : 0,
        venture_id: project.venture_id || 1,
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        end_date: project.end_date ? project.end_date.split('T')[0] : '',
        client_name: project.client_name || '',
        client_email: project.client_email || '',
        members: project.members ? project.members.map((m: any) => ({ user_id: m.user_id, role: m.role || 'Contributor' })) : [],
        tags: project.tags ? (typeof project.tags === 'string' ? JSON.parse(project.tags) : project.tags) : [],
        milestones: []
      });
      setTagInput('');

      // Fetch full details for milestones
      try {
        const res = await getProject(project.id);
        if (res.success) {
          setForm(prev => ({
            ...prev,
            milestones: res.data.milestones || []
          }));
        }
      } catch {}
    } else {
      setEditingProject(null);
      setForm({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        category: 'General',
        budget: 0,
        venture_id: currentUser.venture?.id || 1,
        start_date: '',
        end_date: '',
        client_name: '',
        client_email: '',
        members: [],
        tags: [],
        milestones: []
      });
      setTagInput('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Project name is required');
    try {
      setSaving(true);
      const res = editingProject
        ? await updateProject(editingProject.id, form)
        : await createProject(form);

      if (res.success) {
        toast.success(editingProject ? 'Project updated' : 'Project created');
        setIsModalOpen(false);
        fetchProjects();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Permanently delete this project?',
      description: 'The project, its milestones and its team assignments will be removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await deleteProject(id);
      if (res.success) {
        toast.success('Project deleted');
        setIsModalOpen(false);
        fetchProjects();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting project');
    }
  };

  const toggleMember = (userId: number) => {
    setForm(prev => ({
      ...prev,
      members: prev.members.some(m => m.user_id === userId)
        ? prev.members.filter(m => m.user_id !== userId)
        : [...prev.members, { user_id: userId, role: 'Contributor' }]
    }));
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesVenture = ventureFilter === 'all' || p.venture_name?.toLowerCase().includes(ventureFilter.toLowerCase());
    return matchesSearch && matchesVenture;
  });

  const getPriorityColor = (p: string) => PRIORITIES.find(pr => pr.id === p)?.color || '#8b5cf6';
  const getVentureColor = (name: string) => VENTURES.find(v => name?.toLowerCase().includes(v.slug))?.color || '#8b5cf6';

  const groupedProjects = STATUSES.map(s => ({
    ...s,
    items: filteredProjects.filter(p => p.status === s.id)
  }));

  // backend/src/routes/project.routes.js: POST/PUT are requireLevel(4), but
  // DELETE is requireLevel(3) — a CXO (L4) can create and edit projects but
  // was previously shown a "Purge" button that always 403s.
  const canCreate = currentUser.accessLevel <= 4;
  const canDelete = currentUser.accessLevel <= 3;

  return (
    <div className="flex flex-col gap-6 h-full pb-10 relative">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 rounded-2xl flex flex-col gap-5 shadow-sm">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Strategic Projects</h2>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 tracking-wide">Orchestrating high-impact deliverables across ventures.</p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              leadingIcon={<Plus size={16} strokeWidth={2.5} aria-hidden="true" />}
              onClick={() => handleOpenModal()}
            >
              New Project
            </Button>
          )}
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              aria-label="Filter projects by name or description"
              placeholder="Filter projects by name or owner..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
            />
          </div>

          {currentUser.accessLevel <= 2 && (
            <select
              aria-label="Filter projects by venture"
              value={ventureFilter} onChange={(e) => setVentureFilter(e.target.value)}
              className="pl-4 pr-9 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] cursor-pointer outline-none focus:border-[var(--color-purple-glow)] transition-colors"
            >
              <option value="all">All Ventures</option>
              {VENTURES.map(v => <option key={v.slug} value={v.slug}>{v.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar"
        >
          <span className="sr-only">Syncing project board…</span>
          {STATUSES.map(s => (
            <div key={s.id} className="min-w-[340px] w-[340px] flex flex-col gap-4">
              <div className="px-4 py-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)]">
                <Skeleton height={12} width={96} />
              </div>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={22} aria-hidden="true" />}
          title="No projects yet"
          description="Projects group tasks, budget, milestones and the team behind a deliverable. Start one and it will appear on this board."
          action={
            canCreate ? (
              <Button
                variant="primary"
                leadingIcon={<Plus size={16} strokeWidth={2.5} aria-hidden="true" />}
                onClick={() => handleOpenModal()}
              >
                Create your first project
              </Button>
            ) : undefined
          }
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<Search size={22} aria-hidden="true" />}
          title="No projects match your filters"
          description="Nothing here matches the current search or venture filter. Try widening it."
          action={
            <Button
              variant="secondary"
              onClick={() => { setSearch(''); setVentureFilter('all'); }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {groupedProjects.map(group => (
            <div key={group.id} className="min-w-[340px] w-[340px] flex flex-col gap-4">
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-secondary)] rounded-xl border shadow-sm" style={{ borderColor: `${group.color}30` }}>
                <div className="flex items-center gap-2 font-bold text-[13px] uppercase tracking-wider" style={{ color: group.color }}>
                  {group.icon} {group.label}
                </div>
                <div className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${group.color}20`, color: group.color }}>{group.items.length}</div>
              </div>

              <div className="flex flex-col gap-3 h-full">
                {group.items.map(project => {
                  const vColor = getVentureColor(project.venture_name);
                  const progress = project.task_count > 0 ? Math.round((project.completed_task_count / project.task_count) * 100) : 0;
                  const prioColor = getPriorityColor(project.priority);

                  return (
                    <div
                      key={project.id}
                      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-text-muted)] transition-all group relative overflow-hidden focus-within:border-[var(--color-purple-glow)]"
                      style={{ borderLeft: `4px solid ${vColor}` }}
                    >
                      {/* Whole-card click target. Kept as a real button rather than an
                          onClick on the card div so it is reachable by keyboard. */}
                      <button
                        type="button"
                        onClick={() => handleOpenModal(project)}
                        aria-label={`Open project ${project.name}`}
                        className="absolute inset-0 z-10 cursor-pointer rounded-2xl outline-none"
                      />

                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge color={vColor}>{project.venture_name}</Badge>
                          <Badge color={prioColor}>{project.priority}</Badge>
                          {project.tags && (typeof project.tags === 'string' ? JSON.parse(project.tags) : project.tags).map((tag: string) => (
                            <Badge key={tag} tone="neutral">{tag}</Badge>
                          ))}
                        </div>
                      </div>

                      <h4 className="text-[15px] font-bold text-[var(--color-text-primary)] mb-1 leading-snug group-hover:text-[var(--color-purple-glow)] transition-colors truncate">
                        {project.name}
                      </h4>
                      <p className="text-[12px] text-[var(--color-text-secondary)] mb-4 line-clamp-2 leading-relaxed h-9">
                        {project.description || 'No description provided.'}
                      </p>

                      <div className="mb-4">
                        <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mb-1.5 font-bold">
                          <span>Execution Phase</span>
                          <span>{progress}%</span>
                        </div>
                        <div
                          className="h-1.5 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${project.name} execution progress`}
                        >
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${vColor}, #06b6d4)` }} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-[var(--color-border)]">
                        <div className="flex -space-x-2">
                          {project.members?.slice(0, 3).map((m: any, idx: number) => (
                            <div key={idx} className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border-2 border-[var(--color-bg-card)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-secondary)]" title={m.full_name}>
                              {m.full_name.charAt(0)}
                            </div>
                          ))}
                          {project.members?.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border-2 border-[var(--color-bg-card)] flex items-center justify-center text-[9px] font-bold text-[var(--color-text-muted)]">
                              +{project.members.length - 3}
                            </div>
                          )}
                          {(!project.members || project.members.length === 0) && (
                            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border-2 border-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-text-muted)]" title="No members assigned">
                              <UserPlus size={10} aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
                            <LayoutList size={12} aria-hidden="true" /> {project.completed_task_count}/{project.task_count}
                          </div>
                          {project.end_date && (
                             <div className={`flex items-center gap-1 text-[11px] font-bold ${new Date(project.end_date) < new Date() ? 'text-rose-500' : 'text-[var(--color-text-secondary)]'}`}>
                               <Calendar size={12} aria-hidden="true" /> {new Date(project.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                             </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {group.items.length === 0 && (
                  <div className="p-6 border border-dashed border-[var(--color-border)] rounded-xl text-center">
                    <p className="text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-widest">
                      Nothing in {group.label}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Slide Panel */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="drawer"
        title={editingProject ? 'Project Infrastructure' : 'New Project Architecture'}
        description="Global Workspace Node"
        footer={
          <>
            {canDelete && editingProject && (
              <Button
                variant="danger"
                leadingIcon={<Trash2 size={16} aria-hidden="true" />}
                onClick={() => handleDelete(editingProject.id)}
                className="mr-auto"
              >
                Purge
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Dismiss</Button>
            {canCreate && (
              <Button
                variant="primary"
                loading={saving}
                leadingIcon={<Check size={16} strokeWidth={3} aria-hidden="true" />}
                onClick={handleSave}
              >
                {saving ? 'Syncing...' : editingProject ? 'Update Architecture' : 'Initialize Project'}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-8">
          {/* Primary Info */}
          <section className="space-y-6">
            <TextField
              label="Identification"
              required
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Enter project title..."
              disabled={!canCreate}
            />

            <Field label="Project Tags" hint="Type a tag and press Enter to add it.">
              {({ id, describedBy }) => (
                <>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-purple-glow)]/10 border border-[var(--color-purple-glow)]/20 text-[var(--color-purple-glow)] text-[11px] font-bold uppercase tracking-wider">
                          {tag}
                          <button
                            type="button"
                            aria-label={`Remove tag ${tag}`}
                            onClick={() => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                            className="hover:text-[var(--color-rose)] transition-colors"
                          >
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
                      type="text"
                      placeholder="Add tag and press Enter..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          if (!form.tags.includes(tagInput.trim())) {
                            setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
                          }
                          setTagInput('');
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                </>
              )}
            </Field>

            <Field label="Operational Directive">
              {({ id }) => (
                <Textarea
                  id={id}
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  rows={3}
                  placeholder="Define project scope and objectives..."
                  disabled={!canCreate}
                />
              )}
            </Field>
          </section>

          {/* Classification Grid */}
          <section className="grid grid-cols-2 gap-6">
            <Field label="Phase">
              {({ id }) => (
                <Select
                  id={id}
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  disabled={!canCreate}
                >
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Criticality">
              {({ id }) => (
                <Select
                  id={id}
                  value={form.priority}
                  onChange={e => setForm({...form, priority: e.target.value})}
                  disabled={!canCreate}
                >
                  {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              )}
            </Field>
          </section>

          {/* Team Allocation */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <span id="project-team-label" className={SECTION_LABEL_CLASS}>Human Capital Allocation</span>
              <span className="text-[10px] font-bold text-[var(--color-purple-glow)] bg-[var(--color-purple-glow)]/10 px-2 py-0.5 rounded-full">{form.members.length} Assigned</span>
            </div>
            <div
              role="group"
              aria-labelledby="project-team-label"
              className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] max-h-[220px] overflow-y-auto custom-scrollbar space-y-2 shadow-inner"
            >
              {availableUsers.map(user => {
                const isAssigned = form.members.some(m => m.user_id === user.id);
                const memberData = form.members.find(m => m.user_id === user.id);

                return (
                  <div
                    key={user.id}
                    className={`flex flex-col gap-2 p-2.5 rounded-xl transition-all ${isAssigned ? 'bg-[var(--color-purple-glow)]/10 border-[var(--color-purple-glow)]/30 border' : 'hover:bg-[var(--color-bg-card)] border border-transparent'}`}
                  >
                    <button
                      type="button"
                      aria-pressed={isAssigned}
                      disabled={!canCreate}
                      onClick={() => canCreate && toggleMember(user.id)}
                      className="flex w-full items-center justify-between text-left disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-text-primary)]">
                          {user.full_name?.charAt(0)}
                        </span>
                        <span className="block">
                          <span className="block text-[13px] font-bold text-[var(--color-text-primary)]">{user.full_name}</span>
                          <span className="block text-[10px] text-[var(--color-text-muted)]">{user.designation || 'Specialist'}</span>
                        </span>
                      </span>
                      <span aria-hidden="true" className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center border transition-all ${isAssigned ? 'bg-[var(--color-purple-glow)] border-[var(--color-purple-glow)] text-white' : 'border-[var(--color-border)]'}`}>
                        {isAssigned && <Check size={12} strokeWidth={3} />}
                      </span>
                    </button>

                    {isAssigned && (
                      <div className="pl-11 pr-2 pb-1">
                        <select
                          aria-label={`Project role for ${user.full_name}`}
                          value={memberData?.role || 'Contributor'}
                          onChange={e => {
                            setForm(prev => ({
                              ...prev,
                              members: prev.members.map(m => m.user_id === user.id ? { ...m, role: e.target.value } : m)
                            }));
                          }}
                          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md px-2 py-1 text-[11px] font-bold text-[var(--color-purple-glow)] outline-none"
                        >
                          <option value="Lead">Project Lead</option>
                          <option value="Contributor">Contributor</option>
                          <option value="Reviewer">Reviewer</option>
                          <option value="Architect">Architect</option>
                          <option value="Stakeholder">Stakeholder</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
              {availableUsers.length === 0 && (
                <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                  No teammates available to assign yet.
                </p>
              )}
            </div>
          </section>

          {/* Timeline & Budget */}
          <section className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] border-dashed">
             <div className="col-span-2 flex items-center gap-2 mb-2">
                <Calendar size={14} aria-hidden="true" className="text-[var(--color-purple-glow)]" />
                <span className={SECTION_LABEL_CLASS}>Chronology &amp; Capital</span>
             </div>
             <Field label="Deployment">
               {({ id }) => (
                 <Input
                   id={id}
                   type="date"
                   min={new Date().toISOString().split('T')[0]}
                   value={form.start_date}
                   onChange={e => setForm({...form, start_date: e.target.value})}
                   disabled={!canCreate}
                 />
               )}
             </Field>
             <Field label="Termination">
               {({ id }) => (
                 <Input
                   id={id}
                   type="date"
                   min={new Date().toISOString().split('T')[0]}
                   value={form.end_date}
                   onChange={e => setForm({...form, end_date: e.target.value})}
                   disabled={!canCreate}
                 />
               )}
             </Field>
             <Field label="Budgetary Allocation (USD)" className="col-span-2">
               {({ id }) => (
                 <div className="relative">
                   <DollarSign size={14} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                   <Input
                     id={id}
                     type="number"
                     value={form.budget}
                     onChange={e => setForm({...form, budget: parseFloat(e.target.value)})}
                     disabled={!canCreate}
                     className="pl-10 font-bold text-emerald-500"
                   />
                 </div>
               )}
             </Field>
          </section>

          {/* External stakeholders */}
          <section className="space-y-4">
             <p className={`${SECTION_LABEL_CLASS} flex items-center gap-2`}>
                <Building2 size={14} aria-hidden="true" /> Client Intelligence
             </p>
             <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Stakeholder Entity"
                  value={form.client_name}
                  onChange={e => setForm({...form, client_name: e.target.value})}
                  placeholder="Client or company name"
                />
                <TextField
                  label="Contact Email"
                  type="email"
                  value={form.client_email}
                  onChange={e => setForm({...form, client_email: e.target.value})}
                  placeholder="name@company.com"
                />
             </div>
          </section>

          {/* Milestones */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <span className={SECTION_LABEL_CLASS}>Project Milestones</span>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<Plus size={12} aria-hidden="true" />}
                onClick={() => setForm(prev => ({ ...prev, milestones: [...prev.milestones, { title: '', description: '', due_date: '', status: 'pending' }] }))}
                className="text-[var(--color-purple-glow)]"
              >
                Add Milestone
              </Button>
            </div>
            <div className="space-y-3">
              {form.milestones.map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-3 relative">
                  <Button
                    iconOnly
                    aria-label={`Remove milestone ${idx + 1}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }))}
                    className="absolute top-2 right-2 hover:text-[var(--color-rose)]"
                  >
                    <X size={14} aria-hidden="true" />
                  </Button>
                  <input
                    type="text" placeholder="Milestone Title"
                    aria-label={`Milestone ${idx + 1} title`}
                    value={m.title} onChange={e => {
                      const newM = [...form.milestones];
                      newM[idx].title = e.target.value;
                      setForm({...form, milestones: newM});
                    }}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-1 pr-10 text-[13px] font-bold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date" min={new Date().toISOString().split('T')[0]} value={m.due_date ? m.due_date.split('T')[0] : ''}
                      aria-label={`Milestone ${idx + 1} due date`}
                      onChange={e => {
                        const newM = [...form.milestones];
                        newM[idx].due_date = e.target.value;
                        setForm({...form, milestones: newM});
                      }}
                      className="bg-transparent border border-[var(--color-border)] rounded-md px-2 py-1 text-[11px] text-[var(--color-text-primary)]"
                    />
                    <select
                      value={m.status}
                      aria-label={`Milestone ${idx + 1} status`}
                      onChange={e => {
                        const newM = [...form.milestones];
                        newM[idx].status = e.target.value;
                        setForm({...form, milestones: newM});
                      }}
                      className="bg-transparent border border-[var(--color-border)] rounded-md px-2 py-1 text-[11px] text-[var(--color-text-primary)]"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
              {form.milestones.length === 0 && (
                <div className="p-8 border border-dashed border-[var(--color-border)] rounded-xl text-center">
                  <p className="text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-widest">No milestones defined.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
}
