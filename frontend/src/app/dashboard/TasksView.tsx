'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getTasks, createTask, updateTask, deleteTask, getUsers, getProjects } from '@/lib/api';
import { User } from '@/lib/constants';
import {
  Plus, LayoutGrid, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  ListTodo, Clock, CheckCircle2, Trash2, Folder, CornerDownRight,
  Clock4, GripVertical, AlertCircle, Edit2
} from 'lucide-react';
import {
  Badge, Button, EmptyState, Field, Input, Modal, Select, Skeleton, SkeletonCard, Textarea,
  useConfirm, type BadgeTone,
} from '@/components/ui';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_by: number;
  venture_id: number;
  due_date: string;
  created_at: string;
  assignees: {id: number, name: string, avatar: string}[];
  assigned_by_name: string;
  assigned_by_avatar: string;
  venture_name: string;
  primary_color: string;
  project_id?: number;
  project_name?: string;
  parent_task_id?: number;
  parent_task_title?: string;
}

type Priority = Task['priority'];

/**
 * Priority maps to the semantic badge tones so the pills follow the theme
 * tokens instead of the hard-coded hexes this file used to carry.
 */
const PRIORITY_TONES: Record<Priority, BadgeTone> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

/** Same scale as the tones above, for the calendar chips which are not pills. */
const PRIORITY_VARS: Record<Priority, string> = {
  low: 'var(--color-emerald)',
  medium: 'var(--color-cyan)',
  high: 'var(--color-amber)',
  urgent: 'var(--color-rose)',
};

const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const FIELD_LABEL_CLASS =
  'block text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';

const TASK_FORM_ID = 'task-form';

