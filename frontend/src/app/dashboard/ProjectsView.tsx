'use client';

import { useState, useEffect } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getProjects, getProject, createProject, updateProject, deleteProject, getUsers } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Plus, Search, Filter, Briefcase, Calendar, 
  MoreVertical, Clock, CheckCircle2, Circle, AlertCircle,
  X, Check, DollarSign, LayoutList, Target, Trash2, Loader2,
  Users as UsersIcon, UserPlus, Mail, Building2, Tag, ShieldAlert
} from 'lucide-react';

interface ProjectsViewProps {
  currentUser: User;
}

const STATUSES = [
  { id: 'planning', label: 'Planning', color: '#8b5cf6', icon: <Circle size={14} /> },
  { id: 'active', label: 'Active', color: '#06b6d4', icon: <Clock size={14} /> },
  { id: 'on-hold', label: 'On Hold', color: '#f59e0b', icon: <AlertCircle size={14} /> },
  { id: 'completed', label: 'Completed', color: '#10b981', icon: <CheckCircle2 size={14} /> }
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#10b981' },
  { id: 'medium', label: 'Medium', color: '#8b5cf6' },
  { id: 'high', label: 'High', color: '#f59e0b' },
  { id: 'urgent', label: 'Urgent', color: '#f43f5e' }
];

