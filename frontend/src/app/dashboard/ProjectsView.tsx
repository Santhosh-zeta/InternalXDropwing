'use client';

import { useState, useEffect } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Plus, Search, Filter, Briefcase, Calendar, 
  MoreVertical, Clock, CheckCircle2, Circle, AlertCircle,
  X, Check, DollarSign, LayoutList, Target, Trash2
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

export default function ProjectsView({ currentUser }: ProjectsViewProps) {
  const [projects, setProjects] = useState<any[]>([]);
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
    budget: 0,
    venture_id: currentUser.venture?.id || 0,
    start_date: '',
    end_date: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      if (res.success) {
        setProjects(res.data);
      }
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (project?: any) => {
    if (project) {
      setEditingProject(project);
      setForm({
        name: project.name,
        description: project.description || '',
        status: project.status,
        budget: project.budget ? parseFloat(project.budget) : 0,
        venture_id: project.venture_id || 0,
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        end_date: project.end_date ? project.end_date.split('T')[0] : ''
      });
    } else {
      setEditingProject(null);
      setForm({
        name: '',
        description: '',
        status: 'planning',
        budget: 0,
        venture_id: currentUser.venture?.id || (currentUser.accessLevel <= 2 ? 1 : 0),
        start_date: '',
        end_date: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Project name is required');
    if (!form.venture_id && currentUser.accessLevel <= 2) return toast.error('Please select a venture');

    try {
      setSaving(true);
      const payload = {
        ...form,
        budget: currentUser.accessLevel <= 4 ? form.budget : undefined
      };

      let res;
      if (editingProject) {
        res = await updateProject(editingProject.id, payload);
      } else {
        res = await createProject(payload);
      }

      if (res.success) {
        toast.success(editingProject ? 'Project updated' : 'Project created');
        setIsModalOpen(false);
        fetchProjects();
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project? All associated tasks will be orphaned or deleted.')) return;
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

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesVenture = ventureFilter === 'all' || p.venture_name?.toLowerCase().includes(ventureFilter.toLowerCase());
    return matchesSearch && matchesVenture;
  });

  const getVentureColor = (ventureName: string) => {
    if (!ventureName) return '#8b5cf6';
    const v = VENTURES.find(v => ventureName.toLowerCase().includes(v.slug));
    return v ? v.color : '#8b5cf6';
  };

  // Group by status for Kanban
  const groupedProjects = STATUSES.map(s => ({
    ...s,
    items: filteredProjects.filter(p => p.status === s.id)
  }));

  const canCreate = currentUser.accessLevel <= 4;
  const showBudget = currentUser.accessLevel <= 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', paddingBottom: 40, position: 'relative' }}>
      {/* Header */}
      <div className="glass" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>Projects & Deliverables</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Strategic oversight and progress tracking.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => handleOpenModal()}
              style={{
                padding: '10px 20px', borderRadius: 12,
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                color: '#fff', border: 'none', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
              }}
            >
              <Plus size={16} /> New Project
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
              }}
            />
          </div>
          
          {currentUser.accessLevel <= 2 && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <Filter size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--color-text-muted)' }} />
                <select
                  value={ventureFilter}
                  onChange={(e) => setVentureFilter(e.target.value)}
                  style={{
                    padding: '10px 36px 10px 36px', borderRadius: 12, appearance: 'none',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none'
                  }}
                >
                  <option value="all">All Ventures</option>
                  {VENTURES.map(v => (
                    <option key={v.slug} value={v.slug}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ flex: 1, display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16 }}>
        {loading ? (
          <div style={{ width: '100%', padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div className="animate-spin-slow" style={{ fontSize: 24, marginBottom: 16 }}>✦</div>
            Loading projects...
          </div>
        ) : (
          groupedProjects.map(group => (
            <div key={group.id} style={{ minWidth: 320, width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Column Header */}
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '12px 16px', background: 'rgba(255,255,255,0.02)', 
                borderRadius: 12, border: `1px solid ${group.color}30`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: group.color, fontWeight: 700, fontSize: 14 }}>
                  {group.icon} {group.label}
                </div>
                <div style={{ background: `${group.color}20`, color: group.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                  {group.items.length}
                </div>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.items.map(project => {
                  const vColor = getVentureColor(project.venture_name);
                  const progress = project.task_count > 0 ? Math.round((project.completed_task_count / project.task_count) * 100) : 0;

                  return (
                    <div 
                      key={project.id}
                      onClick={() => handleOpenModal(project)}
                      className="glass glass-hover"
                      style={{ 
                        borderRadius: 16, padding: 20, cursor: 'pointer',
                        borderLeft: `4px solid ${vColor}`, transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: vColor, letterSpacing: 0.5, textTransform: 'uppercase', background: `${vColor}15`, padding: '4px 8px', borderRadius: 6 }}>
                          {project.venture_name || 'Global'}
                        </div>
                        {showBudget && project.budget > 0 && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <DollarSign size={12} /> {parseFloat(project.budget).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                        {project.name}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {project.description || 'No description provided.'}
                      </p>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${vColor}, #06b6d4)`, borderRadius: 3, transition: 'width 0.5s ease-out' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          <LayoutList size={12} /> {project.completed_task_count} / {project.task_count} tasks
                        </div>
                        {project.end_date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: new Date(project.end_date) < new Date() && project.status !== 'completed' ? '#f43f5e' : 'var(--color-text-secondary)' }}>
                            <Calendar size={12} /> {new Date(project.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide Panel for Project Details/Editing */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', inset: 0, zIndex: 100, 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <div 
            className="glass" 
            style={{ 
              width: '100%', maxWidth: 500, height: '100%', 
              background: 'var(--color-bg-primary)',
              borderLeft: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '-20px 0 40px rgba(0,0,0,0.5)',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Target size={24} color="#8b5cf6" />
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {editingProject ? 'Project Details' : 'New Project'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 32, height: 32, borderRadius: '50%', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Project Name</label>
                <input 
                  type="text" value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g., Q3 Marketing Campaign"
                  disabled={!canCreate}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Description</label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  rows={4}
                  disabled={!canCreate}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Status</label>
                  <select 
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                    disabled={!canCreate}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', appearance: 'none' }}
                  >
                    {STATUSES.map(s => <option key={s.id} value={s.id} style={{ background: '#1a1a2e' }}>{s.label}</option>)}
                  </select>
                </div>

                {currentUser.accessLevel <= 2 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Venture</label>
                    <select 
                      value={form.venture_id}
                      onChange={e => setForm({...form, venture_id: parseInt(e.target.value)})}
                      disabled={!canCreate}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', appearance: 'none' }}
                    >
                      {VENTURES.map((v, i) => <option key={v.slug} value={i + 1} style={{ background: '#1a1a2e' }}>{v.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Start Date</label>
                  <input 
                    type="date" value={form.start_date}
                    onChange={e => setForm({...form, start_date: e.target.value})}
                    disabled={!canCreate}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>End Date / Deadline</label>
                  <input 
                    type="date" value={form.end_date}
                    onChange={e => setForm({...form, end_date: e.target.value})}
                    disabled={!canCreate}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none', colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {showBudget && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Project Budget (USD)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
                    <input 
                      type="number" value={form.budget}
                      onChange={e => setForm({...form, budget: parseFloat(e.target.value)})}
                      disabled={!canCreate}
                      style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: '#fff', fontSize: 14, outline: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* Read Only Meta Info */}
              {editingProject && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Created by:</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{editingProject.created_by_name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tasks Completed:</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{editingProject.completed_task_count} / {editingProject.task_count}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 24, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              {canCreate && editingProject && currentUser.accessLevel <= 3 ? (
                 <button 
                  onClick={() => handleDelete(editingProject.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              ) : <div />}
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-primary)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  {canCreate ? 'Cancel' : 'Close'}
                </button>
                {canCreate && (
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    style={{ 
                      padding: '10px 24px', borderRadius: 10, 
                      background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: '#fff', 
                      border: 'none', fontWeight: 600, fontSize: 13, cursor: saving ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    {saving ? <span className="animate-spin-slow">✦</span> : <Check size={16} />} 
                    {saving ? 'Saving...' : 'Save Project'}
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
