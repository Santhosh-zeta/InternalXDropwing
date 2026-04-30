'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getTasks, createTask, updateTask, deleteTask, getUsers, getProjects } from '@/lib/api';
import { User } from '@/lib/constants';
import { 
  Plus, LayoutGrid, Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  ListTodo, Clock, CheckCircle2, Trash2, Folder, CornerDownRight, 
  Clock4, Loader2, GripVertical, AlertCircle
} from 'lucide-react';

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

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('taskId');
    if (!taskIdStr) return;
    
    const taskId = parseInt(taskIdStr, 10);
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status !== newStatus) {
      const previousTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      
      try {
        const res = await updateTask(taskId, { status: newStatus });
        if (res.success) {
          toast.success(`Task moved to ${newStatus}`);
        } else {
          setTasks(previousTasks);
          toast.error('Failed to move task');
        }
      } catch {
        setTasks(previousTasks);
        toast.error('Failed to move task');
      }
    }
  };

  const columns = [
    { id: 'pending', title: 'Pending', icon: ListTodo, color: '#8b5cf6' },
    { id: 'in-progress', title: 'In Progress', icon: Clock, color: '#0ea5e9' },
    { id: 'completed', title: 'Completed', icon: CheckCircle2, color: '#10b981' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
        <p className="text-[var(--color-text-muted)] text-sm font-medium">Loading tasks...</p>
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => filterProjectId === 'all' || t.project_id === Number(filterProjectId));

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[120px] border-r border-b border-[var(--color-border)] p-2 bg-[var(--color-bg-secondary)]/30" />);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = filteredTasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));
      
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div key={`day-${i}`} className={`min-h-[120px] border-r border-b border-[var(--color-border)] p-2 transition-colors ${isToday ? 'bg-[var(--color-purple-glow)]/5' : 'bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)]/50'}`}>
          <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-2 ${isToday ? 'bg-[var(--color-purple-glow)] text-white' : 'text-[var(--color-text-secondary)]'}`}>
            {i}
          </div>
          <div className="flex flex-col gap-1">
            {dayTasks.map(t => (
              <div 
                key={t.id} 
                className={`text-[10px] px-1.5 py-1 rounded font-semibold truncate cursor-pointer border ${t.status === 'completed' ? 'opacity-60 line-through' : ''}`}
                style={{
                  background: t.status === 'completed' ? 'var(--color-bg-secondary)' : `${PRIORITY_COLORS[t.priority]}15`,
                  color: t.status === 'completed' ? 'var(--color-text-muted)' : PRIORITY_COLORS[t.priority],
                  borderColor: t.status === 'completed' ? 'var(--color-border)' : `${PRIORITY_COLORS[t.priority]}30`,
                }}
                title={`${t.title} (${t.status})`}
              >
                {t.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <button 
            onClick={() => setCurrentMonth(new Date(year, month - 1))} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-card-hover)] text-[13px] font-medium text-[var(--color-text-primary)] transition-colors"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <button 
            onClick={() => setCurrentMonth(new Date(year, month + 1))} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-card-hover)] text-[13px] font-medium text-[var(--color-text-primary)] transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2.5 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Task Management</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Organize and track your deliverables.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center p-1 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${viewMode === 'kanban' ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-transparent'}`}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${viewMode === 'calendar' ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-transparent'}`}
            >
              <CalendarIcon size={14} /> Calendar
            </button>
          </div>

          <select 
            value={filterProjectId} 
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white text-[13px] font-bold transition-colors shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} /> New Task
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-4 min-h-[500px]">
          {columns.map(col => (
            <div 
              key={col.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex-1 min-w-[320px] flex flex-col gap-4 p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-transparent transition-colors hover:border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-[var(--color-bg-card)]" style={{ borderColor: `${col.color}20` }}>
                <col.icon size={18} style={{ color: col.color }} strokeWidth={2.5} />
                <span className="font-bold text-[14px] tracking-wide" style={{ color: col.color }}>{col.title}</span>
                <span className="ml-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ background: `${col.color}10`, color: col.color, borderColor: `${col.color}30` }}>
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>

              <div className="flex flex-col gap-3 min-h-[100px]">
                {filteredTasks.filter(t => t.status === col.id).map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                  return (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm cursor-grab hover:border-[var(--color-text-muted)] transition-all hover:shadow-md relative overflow-hidden"
                    style={{ borderColor: isOverdue ? '#f43f5e50' : undefined }}
                    onDrag={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.5'; }}
                    onDragEnd={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                  >
                    {isOverdue && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />}
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border" style={{ background: `${PRIORITY_COLORS[task.priority]}10`, color: PRIORITY_COLORS[task.priority], borderColor: `${PRIORITY_COLORS[task.priority]}30` }}>
                        {task.priority}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <GripVertical size={14} className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                        {(currentUser.id === task.assigned_by || currentUser.accessLevel <= 3) && (
                          <button onClick={() => handleDelete(task.id)} className="text-[var(--color-text-muted)] hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2 leading-snug">
                      {task.title}
                    </h4>
                    
                    {task.project_name && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-purple-glow)] mb-1">
                        <Folder size={12} /> {task.project_name.toUpperCase()}
                      </div>
                    )}
                    
                    {task.parent_task_title && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)] mb-2">
                        <CornerDownRight size={12} /> Subtask: {task.parent_task_title}
                      </div>
                    )}
                    
                    {task.due_date && (
                      <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-3 ${isOverdue ? 'text-rose-500' : 'text-[var(--color-text-muted)]'}`}>
                        {isOverdue ? <AlertCircle size={12} /> : <Clock4 size={12} />}
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                        {isOverdue && <span>(Overdue)</span>}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-primary)] shrink-0">
                          {task.assigned_to_name.charAt(0)}
                        </div>
                        <span className="text-[11px] font-medium text-[var(--color-text-secondary)] truncate max-w-[100px]">{task.assigned_to_name.split(' ')[0]}</span>
                      </div>
                      
                      <div className="flex gap-1 md:hidden group-hover:flex">
                        {col.id !== 'pending' && (
                          <button onClick={() => handleStatusChange(task.id, 'pending')} className="p-1 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors"><ChevronLeft size={14} /></button>
                        )}
                        {col.id !== 'in-progress' && (
                          <button onClick={() => handleStatusChange(task.id, 'in-progress')} className="p-1 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors">
                            {col.id === 'pending' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                          </button>
                        )}
                        {col.id !== 'completed' && (
                          <button onClick={() => handleStatusChange(task.id, 'completed')} className="p-1 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors"><ChevronRight size={14} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
                
                {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                  <div className="p-8 text-center text-[12px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] rounded-xl border border-dashed border-[var(--color-border)]">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        renderCalendar()
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] w-full max-w-[500px] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-5">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Task Title</label>
                <input 
                  type="text" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                  placeholder="E.g., Update landing page design"
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Description</label>
                <textarea 
                  value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] min-h-[80px] resize-y"
                  placeholder="Task details..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Assign To</label>
                  <select 
                    required value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                  >
                    <option value="">Select a user...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.level_name})</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Priority</label>
                  <select 
                    value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Link to Project</label>
                  <select 
                    value={newTask.project_id} onChange={e => setNewTask({...newTask, project_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                  >
                    <option value="">No Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Parent Task (Subtask of)</label>
                  <select 
                    value={newTask.parent_task_id} onChange={e => setNewTask({...newTask, parent_task_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                  >
                    <option value="">None (Top-level)</option>
                    {tasks.filter(t => t.project_id === Number(newTask.project_id) || !newTask.project_id).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">Due Date</label>
                <input 
                  type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-[13px] font-bold text-white transition-colors">
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