const CATEGORIES = ['General', 'Development', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance', 'Design'];

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
    if (!confirm('Permanently delete this project?')) return;
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

  const canCreate = currentUser.accessLevel <= 4;

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
            <button
              onClick={() => handleOpenModal()}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} /> New Project
            </button>
          )}
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search size={16} className="absolute left-3.5 top-3 text-[var(--color-text-muted)]" />
            <input 
              type="text" placeholder="Filter projects by name or owner..." 
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] outline-none focus:border-[var(--color-purple-glow)] transition-colors"
            />
          </div>
          
          {currentUser.accessLevel <= 2 && (
            <select
              value={ventureFilter} onChange={(e) => setVentureFilter(e.target.value)}
              className="pl-4 pr-9 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] cursor-pointer outline-none focus:border-[var(--color-purple-glow)] transition-colors appearance-none"
            >
              <option value="all">All Ventures</option>
              {VENTURES.map(v => <option key={v.slug} value={v.slug}>{v.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col w-full items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
            <p className="text-[var(--color-text-muted)] text-sm font-medium tracking-wide">Syncing project board...</p>
          </div>
        ) : (
          groupedProjects.map(group => (
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
                      key={project.id} onClick={() => handleOpenModal(project)}
                      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 cursor-pointer hover:border-[var(--color-text-muted)] transition-all group relative overflow-hidden"
                      style={{ borderLeft: `4px solid ${vColor}` }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border" style={{ color: vColor, background: `${vColor}10`, borderColor: `${vColor}20` }}>
                            {project.venture_name}
                          </span>
                          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border" style={{ color: prioColor, background: `${prioColor}10`, borderColor: `${prioColor}20` }}>
                            {project.priority}
                          </span>
                          {project.tags && (typeof project.tags === 'string' ? JSON.parse(project.tags) : project.tags).map((tag: string) => (
                            <span key={tag} className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                              {tag}
                            </span>
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
                        <div className="h-1.5 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
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
                            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border-2 border-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-text-muted)]">
                              <UserPlus size={10} />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
                            <LayoutList size={12} /> {project.completed_task_count}/{project.task_count}
                          </div>
                          {project.end_date && (
                             <div className={`flex items-center gap-1 text-[11px] font-bold ${new Date(project.end_date) < new Date() ? 'text-rose-500' : 'text-[var(--color-text-secondary)]'}`}>
                               <Calendar size={12} /> {new Date(project.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                             </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Enhanced Slide Panel */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-[600px] h-full bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-purple-glow)]/10 border border-[var(--color-purple-glow)]/20 flex items-center justify-center text-[var(--color-purple-glow)] shadow-inner">
                  <Target size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                    {editingProject ? 'Project Infrastructure' : 'New Project Architecture'}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-1">Global Workspace Node</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 text-[var(--color-text-muted)] flex items-center justify-center transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar bg-[var(--color-bg-primary)]">
              {/* Primary Info */}
              <section className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">Identification</label>
                  <input 
                    type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Enter project title..." disabled={!canCreate}
                    className="w-full px-5 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[15px] font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">Project Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-purple-glow)]/10 border border-[var(--color-purple-glow)]/20 text-[var(--color-purple-glow)] text-[11px] font-bold uppercase tracking-wider">
                        {tag}
                        <button onClick={() => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} className="hover:text-rose-500 transition-colors">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Tag size={14} className="absolute left-4 top-3.5 text-[var(--color-text-muted)]" />
                    <input 
                      type="text" placeholder="Add tag and press Enter..." 
                      value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          if (!form.tags.includes(tagInput.trim())) {
                            setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
                          }
                          setTagInput('');
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">Operational Directive</label>
                  <textarea 
                    value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                    rows={3} placeholder="Define project scope and objectives..." disabled={!canCreate}
                    className="w-full px-5 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] transition-all resize-none shadow-sm"
                  />
                </div>
              </section>

              {/* Classification Grid */}
              <section className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">Phase</label>
                  <div className="relative">
                    <select 
                      value={form.status} onChange={e => setForm({...form, status: e.target.value})} disabled={!canCreate}
                      className="w-full px-5 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] appearance-none shadow-sm"
                    >
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <Clock size={16} className="absolute right-4 top-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">Criticality</label>
                  <div className="relative">
                    <select 
                      value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} disabled={!canCreate}
                      className="w-full px-5 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] appearance-none shadow-sm"
                    >
                      {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <ShieldAlert size={16} className="absolute right-4 top-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                  </div>
                </div>
              </section>

              {/* Team Allocation */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Human Capital Allocation</label>
                  <span className="text-[10px] font-bold text-[var(--color-purple-glow)] bg-[var(--color-purple-glow)]/10 px-2 py-0.5 rounded-full">{form.members.length} Assigned</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] max-h-[220px] overflow-y-auto custom-scrollbar space-y-2 shadow-inner">
                  {availableUsers.map(user => {
                    const isAssigned = form.members.some(m => m.user_id === user.id);
                    const memberData = form.members.find(m => m.user_id === user.id);
                    
                    return (
                      <div 
                        key={user.id} 
                        className={`flex flex-col gap-2 p-2.5 rounded-xl transition-all ${isAssigned ? 'bg-[var(--color-purple-glow)]/10 border-[var(--color-purple-glow)]/30 border' : 'hover:bg-[var(--color-bg-card)] border border-transparent'}`}
                      >
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => canCreate && toggleMember(user.id)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-text-primary)]">
                              {user.full_name?.charAt(0)}
                            </div>
                            <div>
                              <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{user.full_name}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">{user.designation || 'Specialist'}</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${isAssigned ? 'bg-[var(--color-purple-glow)] border-[var(--color-purple-glow)] text-white' : 'border-[var(--color-border)]'}`}>
                            {isAssigned && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        {isAssigned && (
                          <div className="pl-11 pr-2 pb-1">
                            <select 
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
                </div>
              </section>

              {/* Timeline & Budget */}
              <section className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] border-dashed">
                 <div className="col-span-2 flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-[var(--color-purple-glow)]" />
                    <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Chronology & Capital</span>
                 </div>
                 <div>
                   <label className="block text-[11px] text-[var(--color-text-muted)] mb-1.5 font-bold uppercase">Deployment</label>
                   <input type="date" min={new Date().toISOString().split('T')[0]} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} disabled={!canCreate} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] [color-scheme:dark]" />
                 </div>
                 <div>
                   <label className="block text-[11px] text-[var(--color-text-muted)] mb-1.5 font-bold uppercase">Termination</label>
                   <input type="date" min={new Date().toISOString().split('T')[0]} value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} disabled={!canCreate} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] [color-scheme:dark]" />
                 </div>
                 <div className="col-span-2">
                   <label className="block text-[11px] text-[var(--color-text-muted)] mb-1.5 font-bold uppercase">Budgetary Allocation (USD)</label>
                   <div className="relative">
                     <DollarSign size={14} className="absolute left-4 top-3.5 text-emerald-500" />
                     <input type="number" value={form.budget} onChange={e => setForm({...form, budget: parseFloat(e.target.value)})} disabled={!canCreate} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[14px] font-bold text-emerald-500 shadow-inner" />
                   </div>
                 </div>
              </section>

              {/* External stakeholders */}
              <section className="space-y-4">
                 <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} className="text-[var(--color-text-muted)]" /> Client Intelligence
                 </label>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Stakeholder Entity / Name" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)]" />
                    <input type="email" placeholder="Contact Protocol (Email)" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)]" />
                 </div>
              </section>

              {/* Milestones */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Project Milestones</label>
                  <button 
                    onClick={() => setForm(prev => ({ ...prev, milestones: [...prev.milestones, { title: '', description: '', due_date: '', status: 'pending' }] }))}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-purple-glow)] hover:underline"
                  >
                    <Plus size={12} /> Add Milestone
                  </button>
                </div>
                <div className="space-y-3">
                  {form.milestones.map((m, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-3 relative">
                      <button 
                        onClick={() => setForm(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }))}
                        className="absolute top-2 right-2 text-[var(--color-text-muted)] hover:text-rose-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                      <input 
                        type="text" placeholder="Milestone Title" 
                        value={m.title} onChange={e => {
                          const newM = [...form.milestones];
                          newM[idx].title = e.target.value;
                          setForm({...form, milestones: newM});
                        }}
                        className="w-full bg-transparent border-b border-[var(--color-border)] py-1 text-[13px] font-bold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="date" min={new Date().toISOString().split('T')[0]} value={m.due_date ? m.due_date.split('T')[0] : ''} 
                          onChange={e => {
                            const newM = [...form.milestones];
                            newM[idx].due_date = e.target.value;
                            setForm({...form, milestones: newM});
                          }}
                          className="bg-transparent border border-[var(--color-border)] rounded-md px-2 py-1 text-[11px] text-[var(--color-text-primary)] [color-scheme:dark]"
                        />
                        <select 
                          value={m.status} 
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

            <div className="p-6 border-t border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
              {canCreate && editingProject && (
                 <button onClick={() => handleDelete(editingProject.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-bold text-[13px] transition-all">
                  <Trash2 size={16} /> Purge
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold text-[13px] hover:bg-[var(--color-bg-card)] transition-all">Dismiss</button>
                {canCreate && (
                  <button 
                    onClick={handleSave} disabled={saving}
                    className="px-8 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                    {saving ? 'Syncing...' : editingProject ? 'Update Architecture' : 'Initialize Project'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
