'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User } from '@/lib/constants';
import {
  BarChart3, CheckSquare, BookOpen, MessageSquare, Loader2,
  CheckCircle2, Trash2, Plus, Link2, Video, FileText, Star, UserCheck
} from 'lucide-react';

interface LearningHubViewProps { currentUser: User; }

const inputClass = "w-full px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors";
const selectClass = "px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-colors";

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

  useEffect(() => { fetchData(activeTab); }, [activeTab]);

  const apiHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('internalx_token')}` });

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const endpointMap: Record<string, string> = {
        checklist: '/api/learning/checklist', manage_checklists: '/api/learning/checklist',
        progress: '/api/learning/progress', resources: '/api/learning/resources', feedback: '/api/learning/feedback',
      };
      const ep = endpointMap[tab];
      if (!ep) { setLoading(false); return; }
      const res = await fetch(`http://localhost:5000${ep}`, { headers: apiHeaders() });
      const data = await res.json();
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
      const res = await fetch(`http://localhost:5000/api/learning/progress/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...apiHeaders() },
        body: JSON.stringify({ completed: !current }),
      });
      if ((await res.json()).success) setChecklists(p => p.map(c => c.id === id ? { ...c, completed: !current } : c));
    } catch { toast.error('Failed to update progress'); }
  };

  const createChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/learning/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...apiHeaders() },
        body: JSON.stringify(newChecklist),
      });
      const data = await res.json();
      if (data.success) { toast.success('Item created'); setNewChecklist({ title: '', description: '', category: 'General', due_days: '' }); fetchData('manage_checklists'); }
      else toast.error(data.message);
    } catch { toast.error('Failed to create item'); }
  };

  const deleteChecklist = async (id: number) => {
    if (!confirm('Delete this checklist item?')) return;
    try {
      if ((await (await fetch(`http://localhost:5000/api/learning/checklist/${id}`, { method: 'DELETE', headers: apiHeaders() })).json()).success) {
        toast.success('Deleted'); fetchData('manage_checklists');
      }
    } catch { toast.error('Failed to delete'); }
  };

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/learning/resources', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...apiHeaders() },
        body: JSON.stringify(newResource),
      });
      const data = await res.json();
      if (data.success) { toast.success('Resource added'); setNewResource({ title: '', description: '', url: '', category: 'General', resource_type: 'link' }); fetchData('resources'); }
      else toast.error(data.message);
    } catch { toast.error('Failed to add resource'); }
  };

  const deleteResource = async (id: number) => {
    try {
      if ((await (await fetch(`http://localhost:5000/api/learning/resources/${id}`, { method: 'DELETE', headers: apiHeaders() })).json()).success) {
        toast.success('Deleted'); fetchData('resources');
      }
    } catch { toast.error('Failed to delete'); }
  };

  const createFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/learning/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...apiHeaders() },
        body: JSON.stringify(newFeedback),
      });
      const data = await res.json();
      if (data.success) { toast.success('Feedback added'); setNewFeedback({ intern_id: '', note: '', rating: '', week_label: '' }); fetchData('feedback'); }
      else toast.error(data.message);
    } catch { toast.error('Failed to add feedback'); }
  };

  const deleteFeedback = async (id: number) => {
    try {
      if ((await (await fetch(`http://localhost:5000/api/learning/feedback/${id}`, { method: 'DELETE', headers: apiHeaders() })).json()).success) {
        toast.success('Deleted'); fetchData('feedback');
      }
    } catch { toast.error('Failed to delete'); }
  };

  const TABS = isManager
    ? [{ id: 'progress', label: 'Intern Progress', icon: <BarChart3 size={15} /> }, { id: 'manage_checklists', label: 'Checklists', icon: <CheckSquare size={15} /> }, { id: 'resources', label: 'Resources', icon: <BookOpen size={15} /> }, { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={15} /> }]
    : [{ id: 'checklist', label: 'My Checklist', icon: <CheckSquare size={15} /> }, { id: 'resources', label: 'Resources', icon: <BookOpen size={15} /> }, { id: 'feedback', label: 'My Feedback', icon: <MessageSquare size={15} /> }];

  const resourceIcon = (type: string) => type === 'video' ? <Video size={18} /> : type === 'document' ? <FileText size={18} /> : <Link2 size={18} />;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Tabs */}
      <div className="flex gap-2 bg-[var(--color-bg-secondary)] p-1.5 rounded-xl border border-[var(--color-border)] self-start flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 transition-all border ${activeTab === t.id ? 'bg-[var(--color-bg-card)] text-[var(--color-purple-glow)] border-[var(--color-border)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border-transparent'}`}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
          <p className="font-medium text-sm">Loading...</p>
        </div>
      ) : (
        <>
          {/* INTERN CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Your Learning Checklist</h3>
                <p className="text-[var(--color-text-secondary)] text-[13px] font-medium">Complete these items to progress in your internship.</p>
              </div>
              {checklists.length === 0
                ? <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center"><CheckSquare size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-40" /><p className="text-[var(--color-text-secondary)] font-medium">No checklist items assigned.</p></div>
                : checklists.map(c => (
                  <div key={c.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-[var(--color-text-muted)] transition-colors">
                    <button onClick={() => toggleProgress(c.id, !!c.completed)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${c.completed ? 'bg-[var(--color-purple-glow)] border-[var(--color-purple-glow)]' : 'border-[var(--color-border)] hover:border-[var(--color-purple-glow)]'}`}>
                      {c.completed && <CheckCircle2 size={14} className="text-white" />}
                    </button>
                    <div className="flex-1">
                      <div className={`flex items-center gap-3 flex-wrap`}>
                        <span className={`font-bold text-[14px] ${c.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>{c.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] uppercase tracking-wider">{c.category}</span>
                      </div>
                      {c.description && <p className="text-[12px] font-medium text-[var(--color-text-muted)] mt-1">{c.description}</p>}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* MANAGER INTERN PROGRESS */}
          {activeTab === 'progress' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Intern Progress Summary</h3>
                <p className="text-[var(--color-text-secondary)] text-[13px] font-medium">Overview of how interns are tracking against their learning checklists.</p>
              </div>
              {progressSummary.length === 0
                ? <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center"><UserCheck size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-40" /><p className="text-[var(--color-text-secondary)] font-medium">No interns found.</p></div>
                : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {progressSummary.map(p => {
                    const pct = p.total_items > 0 ? Math.round((p.completed_items / p.total_items) * 100) : 0;
                    const done = p.completed_items === p.total_items && p.total_items > 0;
                    return (
                      <div key={p.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
                        <div className="font-bold text-[15px] text-[var(--color-text-primary)] mb-0.5">{p.full_name}</div>
                        <div className="text-[12px] font-medium text-[var(--color-text-muted)] mb-5">{p.department} • {p.email}</div>
                        <div className="flex justify-between text-[12px] mb-2">
                          <span className="font-bold text-[var(--color-text-secondary)]">Checklist Progress</span>
                          <span className="font-black" style={{ color: done ? '#10b981' : 'var(--color-purple-glow)' }}>{p.completed_items} / {p.total_items}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? '#10b981' : 'var(--color-purple-glow)' }} />
                        </div>
                        {p.last_activity && <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-3 text-right">Last active: {new Date(p.last_activity).toLocaleDateString()}</div>}
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          )}

          {/* MANAGE CHECKLISTS */}
          {activeTab === 'manage_checklists' && (
            <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl flex-[2] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <h3 className="font-bold text-base text-[var(--color-text-primary)]">Manage Checklists</h3>
                </div>
                {checklists.map(c => (
                  <div key={c.id} className="px-5 py-4 border-b border-[var(--color-border)] flex justify-between items-center hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <div>
                      <div className="font-bold text-[14px] text-[var(--color-text-primary)]">{c.title}</div>
                      <div className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">{c.category} • {c.completions || 0}/{c.total_interns || 0} completed</div>
                    </div>
                    <button onClick={() => deleteChecklist(c.id)} className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl flex-1 p-5 shadow-sm sticky top-4 min-w-[260px]">
                <h4 className="font-bold text-[14px] text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><Plus size={15} /> Add New Item</h4>
                <form onSubmit={createChecklist} className="flex flex-col gap-3">
                  <input placeholder="Title" required value={newChecklist.title} onChange={e => setNewChecklist({ ...newChecklist, title: e.target.value })} className={inputClass} />
                  <textarea placeholder="Description" value={newChecklist.description} onChange={e => setNewChecklist({ ...newChecklist, description: e.target.value })} className={`${inputClass} min-h-[70px] resize-none`} />
                  <input placeholder="Category (e.g. Onboarding)" value={newChecklist.category} onChange={e => setNewChecklist({ ...newChecklist, category: e.target.value })} className={inputClass} />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] transition-colors">Add Item</button>
                </form>
              </div>
            </div>
          )}

          {/* RESOURCES */}
          {activeTab === 'resources' && (
            <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
              <div className="flex-[2] flex flex-col gap-4">
                {resources.length === 0
                  ? <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center"><BookOpen size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-40" /><p className="text-[var(--color-text-secondary)] font-medium">No resources available.</p></div>
                  : resources.map(r => (
                    <div key={r.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 flex justify-between items-start shadow-sm hover:border-[var(--color-text-muted)] transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--color-purple-glow)]">{resourceIcon(r.resource_type)}</span>
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-base font-bold text-[var(--color-purple-glow)] hover:underline">{r.title}</a>
                        </div>
                        {r.description && <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-3 leading-relaxed">{r.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-[var(--color-text-muted)] uppercase tracking-wider">{r.category}</span>
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Added by {r.added_by_name} • {new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isManager && <button onClick={() => deleteResource(r.id)} className="ml-4 p-2 rounded-xl border border-[var(--color-border)] hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 text-[var(--color-text-muted)] transition-colors shrink-0"><Trash2 size={14} /></button>}
                    </div>
                  ))
                }
              </div>
              {isManager && (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl flex-1 p-5 shadow-sm sticky top-4 min-w-[260px]">
                  <h4 className="font-bold text-[14px] text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><Plus size={15} /> Add Resource</h4>
                  <form onSubmit={createResource} className="flex flex-col gap-3">
                    <input placeholder="Title" required value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} className={inputClass} />
                    <input placeholder="URL" type="url" required value={newResource.url} onChange={e => setNewResource({ ...newResource, url: e.target.value })} className={inputClass} />
                    <textarea placeholder="Description" value={newResource.description} onChange={e => setNewResource({ ...newResource, description: e.target.value })} className={`${inputClass} min-h-[60px] resize-none`} />
                    <div className="flex gap-2">
                      <select value={newResource.category} onChange={e => setNewResource({ ...newResource, category: e.target.value })} className={`flex-1 ${selectClass}`}>
                        {['General', 'Engineering', 'Design', 'Marketing'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={newResource.resource_type} onChange={e => setNewResource({ ...newResource, resource_type: e.target.value })} className={`flex-1 ${selectClass}`}>
                        {['link', 'video', 'document'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] transition-colors">Add Resource</button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">
              <div className="flex-[2] flex flex-col gap-4">
                {feedback.length === 0
                  ? <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-16 text-center"><MessageSquare size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-40" /><p className="text-[var(--color-text-secondary)] font-medium">No feedback recorded yet.</p></div>
                  : feedback.map(f => (
                    <div key={f.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-bold text-[14px] text-[var(--color-text-primary)]">{isManager ? `To: ${f.intern_name}` : `From: ${f.manager_name}`}</div>
                          <div className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">{new Date(f.created_at).toLocaleDateString()}{f.week_label ? ` • ${f.week_label}` : ''}</div>
                        </div>
                        {f.rating && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} className={s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-border)]'} />)}
                          </div>
                        )}
                      </div>
                      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4 rounded-xl text-[13px] font-medium text-[var(--color-text-secondary)] leading-relaxed">{f.note}</div>
                      {isManager && <button onClick={() => deleteFeedback(f.id)} className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-rose-500 hover:text-rose-400 transition-colors"><Trash2 size={12} /> Delete</button>}
                    </div>
                  ))
                }
              </div>
              {isManager && (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl flex-1 p-5 shadow-sm sticky top-4 min-w-[260px]">
                  <h4 className="font-bold text-[14px] text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><MessageSquare size={15} /> Give Feedback</h4>
                  <form onSubmit={createFeedback} className="flex flex-col gap-3">
                    <select required value={newFeedback.intern_id} onChange={e => setNewFeedback({ ...newFeedback, intern_id: e.target.value })} className={`w-full ${selectClass}`}>
                      <option value="">Select Intern...</option>
                      {progressSummary.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                    <input placeholder="Week Label (e.g. Week 1)" value={newFeedback.week_label} onChange={e => setNewFeedback({ ...newFeedback, week_label: e.target.value })} className={inputClass} />
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">Rating:</span>
                      <input type="number" min="1" max="5" placeholder="1–5" value={newFeedback.rating} onChange={e => setNewFeedback({ ...newFeedback, rating: e.target.value })} className={`w-20 ${inputClass}`} />
                    </div>
                    <textarea placeholder="Feedback note..." required value={newFeedback.note} onChange={e => setNewFeedback({ ...newFeedback, note: e.target.value })} className={`${inputClass} min-h-[90px] resize-none`} />
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] transition-colors">Submit Feedback</button>
                  </form>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
