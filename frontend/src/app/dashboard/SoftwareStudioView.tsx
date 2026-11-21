'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Code2, Plus, Play, Rocket, Zap, Bug, Bookmark,
  Layers, Search, Calendar, BarChart3, MessageSquare,
  RefreshCw, CheckSquare
} from 'lucide-react';
import type { User } from '@/lib/constants';
import type {
  SoftwareEpic, SoftwareSprint, SoftwareRelease, SoftwareIssue,
  TaskStatus, IssueType, Priority, SprintRetroNote, Project, TeamMember
} from '@/lib/types';
import {
  getSoftwareEpics, getSoftwareSprints, getSoftwareReleases, getSoftwareIssues,
  createSoftwareIssue, updateSoftwareIssue, getSprintRetros, createSprintRetro,
  getProjects, getUsers, errMsg
} from '@/lib/api';
import { Button, Badge, type BadgeTone } from '@/components/ui';
import IssueDetailModal from './software/IssueDetailModal';
import PrdModal from './software/PrdModal';
import SprintModal from './software/SprintModal';
import ReleaseModal from './software/ReleaseModal';

export type SoftwareTab =
  | 'requirements' // Stage 1 & 2: PRDs & Epics
  | 'backlog'      // Stage 3: Backlog grooming & Sprints
  | 'board'        // Stage 4: Scrum / Kanban Board
  | 'roadmap'      // Stage 4: Timeline / Gantt
  | 'qa'           // Stage 5: QA & Defect Tracking
  | 'releases'     // Stage 6: Release & Deployments
  | 'retros';      // Stage 7: Maintenance & Retrospectives

const TYPE_ICONS: Record<IssueType, typeof CheckSquare> = {
  epic: Zap,
  story: Bookmark,
  task: CheckSquare,
  bug: Bug,
  subtask: Layers,
};

const TYPE_COLORS: Record<IssueType, string> = {
  epic: '#a855f7',
  story: '#10b981',
  task: '#0ea5e9',
  bug: '#ef4444',
  subtask: '#6366f1',
};

const PRIORITY_TONES: Record<Priority, BadgeTone> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

const BOARD_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'To Do / Backlog', color: '#8b5cf6' },
  { id: 'in-progress', label: 'In Progress / Dev', color: '#0ea5e9' },
  { id: 'completed', label: 'Completed / Shipped', color: '#10b981' },
];

