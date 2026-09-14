'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User } from '@/lib/constants';
import {
  BarChart3, CheckSquare, BookOpen, MessageSquare,
  CheckCircle2, Trash2, Plus, Link2, Video, FileText, Star, UserCheck
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Field, Select, SkeletonCard, SkeletonTable,
  Textarea, TextField, useConfirm,
} from '@/components/ui';
import api from '@/lib/api';

/**
 * axios throws on a non-2xx response (fetch, which this file used to use,
 * only throws on a network failure) — a validation error from the backend
 * now lands in a `catch`, not the `else` branch next to a success check, so
 * every handler below needs this to still show the server's actual reason
 * instead of a generic fallback.
 */
const errMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

interface LearningHubViewProps { currentUser: User; }

export default function LearningHubView({ currentUser }: LearningHubViewProps) {
  const isManager = currentUser.accessLevel <= 5;
  const [activeTab, setActiveTab] = useState(isManager ? 'progress' : 'checklist');
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [newChecklist, setNewChecklist] = useState({ title: '', description: '', category: 'General', due_days: '' });
  const [newResource, setNewResource] = useState({ title: '', description: '', url: '', category: 'General', resource_type: 'link' });
  const [newFeedback, setNewFeedback] = useState({ intern_id: '', note: '', rating: '', week_label: '' });
  const confirm = useConfirm();

  useEffect(() => { fetchData(activeTab); }, [activeTab]);

  // Always load progressSummary on mount so the Feedback tab intern dropdown is populated
  // regardless of which tab the user starts on.
  useEffect(() => {
    if (isManager) fetchData('progress');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const endpointMap: Record<string, string> = {
        checklist: '/learning/checklist', manage_checklists: '/learning/checklist',
        progress: '/learning/progress', resources: '/learning/resources', feedback: '/learning/feedback',
      };
      const ep = endpointMap[tab];
      if (!ep) { setLoading(false); return; }
      const { data } = await api.get(ep);
      if (!data.success) return;
      if (tab === 'checklist' || tab === 'manage_checklists') setChecklists(data.data);
      else if (tab === 'progress') setProgressSummary(data.data);
      else if (tab === 'resources') setResources(data.data);
      else if (tab === 'feedback') setFeedback(data.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const toggleProgress = async (id: number, current: boolean) => {
    try {
      const { data } = await api.patch(`/learning/progress/${id}`, { completed: !current });
      if (data.success) setChecklists(p => p.map(c => c.id === id ? { ...c, completed: !current } : c));
    } catch { toast.error('Failed to update progress'); }
  };

  const createChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/learning/checklist', newChecklist);
      if (data.success) { toast.success('Item created'); setNewChecklist({ title: '', description: '', category: 'General', due_days: '' }); fetchData('manage_checklists'); }
      else toast.error(data.message);
    } catch (err) { toast.error(errMessage(err, 'Failed to create item')); }
  };

  const deleteChecklist = async (id: number) => {
    const confirmed = await confirm({
      title: 'Delete this checklist item?',
      description: 'It will be removed for every intern, along with their recorded progress on it.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const { data } = await api.delete(`/learning/checklist/${id}`);
      if (data.success) { toast.success('Deleted'); fetchData('manage_checklists'); }
    } catch (err) { toast.error(errMessage(err, 'Failed to delete')); }
  };

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/learning/resources', newResource);
      if (data.success) { toast.success('Resource added'); setNewResource({ title: '', description: '', url: '', category: 'General', resource_type: 'link' }); fetchData('resources'); }
      else toast.error(data.message);
    } catch (err) { toast.error(errMessage(err, 'Failed to add resource')); }
  };

  const deleteResource = async (id: number) => {
    try {
      const { data } = await api.delete(`/learning/resources/${id}`);
      if (data.success) { toast.success('Deleted'); fetchData('resources'); }
    } catch (err) { toast.error(errMessage(err, 'Failed to delete')); }
  };

  const createFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/learning/feedback', newFeedback);
      if (data.success) { toast.success('Feedback added'); setNewFeedback({ intern_id: '', note: '', rating: '', week_label: '' }); fetchData('feedback'); }
      else toast.error(data.message);
    } catch (err) { toast.error(errMessage(err, 'Failed to add feedback')); }
  };

  const deleteFeedback = async (id: number) => {
    try {
      const { data } = await api.delete(`/learning/feedback/${id}`);
      if (data.success) { toast.success('Deleted'); fetchData('feedback'); }
    } catch (err) { toast.error(errMessage(err, 'Failed to delete')); }
  };

  const TABS = isManager
    ? [{ id: 'progress', label: 'Intern Progress', icon: <BarChart3 size={15} aria-hidden="true" /> }, { id: 'manage_checklists', label: 'Checklists', icon: <CheckSquare size={15} aria-hidden="true" /> }, { id: 'resources', label: 'Resources', icon: <BookOpen size={15} aria-hidden="true" /> }, { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={15} aria-hidden="true" /> }]
    : [{ id: 'checklist', label: 'My Checklist', icon: <CheckSquare size={15} aria-hidden="true" /> }, { id: 'resources', label: 'Resources', icon: <BookOpen size={15} aria-hidden="true" /> }, { id: 'feedback', label: 'My Feedback', icon: <MessageSquare size={15} aria-hidden="true" /> }];

  const resourceIcon = (type: string) => type === 'video' ? <Video size={18} aria-hidden="true" /> : type === 'document' ? <FileText size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />;

  const skeletonGrid = (count: number, className: string) => (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  const renderLoading = () => {
    if (activeTab === 'progress') {
      return skeletonGrid(6, 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');
    }
    if (activeTab === 'manage_checklists') {
      return <SkeletonTable rows={6} columns={2} />;
    }
    return skeletonGrid(4, 'flex flex-col gap-4');
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Tabs */}
      <div
        role="group"
        aria-label="Learning hub sections"
        className="flex gap-2 bg-[var(--color-bg-secondary)] p-1.5 rounded-[var(--radius-card)] border border-[var(--color-border)] self-start flex-wrap"
      >
        {TABS.map(t => (
          <Button
            key={t.id}
            size="sm"
            variant={activeTab === t.id ? 'subtle' : 'ghost'}
            aria-pressed={activeTab === t.id}
            leadingIcon={t.icon}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? renderLoading() : (
        <>
          {/* INTERN CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="flex flex-col gap-4">
              <Card className="shadow-sm">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Your Learning Checklist</h3>
                <p className="text-[var(--color-text-secondary)] text-[13px] font-medium">Complete these items to progress in your internship.</p>
              </Card>
              {checklists.length === 0
                ? (
                  <EmptyState
                    icon={<CheckSquare size={22} aria-hidden="true" />}
                    title="No checklist items assigned"
                    description="Once your manager assigns onboarding or learning tasks, they will appear here."
                  />
                )
                : checklists.map(c => (
                  <Card key={c.id} padding="none" className="p-4 flex items-center gap-4 shadow-sm hover:border-[var(--color-text-muted)] transition-colors">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={!!c.completed}
                      aria-label={`Mark "${c.title}" as complete`}
                      onClick={() => toggleProgress(c.id, !!c.completed)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${c.completed ? 'bg-[var(--color-purple-glow)] border-[var(--color-purple-glow)]' : 'border-[var(--color-border)] hover:border-[var(--color-purple-glow)]'}`}
                    >
                      {c.completed && <CheckCircle2 size={14} className="text-white" aria-hidden="true" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`font-bold text-[14px] ${c.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>{c.title}</span>
                        <Badge tone="neutral">{c.category}</Badge>
                      </div>
                      {c.description && <p className="text-[12px] font-medium text-[var(--color-text-muted)] mt-1">{c.description}</p>}
                    </div>
                  </Card>
                ))
              }
            </div>
          )}

          {/* MANAGER INTERN PROGRESS */}
          {activeTab === 'progress' && (
            <div className="flex flex-col gap-4">
              <Card className="shadow-sm">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Intern Progress Summary</h3>
                <p className="text-[var(--color-text-secondary)] text-[13px] font-medium">Overview of how interns are tracking against their learning checklists.</p>
              </Card>
              {progressSummary.length === 0
                ? (
                  <EmptyState
                    icon={<UserCheck size={22} aria-hidden="true" />}
                    title="No interns found"
                    description="Interns assigned to your ventures will show their checklist progress here."
                  />
                )
                : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {progressSummary.map(p => {
                    const pct = p.total_items > 0 ? Math.round((p.completed_items / p.total_items) * 100) : 0;
                    const done = p.completed_items === p.total_items && p.total_items > 0;
                    return (
                      <Card key={p.id} padding="none" className="p-5 shadow-sm">
                        <div className="font-bold text-[15px] text-[var(--color-text-primary)] mb-0.5">{p.full_name}</div>
                        <div className="text-[12px] font-medium text-[var(--color-text-muted)] mb-5">{p.department} • {p.email}</div>
                        <div className="flex justify-between text-[12px] mb-2">
                          <span className="font-bold text-[var(--color-text-secondary)]">Checklist Progress</span>
                          <span className="font-black" style={{ color: done ? 'var(--color-emerald)' : 'var(--color-purple-glow)' }}>{p.completed_items} / {p.total_items}</span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${p.full_name}: ${p.completed_items} of ${p.total_items} checklist items complete`}
                          className="h-2 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden"
                        >
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? 'var(--color-emerald)' : 'var(--color-purple-glow)' }} />
                        </div>
                        {p.last_activity && <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-3 text-right">Last active: {new Date(p.last_activity).toLocaleDateString()}</div>}
                      </Card>
                    );
                  })}
                </div>
              }
            </div>
          )}

          {/* MANAGE CHECKLISTS */}
          {activeTab === 'manage_checklists' && (
            <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
              <Card padding="none" className="flex-[2] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <h3 className="font-bold text-base text-[var(--color-text-primary)]">Manage Checklists</h3>
                </div>
                {checklists.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={<CheckSquare size={22} aria-hidden="true" />}
                      title="No checklist items yet"
                      description="Create your first onboarding item using the form beside this list — it will be assigned to every intern."
                    />
                  </div>
                ) : checklists.map(c => (
                  <div key={c.id} className="px-5 py-4 border-b border-[var(--color-border)] flex justify-between items-center hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <div>
                      <div className="font-bold text-[14px] text-[var(--color-text-primary)]">{c.title}</div>
                      <div className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">{c.category} • {c.completions || 0}/{c.total_interns || 0} completed</div>
                    </div>
                    <Button
                      iconOnly
                      aria-label={`Delete checklist item "${c.title}"`}
                      variant="ghost"
                      size="sm"
                      leadingIcon={<Trash2 size={14} aria-hidden="true" />}
                      onClick={() => deleteChecklist(c.id)}
                      className="border border-[var(--color-rose)]/20 bg-[var(--color-rose)]/10 text-[var(--color-rose)] hover:bg-[var(--color-rose)]/20 hover:text-[var(--color-rose)]"
                    />
                  </div>
                ))}
              </Card>
              <Card padding="none" className="flex-1 p-5 shadow-sm sticky top-4 min-w-[260px]">
                <h4 className="font-bold text-[14px] text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><Plus size={15} aria-hidden="true" /> Add New Item</h4>
                <form onSubmit={createChecklist} className="flex flex-col gap-3">
                  <TextField
                    label="Title"
                    required
                    placeholder="Title"
                    value={newChecklist.title}
                    onChange={e => setNewChecklist({ ...newChecklist, title: e.target.value })}
                  />
                  <Field label="Description">
                    {({ id, describedBy }) => (
                      <Textarea
                        id={id}
                        aria-describedby={describedBy}
                        rows={3}
                        placeholder="Description"
                        value={newChecklist.description}
                        onChange={e => setNewChecklist({ ...newChecklist, description: e.target.value })}
                      />
                    )}
                  </Field>
                  <TextField
                    label="Category"
                    placeholder="Category (e.g. Onboarding)"
                    value={newChecklist.category}
                    onChange={e => setNewChecklist({ ...newChecklist, category: e.target.value })}
                  />
                  <Button type="submit" variant="primary" fullWidth>Add Item</Button>
                </form>
              </Card>
            </div>
          )}

          {/* RESOURCES */}
          {activeTab === 'resources' && (
            <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
              <div className="flex-[2] flex flex-col gap-4">
                {resources.length === 0
                  ? (
                    <EmptyState
                      icon={<BookOpen size={22} aria-hidden="true" />}
                      title="No resources available"
                      description={isManager
                        ? 'Add the first link, video, or document so your team has a shared starting point.'
                        : 'Your managers have not shared any learning resources yet.'}
                    />
                  )
                  : resources.map(r => (
                    <Card key={r.id} padding="none" className="p-5 flex justify-between items-start shadow-sm hover:border-[var(--color-text-muted)] transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--color-purple-glow)]">{resourceIcon(r.resource_type)}</span>
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-base font-bold text-[var(--color-purple-glow)] hover:underline">{r.title}</a>
                        </div>
                        {r.description && <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-3 leading-relaxed">{r.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge tone="neutral">{r.category}</Badge>
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Added by {r.added_by_name} • {new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isManager && (
                        <Button
                          iconOnly
                          aria-label={`Delete resource "${r.title}"`}
                          variant="ghost"
                          size="sm"
                          leadingIcon={<Trash2 size={14} aria-hidden="true" />}
                          onClick={() => deleteResource(r.id)}
                          className="ml-4 shrink-0 border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-rose)]/30 hover:bg-[var(--color-rose)]/10 hover:text-[var(--color-rose)]"
                        />
                      )}
                    </Card>
                  ))
                }
              </div>
              {isManager && (
                <Card padding="none" className="flex-1 p-5 shadow-sm sticky top-4 min-w-[260px]">
                  <h4 className="font-bold text-[14px] text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><Plus size={15} aria-hidden="true" /> Add Resource</h4>
                  <form onSubmit={createResource} className="flex flex-col gap-3">
                    <TextField
                      label="Title"
                      required
                      placeholder="Title"
                      value={newResource.title}
                      onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                    />
                    <TextField
                      label="URL"
                      type="url"
                      required
                      placeholder="https://..."
                      value={newResource.url}
                      onChange={e => setNewResource({ ...newResource, url: e.target.value })}
                    />
                    <Field label="Description">
                      {({ id, describedBy }) => (
                        <Textarea
                          id={id}
                          aria-describedby={describedBy}
                          rows={3}
                          placeholder="Description"
                          value={newResource.description}
                          onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                        />
                      )}
                    </Field>
                    <div className="flex gap-2">
                      <Field label="Category" className="flex-1">
                        {({ id, describedBy }) => (
                          <Select
                            id={id}
                            aria-describedby={describedBy}
                            value={newResource.category}
                            onChange={e => setNewResource({ ...newResource, category: e.target.value })}
                          >
                            {['General', 'Engineering', 'Design', 'Marketing'].map(c => <option key={c} value={c}>{c}</option>)}
                          </Select>
                        )}
                      </Field>
                      <Field label="Type" className="flex-1">
                        {({ id, describedBy }) => (
                          <Select
                            id={id}
                            aria-describedby={describedBy}
                            value={newResource.resource_type}
                            onChange={e => setNewResource({ ...newResource, resource_type: e.target.value })}
                          >
                            {['link', 'video', 'document'].map(t => <option key={t} value={t}>{t}</option>)}
                          </Select>
                        )}
                      </Field>
                    </div>
                    <Button type="submit" variant="primary" fullWidth>Add Resource</Button>
                  </form>
                </Card>
              )}
            </div>
          )}

          {/* FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
              <div className="flex-[2] flex flex-col gap-4">
                {feedback.length === 0
                  ? (
                    <EmptyState
                      icon={<MessageSquare size={22} aria-hidden="true" />}
                      title="No feedback recorded yet"
                      description={isManager
                        ? 'Use the form beside this list to leave your first weekly note for an intern.'
                        : 'Weekly notes and ratings from your manager will appear here.'}
                    />
                  )
                  : feedback.map(f => (
                    <Card key={f.id} padding="none" className="p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-bold text-[14px] text-[var(--color-text-primary)]">{isManager ? `To: ${f.intern_name}` : `From: ${f.manager_name}`}</div>
                          <div className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">{new Date(f.created_at).toLocaleDateString()}{f.week_label ? ` • ${f.week_label}` : ''}</div>
                        </div>
                        {f.rating && (
                          <div role="img" aria-label={`Rating: ${f.rating} out of 5`} className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} aria-hidden="true" className={s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-border)]'} />)}
                          </div>
                        )}
                      </div>
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4 rounded-[var(--radius-control)] text-[13px] font-medium text-[var(--color-text-secondary)] leading-relaxed">{f.note}</div>
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leadingIcon={<Trash2 size={12} aria-hidden="true" />}
                          onClick={() => deleteFeedback(f.id)}
                          className="mt-3 text-[var(--color-rose)] hover:text-[var(--color-rose)]"
                        >
                          Delete
                        </Button>
                      )}
                    </Card>
                  ))
                }
              </div>
              {isManager && (
                <Card padding="none" className="flex-1 p-5 shadow-sm sticky top-4 min-w-[260px]">
                  <h4 className="font-bold text-[14px] text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><MessageSquare size={15} aria-hidden="true" /> Give Feedback</h4>
                  <form onSubmit={createFeedback} className="flex flex-col gap-3">
                    <Field label="Intern" required>
                      {({ id, describedBy }) => (
                        <Select
                          id={id}
                          aria-describedby={describedBy}
                          required
                          value={newFeedback.intern_id}
                          onChange={e => setNewFeedback({ ...newFeedback, intern_id: e.target.value })}
                        >
                          <option value="">Select Intern...</option>
                          {progressSummary.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </Select>
                      )}
                    </Field>
                    <TextField
                      label="Week label"
                      placeholder="Week Label (e.g. Week 1)"
                      value={newFeedback.week_label}
                      onChange={e => setNewFeedback({ ...newFeedback, week_label: e.target.value })}
                    />
                    <TextField
                      label="Rating"
                      hint="A score from 1 to 5."
                      type="number"
                      min="1"
                      max="5"
                      placeholder="1–5"
                      value={newFeedback.rating}
                      onChange={e => setNewFeedback({ ...newFeedback, rating: e.target.value })}
                      className="w-32"
                    />
                    <Field label="Feedback note" required>
                      {({ id, describedBy }) => (
                        <Textarea
                          id={id}
                          aria-describedby={describedBy}
                          required
                          rows={4}
                          placeholder="Feedback note..."
                          value={newFeedback.note}
                          onChange={e => setNewFeedback({ ...newFeedback, note: e.target.value })}
                        />
                      )}
                    </Field>
                    <Button type="submit" variant="primary" fullWidth>Submit Feedback</Button>
                  </form>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