function CustomDatePicker({ value, onChange, id }: { value: string, onChange: (val: string) => void, id?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-2" />);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isSelected = value === dateStr;
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const isPast = dateStr < new Date().toISOString().split('T')[0];
    days.push(
      <button
        key={`day-${i}`}
        type="button"
        disabled={isPast}
        aria-pressed={isSelected}
        onClick={() => { onChange(dateStr); setIsOpen(false); }}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${isPast ? 'opacity-30 cursor-not-allowed text-[var(--color-text-muted)]' : isSelected ? 'bg-[var(--color-purple-glow)] text-white font-bold' : isToday ? 'bg-[var(--color-purple-glow)]/20 text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'}`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)] text-left flex items-center justify-between"
      >
        {value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}
        <CalendarIcon size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-[260px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <Button
              iconOnly
              aria-label="Previous month"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date(year, month - 1))}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <div className="text-sm font-bold text-[var(--color-text-primary)]">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            <Button
              iconOnly
              aria-label="Next month"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date(year, month + 1))}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-[10px] font-semibold text-[var(--color-text-muted)]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {days}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksView({ currentUser }: { currentUser: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assigned_to: [] as string[], due_date: '', project_id: '', parent_task_id: '' });
  const [filterProjectId, setFilterProjectId] = useState<string>('all');

  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const confirm = useConfirm();

  // backend/src/routes/task.routes.js:
  //   POST /        requireLevel(7)  → accessLevel <= 7
  //   PUT  /:id     requireLevel(7)  → accessLevel <= 7
  //   DELETE /:id   requireLevel(5)  → accessLevel <= 5
  // Interns (L8) were previously shown a "New Task" button that always 403s,
  // and an L6/L7 task creator was shown a Delete button that always 403s.
  const canWriteTasks = currentUser.accessLevel <= 7;
  const canDeleteTasks = currentUser.accessLevel <= 5;

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

  const openCreateModal = () => {
    setEditingTask(null);
    setNewTask({ title: '', description: '', priority: 'medium', assigned_to: [], due_date: '', project_id: '', parent_task_id: '' });
    setShowModal(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || newTask.assigned_to.length === 0) {
      toast.error('Title and Assignee are required');
      return;
    }
    try {
      const payload = {
        ...newTask,
        project_id: newTask.project_id || undefined,
        parent_task_id: newTask.parent_task_id || undefined
      };

      let res;
      if (editingTask) {
        res = await updateTask(editingTask.id, payload);
      } else {
        res = await createTask(payload);
      }

      if (res.success) {
        toast.success(editingTask ? 'Task updated successfully' : 'Task created successfully');
        setShowModal(false);
        setEditingTask(null);
        setNewTask({ title: '', description: '', priority: 'medium', assigned_to: [], due_date: '', project_id: '', parent_task_id: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(editingTask ? 'Failed to update task' : 'Failed to create task');
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
    const confirmed = await confirm({
      title: 'Delete this task?',
      description: 'The task and its assignments will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
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
      <div className="flex flex-col h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Task Management</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Organize and track your deliverables.</p>
          </div>
        </div>
        <div role="status" aria-busy="true" aria-live="polite" className="flex gap-6 overflow-x-auto pb-4">
          <span className="sr-only">Loading tasks…</span>
          {columns.map(col => (
            <div key={col.id} className="flex-1 min-w-[320px] flex flex-col gap-4 p-4 rounded-2xl bg-[var(--color-bg-secondary)]">
              <div className="px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                <Skeleton height={12} width="50%" />
              </div>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ))}
        </div>
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
                className={`text-[10px] px-1.5 py-1 rounded font-semibold truncate border ${t.status === 'completed' ? 'opacity-60 line-through' : ''}`}
                style={{
                  background: t.status === 'completed' ? 'var(--color-bg-secondary)' : tint(PRIORITY_VARS[t.priority], 12),
                  color: t.status === 'completed' ? 'var(--color-text-muted)' : PRIORITY_VARS[t.priority],
                  borderColor: t.status === 'completed' ? 'var(--color-border)' : tint(PRIORITY_VARS[t.priority], 30),
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
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<ChevronLeft size={16} aria-hidden="true" />}
            onClick={() => setCurrentMonth(new Date(year, month - 1))}
          >
            Prev
          </Button>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <Button
            variant="secondary"
            size="sm"
            trailingIcon={<ChevronRight size={16} aria-hidden="true" />}
            onClick={() => setCurrentMonth(new Date(year, month + 1))}
          >
            Next
          </Button>
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
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${viewMode === 'kanban' ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-transparent'}`}
            >
              <LayoutGrid size={14} aria-hidden="true" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              aria-pressed={viewMode === 'calendar'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${viewMode === 'calendar' ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-transparent'}`}
            >
              <CalendarIcon size={14} aria-hidden="true" /> Calendar
            </button>
          </div>

          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            aria-label="Filter tasks by project"
            className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-purple-glow)]"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {canWriteTasks && (
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={16} strokeWidth={2.5} aria-hidden="true" />}
              onClick={openCreateModal}
            >
              New Task
            </Button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={22} aria-hidden="true" />}
          title="No tasks yet"
          description={canWriteTasks
            ? 'Tasks are how work gets assigned and tracked here. Create the first one and it will appear on the board.'
            : 'Nothing has been assigned to you yet. Creating tasks needs Staff access (L7) or above — a manager can assign you one.'}
          action={canWriteTasks ? (
            <Button
              variant="primary"
              leadingIcon={<Plus size={16} strokeWidth={2.5} aria-hidden="true" />}
              onClick={openCreateModal}
            >
              Create your first task
            </Button>
          ) : undefined}
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<Folder size={22} aria-hidden="true" />}
          title="No tasks in this project"
          description="Nothing has been assigned to the selected project yet. Clear the filter to see every task."
          action={
            <Button variant="secondary" onClick={() => setFilterProjectId('all')}>
              Show all projects
            </Button>
          }
        />
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-4 min-h-[500px]">
          {columns.map(col => (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex-1 min-w-[320px] flex flex-col gap-4 p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-transparent transition-colors hover:border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-[var(--color-bg-card)]" style={{ borderColor: `${col.color}20` }}>
                <col.icon size={18} style={{ color: col.color }} strokeWidth={2.5} aria-hidden="true" />
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
                    {isOverdue && <div aria-hidden="true" className="absolute top-0 left-0 w-1 h-full bg-rose-500" />}

                    <div className="flex items-center justify-between mb-3">
                      <Badge tone={PRIORITY_TONES[task.priority]}>{task.priority}</Badge>

                      <div className="flex items-center gap-1">
                        <GripVertical size={14} aria-hidden="true" className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                        {canWriteTasks && (currentUser.id === task.assigned_by || currentUser.accessLevel <= 3) && (
                          <Button
                            iconOnly
                            aria-label={`Edit task: ${task.title}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTask(task);
                              setNewTask({
                                title: task.title,
                                description: task.description || '',
                                priority: task.priority,
                                assigned_to: task.assignees ? task.assignees.map(a => a.id.toString()) : [],
                                due_date: task.due_date ? task.due_date.split('T')[0] : '',
                                project_id: task.project_id?.toString() || '',
                                parent_task_id: task.parent_task_id?.toString() || ''
                              });
                              setShowModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-[var(--color-purple-glow)]"
                          >
                            <Edit2 size={14} aria-hidden="true" />
                          </Button>
                        )}
                        {canDeleteTasks && (
                          <Button
                            iconOnly
                            aria-label={`Delete task: ${task.title}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(task.id)}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-[var(--color-rose)]"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2 leading-snug">
                      {task.title}
                    </h4>

                    {task.project_name && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-purple-glow)] mb-1">
                        <Folder size={12} aria-hidden="true" /> {task.project_name.toUpperCase()}
                      </div>
                    )}

                    {task.parent_task_title && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)] mb-2">
                        <CornerDownRight size={12} aria-hidden="true" /> Subtask: {task.parent_task_title}
                      </div>
                    )}

                    {task.due_date && (
                      <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-3 ${isOverdue ? 'text-rose-500' : 'text-[var(--color-text-muted)]'}`}>
                        {isOverdue ? <AlertCircle size={12} aria-hidden="true" /> : <Clock4 size={12} aria-hidden="true" />}
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {isOverdue && <span>(Overdue)</span>}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {task.assignees?.slice(0, 3).map((a, idx) => (
                            <div key={idx} className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-primary)] shrink-0" title={a.name}>
                              {a.name.charAt(0)}
                            </div>
                          ))}
                          {task.assignees?.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[9px] font-bold text-[var(--color-text-muted)] shrink-0">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                        {task.assignees?.length === 1 && (
                          <span className="text-[11px] font-medium text-[var(--color-text-secondary)] truncate max-w-[100px] ml-1">
                            {task.assignees[0].name.split(' ')[0]}
                          </span>
                        )}
                        {task.assignees?.length > 1 && (
                          <span className="text-[11px] font-medium text-[var(--color-text-secondary)] truncate max-w-[100px] ml-1">
                            {task.assignees.length} Assignees
                          </span>
                        )}
                        {(!task.assignees || task.assignees.length === 0) && (
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)] italic">Unassigned</span>
                        )}
                      </div>

                      <div className="flex gap-1 md:hidden group-hover:flex group-focus-within:flex">
                        {col.id !== 'pending' && (
                          <Button
                            iconOnly
                            aria-label={`Move "${task.title}" to Pending`}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusChange(task.id, 'pending')}
                          >
                            <ChevronLeft size={14} aria-hidden="true" />
                          </Button>
                        )}
                        {col.id !== 'in-progress' && (
                          <Button
                            iconOnly
                            aria-label={`Move "${task.title}" to In Progress`}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusChange(task.id, 'in-progress')}
                          >
                            {col.id === 'pending' ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
                          </Button>
                        )}
                        {col.id !== 'completed' && (
                          <Button
                            iconOnly
                            aria-label={`Move "${task.title}" to Completed`}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusChange(task.id, 'completed')}
                          >
                            <ChevronRight size={14} aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )})}

                {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                  <div className="p-8 text-center text-[12px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] rounded-xl border border-dashed border-[var(--color-border)]">
                    Nothing in {col.title.toLowerCase()} — drag a card here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        renderCalendar()
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        description={editingTask ? 'Update the details of this task.' : 'Describe the work and pick who owns it.'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={TASK_FORM_ID}>
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </>
        }
      >
        <form id={TASK_FORM_ID} onSubmit={handleCreateTask} className="flex flex-col gap-4">
          <Field label="Task Title" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                type="text"
                required
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                placeholder="E.g., Update landing page design"
              />
            )}
          </Field>

          <Field label="Description">
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                rows={3}
                value={newTask.description}
                onChange={e => setNewTask({...newTask, description: e.target.value})}
                placeholder="Task details..."
              />
            )}
          </Field>

          <div className="flex gap-4">
            <fieldset className="flex-1 min-w-0 border-0 p-0 m-0">
              <legend className={`${FIELD_LABEL_CLASS} mb-2`}>
                Assign To
                <span className="ml-1 text-[var(--color-rose)]" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </legend>
              <div className="w-full max-h-[120px] overflow-y-auto px-2 py-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] custom-scrollbar flex flex-col gap-1">
                {users.map(u => {
                  const isSelected = newTask.assigned_to.includes(u.id.toString());
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-[13px] text-[var(--color-text-primary)] cursor-pointer hover:bg-[var(--color-bg-card-hover)] p-1.5 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newArr = e.target.checked
                            ? [...newTask.assigned_to, u.id.toString()]
                            : newTask.assigned_to.filter(id => id !== u.id.toString());
                          setNewTask({...newTask, assigned_to: newArr});
                        }}
                        className="accent-[var(--color-purple-glow)] w-3.5 h-3.5"
                      />
                      {u.full_name}
                    </label>
                  );
                })}
                {users.length === 0 && (
                  <p className="p-2 text-xs text-[var(--color-text-muted)]">No teammates available to assign.</p>
                )}
              </div>
            </fieldset>

            <Field label="Priority" className="flex-1 min-w-0">
              {({ id }) => (
                <Select
                  id={id}
                  value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              )}
            </Field>
          </div>

          <div className="flex gap-4">
            <Field label="Link to Project" className="flex-1 min-w-0">
              {({ id }) => (
                <Select
                  id={id}
                  value={newTask.project_id}
                  onChange={e => setNewTask({...newTask, project_id: e.target.value})}
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Parent Task" hint="Makes this a subtask." className="flex-1 min-w-0">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={newTask.parent_task_id}
                  onChange={e => setNewTask({...newTask, parent_task_id: e.target.value})}
                >
                  <option value="">None (Top-level)</option>
                  {tasks.filter(t => t.project_id === Number(newTask.project_id) || !newTask.project_id).map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Due Date">
            {({ id }) => (
              <CustomDatePicker
                id={id}
                value={newTask.due_date}
                onChange={val => setNewTask({...newTask, due_date: val})}
              />
            )}
          </Field>
        </form>
      </Modal>
    </div>
  );
}
