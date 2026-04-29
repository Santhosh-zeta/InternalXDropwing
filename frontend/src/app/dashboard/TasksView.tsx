'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getTasks, createTask, updateTask, deleteTask, getUsers, getProjects } from '@/lib/api';
import { User } from '@/lib/constants';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: number;
  assigned_by: number;
  venture_id: number;
  due_date: string;
  created_at: string;
  assigned_to_name: string;
  assigned_to_avatar: string;
  assigned_by_name: string;
  assigned_by_avatar: string;
  venture_name: string;
  primary_color: string;
  project_id?: number;
  project_name?: string;
  parent_task_id?: number;
  parent_task_title?: string;
}

const PRIORITY_COLORS = {
  low: '#10b981', // green
  medium: '#0ea5e9', // blue
  high: '#f59e0b', // orange
  urgent: '#f43f5e', // red
};

export default function TasksView({ currentUser }: { currentUser: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', project_id: '', parent_task_id: '' });
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  
  // New features state
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes, projectsRes] = await Promise.all([getTasks(), getUsers(), getProjects().catch(() => ({success:false}))]);
      if (tasksRes.success) setTasks(tasksRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (projectsRes?.success) setProjects(projectsRes.data || []);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigned_to) {
      toast.error('Title and Assignee are required');
      return;
    }
    try {
      const payload = {
        ...newTask,
        project_id: newTask.project_id || undefined,
        parent_task_id: newTask.parent_task_id || undefined
      };
      const res = await createTask(payload);
      if (res.success) {
        toast.success('Task created successfully');
        setShowModal(false);
        setNewTask({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', project_id: '', parent_task_id: '' });
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await updateTask(id, { status: newStatus });
      if (res.success) {
        toast.success('Task updated');
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await deleteTask(id);
      if (res.success) {
        toast.success('Task deleted');
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
    // Small styling to show it's being dragged (opacity handled by CSS/HTML5 default usually)
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('taskId');
    if (!taskIdStr) return;
    
    const taskId = parseInt(taskIdStr, 10);
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status !== newStatus) {
      // Optimistic update for snappy UX
      const previousTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      
      try {
        const res = await updateTask(taskId, { status: newStatus });
        if (res.success) {
          toast.success(`Task moved to ${newStatus}`);
        } else {
          setTasks(previousTasks); // revert
          toast.error('Failed to move task');
        }
      } catch {
        setTasks(previousTasks); // revert
        toast.error('Failed to move task');
      }
    }
  };

  const columns = [
    { id: 'pending', title: 'Pending', emoji: '📝', color: '#8b5cf6' },
    { id: 'in-progress', title: 'In Progress', emoji: '⏳', color: '#0ea5e9' },
    { id: 'completed', title: 'Completed', emoji: '✅', color: '#10b981' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div className="animate-spin-slow" style={{ fontSize: 32 }}>✦</div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => filterProjectId === 'all' || t.project_id === Number(filterProjectId));

  // --- Calendar View Helpers ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    // Empty prefix days
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ minHeight: 120, borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: 8, background: 'rgba(0,0,0,0.02)' }} />);
    }
    
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = filteredTasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));
      
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div key={`day-${i}`} style={{ 
          minHeight: 120, borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', 
          padding: 8, background: isToday ? 'rgba(139, 92, 246, 0.05)' : 'var(--color-bg-primary)',
          transition: 'background 0.2s'
        }}>
          <div style={{ 
            fontWeight: 700, fontSize: 13, marginBottom: 8,
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', background: isToday ? '#8b5cf6' : 'transparent', color: isToday ? '#fff' : 'var(--color-text-secondary)'
          }}>
            {i}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {dayTasks.map(t => (
              <div key={t.id} style={{ 
                fontSize: 11, padding: '4px 6px', borderRadius: 6, fontWeight: 600,
                background: t.status === 'completed' ? 'rgba(16,185,129,0.1)' : `${PRIORITY_COLORS[t.priority]}15`,
                color: t.status === 'completed' ? '#10b981' : PRIORITY_COLORS[t.priority],
                border: `1px solid ${t.status === 'completed' ? 'rgba(16,185,129,0.2)' : PRIORITY_COLORS[t.priority]}30`,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                cursor: 'pointer'
              }} title={`${t.title} (${t.status})`}>
                {t.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="fade-in" style={{ background: 'var(--color-bg-secondary)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--color-border)', alignItems: 'center', background: 'var(--color-bg-tertiary)' }}>
          <button onClick={() => setCurrentMonth(new Date(year, month - 1))} style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--color-text-primary)', fontWeight: 600 }}>← Prev</button>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1))} style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--color-text-primary)', fontWeight: 600 }}>Next →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ padding: '12px 0', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>Tasks Management</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Organize and track tasks visually.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 4 }}>
            <button 
              onClick={() => setViewMode('kanban')}
              style={{ 
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: viewMode === 'kanban' ? 'var(--color-bg-primary)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'kanban' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              📋 Kanban
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              style={{ 
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: viewMode === 'calendar' ? 'var(--color-bg-primary)' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'calendar' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              📅 Calendar
            </button>
          </div>

          <select 
            value={filterProjectId} 
            onChange={(e) => setFilterProjectId(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 20px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              color: 'white', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
            }}
          >
            <span>➕</span> New Task
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        /* Kanban Board */
        <div className="fade-in" style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16, minHeight: 500 }}>
          {columns.map(col => (
            <div 
              key={col.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              style={{ 
                flex: '1 1 0', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 16,
                background: 'var(--color-bg-secondary)', padding: 16, borderRadius: 16, border: '1px dashed transparent',
                transition: 'border 0.2s'
              }}
              // Minimal CSS trick: can highlight column on drag over by adding a class via state, but native is fine.
            >
              {/* Column Header */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                background: `${col.color}15`, border: `1px solid ${col.color}30`, borderRadius: 12 
              }}>
                <span style={{ fontSize: 18 }}>{col.emoji}</span>
                <span style={{ fontWeight: 800, color: col.color, letterSpacing: 0.5 }}>{col.title}</span>
                <span style={{ marginLeft: 'auto', background: `${col.color}30`, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 800, color: col.color }}>
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>

              {/* Tasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 100 }}>
                {filteredTasks.filter(t => t.status === col.id).map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                  return (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="glass task-card" 
                    style={{
                      padding: 16, borderRadius: 12, border: `1px solid ${isOverdue ? '#f43f5e' : 'var(--color-border)'}`,
                      background: isOverdue ? 'rgba(244, 63, 94, 0.05)' : 'var(--color-bg-primary)',
                      position: 'relative', cursor: 'grab', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      transition: 'transform 0.1s, box-shadow 0.1s'
                    }}
                    onDrag={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.5'; }}
                    onDragEnd={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ 
                        fontSize: 10, padding: '3px 8px', borderRadius: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                        background: `${PRIORITY_COLORS[task.priority]}15`, color: PRIORITY_COLORS[task.priority],
                        border: `1px solid ${PRIORITY_COLORS[task.priority]}30`
                      }}>
                        {task.priority}
                      </span>
                      {(currentUser.id === task.assigned_by || currentUser.accessLevel <= 3) && (
                        <button onClick={() => handleDelete(task.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: 14, opacity: 0.6 }} className="hover-opacity-1">🗑️</button>
                      )}
                    </div>
                    <h4 style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 6, lineHeight: 1.4 }}>
                      {task.title}
                    </h4>
                    {task.project_name && (
                      <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>
                        📂 {task.project_name.toUpperCase()}
                      </div>
                    )}
                    {task.parent_task_title && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                        ↳ Subtask of: {task.parent_task_title}
                      </div>
                    )}
                    {task.due_date && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? '#f43f5e' : 'var(--color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>⏰</span> {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {isOverdue && <span style={{color: '#f43f5e'}}>(Overdue)</span>}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)', border: '2px solid var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4b5563' }}>
                          {task.assigned_to_name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{task.assigned_to_name.split(' ')[0]}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 4 }}>
                        {/* Fallback buttons for accessibility / non-drag interactions */}
                        {col.id !== 'pending' && (
                          <button onClick={() => handleStatusChange(task.id, 'pending')} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>←</button>
                        )}
                        {col.id !== 'in-progress' && (
                          <button onClick={() => handleStatusChange(task.id, 'in-progress')} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                            {col.id === 'pending' ? '→' : '←'}
                          </button>
                        )}
                        {col.id !== 'completed' && (
                          <button onClick={() => handleStatusChange(task.id, 'completed')} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>→</button>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
                
                {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, background: 'rgba(0,0,0,0.02)', borderRadius: 12, border: '2px dashed var(--color-border)' }}>
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar View */
        renderCalendar()
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass" style={{ width: 480, borderRadius: 20, padding: 24, border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Create New Task</h3>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Task Title</label>
                <input 
                  type="text" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                  placeholder="E.g., Update landing page design"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Description</label>
                <textarea 
                  value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', minHeight: 80, resize: 'vertical' }}
                  placeholder="Task details..."
                />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Assign To</label>
                  <select 
                    required value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">Select a user...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.level_name})</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Priority</label>
                  <select 
                    value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Link to Project</label>
                  <select 
                    value={newTask.project_id} onChange={e => setNewTask({...newTask, project_id: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">No Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Parent Task (Subtask of)</label>
                  <select 
                    value={newTask.parent_task_id} onChange={e => setNewTask({...newTask, parent_task_id: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">None (Top-level task)</option>
                    {tasks.filter(t => t.project_id === Number(newTask.project_id) || !newTask.project_id).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Due Date</label>
                <input 
                  type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