export default function SoftwareStudioView({ currentUser }: { currentUser: User }) {
  const [activeTab, setActiveTab] = useState<SoftwareTab>('board');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Core Data
  const [issues, setIssues] = useState<SoftwareIssue[]>([]);
  const [epics, setEpics] = useState<SoftwareEpic[]>([]);
  const [sprints, setSprints] = useState<SoftwareSprint[]>([]);
  const [releases, setReleases] = useState<SoftwareRelease[]>([]);
  const [retros, setRetros] = useState<SprintRetroNote[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSprint, setFilterSprint] = useState<string>('all');

  // Modals
  const [selectedIssue, setSelectedIssue] = useState<SoftwareIssue | null>(null);
  const [editingEpic, setEditingEpic] = useState<SoftwareEpic | null | 'new'>(null);
  const [editingSprint, setEditingSprint] = useState<SoftwareSprint | null | 'new'>(null);
  const [editingRelease, setEditingRelease] = useState<SoftwareRelease | null | 'new'>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<IssueType>('story');

  // New Retro note input
  const [retroContent, setRetroContent] = useState('');
  const [retroCategory, setRetroCategory] = useState<'went_well' | 'to_improve' | 'action_item'>('went_well');

  // Trigger reload
  const reloadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Load Initial Projects & Users
  useEffect(() => {
    let ignore = false;
    Promise.all([getProjects(), getUsers()]).then(([pRes, uRes]) => {
      if (ignore) return;
      const pList = pRes.data || [];
      setProjects(pList);
      setMembers(uRes.data || []);
      const fenixaProj = pList.find((p) => p.venture_name?.toLowerCase().includes('fenixa')) || pList[0];
      if (fenixaProj) setSelectedProjectId(fenixaProj.id);
    });
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch Studio Data for Selected Project
  useEffect(() => {
    if (!selectedProjectId) return;
    let ignore = false;
    Promise.all([
      getSoftwareIssues(undefined, { project_id: selectedProjectId }),
      getSoftwareEpics(undefined, selectedProjectId),
      getSoftwareSprints(undefined, selectedProjectId),
      getSoftwareReleases(undefined, selectedProjectId),
    ])
      .then(([iRes, eRes, sRes, rRes]) => {
        if (ignore) return;
        setIssues(iRes.data || []);
        setEpics(eRes.data || []);
        setSprints(sRes.data || []);
        setReleases(rRes.data || []);

        const active = (sRes.data || []).find((s) => s.status === 'active') || sRes.data?.[0];
        if (active) {
          getSprintRetros(active.id)
            .then((retroRes) => {
              if (!ignore) setRetros(retroRes.data || []);
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (!ignore) toast.error('Failed to load software studio data');
      });

    return () => {
      ignore = true;
    };
  }, [selectedProjectId, refreshKey]);

  // Quick Issue Creation
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !selectedProjectId) return;
    try {
      const activeSprint = sprints.find((s) => s.status === 'active');
      await createSoftwareIssue({
        project_id: selectedProjectId,
        title: quickTitle.trim(),
        issue_type: quickType,
        sprint_id: activeSprint ? activeSprint.id : null,
      });
      setQuickTitle('');
      setQuickCreateOpen(false);
      toast.success('Issue created');
      void reloadData();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to create issue'));
    }
  };

  // Move Issue across Kanban Status
  const handleMoveStatus = async (issue: SoftwareIssue, targetStatus: TaskStatus) => {
    setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status: targetStatus } : i)));
    try {
      await updateSoftwareIssue(issue.id, { status: targetStatus });
      toast.success(`Moved to ${targetStatus}`);
    } catch {
      toast.error('Failed to move issue');
      void reloadData();
    }
  };

  // Move Issue to Sprint
  const handleMoveToSprint = async (issueId: number, sprintId: number | null) => {
    try {
      await updateSoftwareIssue(issueId, { sprint_id: sprintId });
      toast.success(sprintId ? 'Moved to sprint' : 'Moved to backlog');
      void reloadData();
    } catch {
      toast.error('Failed to update sprint assignment');
    }
  };

  // Add Retro Note
  const handleAddRetro = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeSprint = sprints.find((s) => s.status === 'active') || sprints[0];
    if (!activeSprint || !retroContent.trim()) return;
    try {
      await createSprintRetro(activeSprint.id, {
        category: retroCategory,
        content: retroContent.trim(),
      });
      setRetroContent('');
      const refreshed = await getSprintRetros(activeSprint.id);
      setRetros(refreshed.data || []);
      toast.success('Retrospective note added');
    } catch {
      toast.error('Failed to add retro note');
    }
  };

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const matchSearch =
        !search ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        (i.issue_key && i.issue_key.toLowerCase().includes(search.toLowerCase()));
      const matchType = filterType === 'all' || i.issue_type === filterType;
      const matchSprint =
        filterSprint === 'all' ||
        (filterSprint === 'backlog' && !i.sprint_id) ||
        (filterSprint === 'active' && i.sprint_status === 'active') ||
        String(i.sprint_id) === filterSprint;
      return matchSearch && matchType && matchSprint;
    });
  }, [issues, search, filterType, filterSprint]);

  const activeSprint = sprints.find((s) => s.status === 'active');
  const backlogIssues = issues.filter((i) => !i.sprint_id);
  const canManage = currentUser.accessLevel <= 5;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Studio Header */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-linear-to-r from-cyan-950/40 via-[var(--color-bg-card)] to-[var(--color-bg-card)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Code2 size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-400 uppercase">
                  Fenixa Solutions Suite
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  End-to-End Software Engineering & Agile OS
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Fenixa Software Studio
              </h1>
            </div>
          </div>

          {/* Project Switcher & Quick Create */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.venture_name || 'Project'})
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={16} />}
              onClick={() => setQuickCreateOpen(true)}
            >
              New Issue
            </Button>
          </div>
        </div>

        {/* Lifecycle Stage Sub-Navigation */}
        <div className="mt-6 flex flex-wrap gap-1 border-t border-[var(--color-border)] pt-4">
          {[
            { id: 'board', label: 'Scrum Board', icon: CheckSquare, desc: 'Interactive Kanban' },
            { id: 'backlog', label: 'Backlog & Sprints', icon: Layers, desc: 'Sprint Planning' },
            { id: 'requirements', label: 'Requirements (PRDs)', icon: Zap, desc: 'Epics & Specs' },
            { id: 'roadmap', label: 'Timeline Roadmap', icon: Calendar, desc: 'Gantt Chart' },
            { id: 'qa', label: 'QA & Defects', icon: Bug, desc: 'Defect Tracking' },
            { id: 'releases', label: 'Releases & Deploy', icon: Rocket, desc: 'Versioning' },
            { id: 'retros', label: 'Retrospectives & Velocity', icon: BarChart3, desc: 'Analytics' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SoftwareTab)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Filters Bar (Active on board, backlog, qa) */}
      {['board', 'backlog', 'qa'].includes(activeTab) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-2.5 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issue title, FEN-key..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-8 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="epic">Epic</option>
            </select>

            {activeTab === 'board' && (
              <select
                value={filterSprint}
                onChange={(e) => setFilterSprint(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-cyan-500"
              >
                <option value="all">All Sprints</option>
                <option value="active">Active Sprint Only</option>
                <option value="backlog">Backlog Items</option>
                {sprints.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-xs text-[var(--color-text-secondary)] flex items-center gap-3">
            <span>
              Showing <strong>{filteredIssues.length}</strong> issues
            </span>
            <button
              onClick={() => void reloadData()}
              className="rounded p-1 hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
              title="Refresh data"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: REQUIREMENTS & PRDS (EPICS)                        */}
      {/* ========================================================= */}
      {activeTab === 'requirements' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Product Requirements & Epics (PRD)
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Requirement engineering, user journeys, architecture design & acceptance criteria
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={16} />}
              onClick={() => setEditingEpic('new')}
            >
              New Specification / Epic
            </Button>
          </div>

          {epics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-12 text-center text-xs text-[var(--color-text-secondary)]">
              No specifications or epics documented yet. Click &quot;New Specification&quot; to draft your first PRD.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {epics.map((epic) => (
                <div
                  key={epic.id}
                  className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 hover:border-purple-500/50 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
                      <Zap size={13} /> {epic.key}
                    </span>
                    <Badge tone={PRIORITY_TONES[epic.priority]}>{epic.status.toUpperCase()}</Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">{epic.title}</h3>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {epic.summary || 'No summary provided.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span>
                      Progress: <strong>{epic.completed_issues}</strong> / {epic.total_issues} issues
                    </span>
                    <span>
                      Points: <strong>{epic.completed_points}</strong> / {epic.total_points} pts
                    </span>
                    <button
                      onClick={() => setEditingEpic(epic)}
                      className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      View PRD →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: BACKLOG & SPRINTS                                  */}
      {/* ========================================================= */}
      {activeTab === 'backlog' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Agile Sprints & Product Backlog
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Sprint capacity planning, backlog refinement and iteration execution
              </p>
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Plus size={16} />}
                onClick={() => setEditingSprint('new')}
              >
                Create Sprint
              </Button>
            )}
          </div>

          {/* Active Sprint Section */}
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 text-white font-bold text-xs">
                  <Play size={14} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    {activeSprint ? activeSprint.name : 'No Active Sprint'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {activeSprint?.goal || 'Set a sprint goal and activate from planned sprints below.'}
                  </p>
                </div>
              </div>
              {activeSprint && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {activeSprint.total_points} Story Points
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingSprint(activeSprint)}
                  >
                    Manage Sprint
                  </Button>
                </div>
              )}
            </div>

            {/* Active Sprint Issue Items */}
            {activeSprint && (
              <div className="mt-4 flex flex-col gap-2">
                {issues
                  .filter((i) => i.sprint_id === activeSprint.id)
                  .map((issue) => {
                    const TypeIcon = TYPE_ICONS[issue.issue_type] || CheckSquare;
                    return (
                      <div
                        key={issue.id}
                        onClick={() => setSelectedIssue(issue)}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 hover:border-cyan-500 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span style={{ color: TYPE_COLORS[issue.issue_type] }}>
                            <TypeIcon size={15} />
                          </span>
                          <span className="font-bold text-[var(--color-text-secondary)]">
                            {issue.issue_key || `FEN-${issue.id}`}
                          </span>
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {issue.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {issue.story_points && (
                            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 font-bold text-cyan-600 dark:text-cyan-400">
                              {issue.story_points} pts
                            </span>
                          )}
                          <Badge tone={PRIORITY_TONES[issue.priority]}>{issue.status}</Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleMoveToSprint(issue.id, null);
                            }}
                            className="text-[10px] text-[var(--color-text-secondary)] hover:text-red-500 underline"
                          >
                            Send to Backlog
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Product Backlog Section */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Product Backlog Pool ({backlogIssues.length} items)
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Prioritized software items ready for sprint refinement
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {backlogIssues.length === 0 ? (
                <p className="text-xs text-center py-6 text-[var(--color-text-secondary)] italic">
                  Backlog is clean! Click &quot;+ New Issue&quot; above to groom new features or bugs.
                </p>
              ) : (
                backlogIssues.map((issue) => {
                  const TypeIcon = TYPE_ICONS[issue.issue_type] || CheckSquare;
                  return (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 hover:border-[var(--color-text-primary)] transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span style={{ color: TYPE_COLORS[issue.issue_type] }}>
                          <TypeIcon size={15} />
                        </span>
                        <span className="font-bold text-[var(--color-text-secondary)]">
                          {issue.issue_key || `FEN-${issue.id}`}
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {issue.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {issue.story_points && (
                          <span className="rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] px-1.5 py-0.5 font-bold">
                            {issue.story_points} pts
                          </span>
                        )}
                        <Badge tone={PRIORITY_TONES[issue.priority]}>{issue.priority}</Badge>
                        {activeSprint && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleMoveToSprint(issue.id, activeSprint.id);
                            }}
                            className="rounded bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all"
                          >
                            + Add to Active Sprint
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SCRUM / KANBAN BOARD                               */}
      {/* ========================================================= */}
      {activeTab === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => {
            const colIssues = filteredIssues.filter((i) => i.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const issueId = Number(e.dataTransfer.getData('issueId'));
                  const issue = issues.find((i) => i.id === issueId);
                  if (issue && issue.status !== col.id) void handleMoveStatus(issue, col.id);
                }}
                className="flex min-w-[300px] flex-1 flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 p-3.5"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <h3 className="text-xs font-bold text-[var(--color-text-primary)]">{col.label}</h3>
                  </div>
                  <span className="rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-secondary)]">
                    {colIssues.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex flex-col gap-2.5 min-h-[350px]">
                  {colIssues.map((issue) => {
                    const TypeIcon = TYPE_ICONS[issue.issue_type] || CheckSquare;
                    return (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('issueId', String(issue.id))}
                        onClick={() => setSelectedIssue(issue)}
                        className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3.5 shadow-xs hover:border-cyan-500 hover:shadow-md transition-all flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="flex items-center gap-1 text-[11px] font-bold"
                            style={{ color: TYPE_COLORS[issue.issue_type] }}
                          >
                            <TypeIcon size={13} />
                            {issue.issue_key || `FEN-${issue.id}`}
                          </span>
                          <Badge tone={PRIORITY_TONES[issue.priority]}>{issue.priority}</Badge>
                        </div>

                        <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-snug">
                          {issue.title}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-text-secondary)]">
                          <span className="flex items-center gap-1">
                            {issue.assigned_to_name ? (
                              <span className="font-medium text-[var(--color-text-primary)]">
                                👤 {issue.assigned_to_name.split(' ')[0]}
                              </span>
                            ) : (
                              'Unassigned'
                            )}
                          </span>

                          <div className="flex items-center gap-2">
                            {issue.story_points && (
                              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                {issue.story_points} pts
                              </span>
                            )}
                            {issue.comment_count ? (
                              <span className="flex items-center gap-0.5">
                                <MessageSquare size={11} /> {issue.comment_count}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ROADMAP & TIMELINE (GANTT)                         */}
      {/* ========================================================= */}
      {activeTab === 'roadmap' && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Interactive Gantt Roadmap & Strategic Timeline
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              High-level timeline visualization for Epics, feature releases and Sprint targets
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {epics.map((epic) => {
              const progressPct =
                epic.total_points > 0 ? Math.round((epic.completed_points / epic.total_points) * 100) : 0;
              return (
                <div key={epic.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                        {epic.key}
                      </span>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{epic.title}</h4>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      {progressPct}% Completed ({epic.completed_points}/{epic.total_points} pts)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-purple-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: QA & DEFECT TRACKER                                */}
      {/* ========================================================= */}
      {activeTab === 'qa' && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Quality Assurance & Defect Management
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Bug tracking, environmental isolation, reproduction steps & resolution audits
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              leadingIcon={<Bug size={16} />}
              onClick={() => {
                setQuickType('bug');
                setQuickCreateOpen(true);
              }}
            >
              Report Defect / Bug
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {issues
              .filter((i) => i.issue_type === 'bug')
              .map((bug) => (
                <div
                  key={bug.id}
                  onClick={() => setSelectedIssue(bug)}
                  className="cursor-pointer rounded-xl border border-red-500/20 bg-red-500/5 p-4 hover:border-red-500 transition-all flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-red-500 p-1.5 text-white">
                      <Bug size={14} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {bug.issue_key || `FEN-BUG-${bug.id}`}
                        </span>
                        <Badge tone={PRIORITY_TONES[bug.priority]}>{bug.priority.toUpperCase()}</Badge>
                        <span className="rounded bg-[var(--color-bg-card)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                          Env: {bug.environment || 'Production'}
                        </span>
                      </div>
                      <h4 className="mt-1 font-semibold text-[var(--color-text-primary)]">{bug.title}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--color-text-secondary)]">
                      {bug.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-red-500">
                      {bug.resolution || 'Unresolved'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: RELEASES & DEPLOYMENT                              */}
      {/* ========================================================= */}
      {activeTab === 'releases' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Software Releases & Version Pipeline
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Deployable version tags, changelog tracking and release packages
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Rocket size={16} />}
              onClick={() => setEditingRelease('new')}
            >
              New Release Version
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {releases.map((rel) => (
              <div
                key={rel.id}
                className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 hover:border-emerald-500/50 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Rocket size={13} /> {rel.version_name}
                  </span>
                  <Badge tone={rel.status === 'released' ? 'success' : 'info'}>
                    {rel.status.toUpperCase()}
                  </Badge>
                </div>

                <h3 className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">
                  {rel.description || 'Target Release Bundle'}
                </h3>

                {rel.release_notes && (
                  <pre className="mt-3 max-h-24 overflow-y-auto rounded-lg bg-[var(--color-bg-secondary)] p-2.5 text-[11px] text-[var(--color-text-secondary)] font-mono whitespace-pre-wrap">
                    {rel.release_notes}
                  </pre>
                )}

                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Target Date: {rel.release_date ? new Date(rel.release_date).toLocaleDateString() : 'TBD'}</span>
                  <button
                    onClick={() => setEditingRelease(rel)}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Edit Release →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: RETROSPECTIVES & VELOCITY                          */}
      {/* ========================================================= */}
      {activeTab === 'retros' && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Sprint Retrospectives & Continuous Improvement
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Retrospective board for team insights: What went well, What to improve, and Action items
            </p>
          </div>

          {/* Add Retro Note Form */}
          <form
            onSubmit={handleAddRetro}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
          >
            <select
              value={retroCategory}
              onChange={(e) => setRetroCategory(e.target.value as 'went_well' | 'to_improve' | 'action_item')}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)]"
            >
              <option value="went_well">🟢 What Went Well</option>
              <option value="to_improve">🟡 What To Improve</option>
              <option value="action_item">🔵 Action Item</option>
            </select>
            <input
              type="text"
              value={retroContent}
              onChange={(e) => setRetroContent(e.target.value)}
              placeholder="Share an observation, impediment, or constructive improvement..."
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
            />
            <Button type="submit" variant="primary" size="sm">
              Post Note
            </Button>
          </form>

          {/* Retro Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'went_well', title: 'What Went Well', color: '#10b981' },
              { id: 'to_improve', title: 'What To Improve', color: '#f59e0b' },
              { id: 'action_item', title: 'Action Items', color: '#0ea5e9' },
            ].map((col) => {
              const notes = retros.filter((r) => r.category === col.id);
              return (
                <div
                  key={col.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                    <h3 className="text-xs font-bold" style={{ color: col.color }}>
                      {col.title}
                    </h3>
                    <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                      {notes.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-xs shadow-xs"
                      >
                        <p className="text-[var(--color-text-primary)]">{note.content}</p>
                        <div className="mt-2 text-[10px] text-[var(--color-text-secondary)]">
                          — {note.author_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Create Issue Modal */}
      {quickCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Quick Create Issue</h3>
            <form onSubmit={handleQuickCreate} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Issue Type</label>
                <select
                  value={quickType}
                  onChange={(e) => setQuickType(e.target.value as IssueType)}
                  className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)]"
                >
                  <option value="story">Story (Feature)</option>
                  <option value="task">Engineering Task</option>
                  <option value="bug">Bug / Defect</option>
                  <option value="epic">Epic</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Summary / Title</label>
                <input
                  type="text"
                  required
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="e.g. Implement refresh token rotation"
                  className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setQuickCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Create Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          members={members}
          onClose={() => setSelectedIssue(null)}
          onUpdated={() => void reloadData()}
        />
      )}

      {/* PRD Modal */}
      {editingEpic && selectedProjectId && (
        <PrdModal
          projectId={selectedProjectId}
          epic={editingEpic === 'new' ? null : editingEpic}
          onClose={() => setEditingEpic(null)}
          onSaved={() => void reloadData()}
        />
      )}

      {/* Sprint Modal */}
      {editingSprint && selectedProjectId && (
        <SprintModal
          projectId={selectedProjectId}
          sprint={editingSprint === 'new' ? null : editingSprint}
          onClose={() => setEditingSprint(null)}
          onSaved={() => void reloadData()}
        />
      )}

      {/* Release Modal */}
      {editingRelease && selectedProjectId && (
        <ReleaseModal
          projectId={selectedProjectId}
          release={editingRelease === 'new' ? null : editingRelease}
          onClose={() => setEditingRelease(null)}
          onSaved={() => void reloadData()}
        />
      )}
    </div>
  );
}
