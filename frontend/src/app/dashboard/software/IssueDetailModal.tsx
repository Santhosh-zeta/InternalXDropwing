'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  CheckSquare, Bug, Bookmark, Zap, X, Layers, MessageSquare, Send
} from 'lucide-react';
import type { SoftwareIssue, Priority, TaskStatus, IssueType, TaskComment, TeamMember } from '@/lib/types';
import { updateSoftwareIssue, getIssueComments, addIssueComment, errMsg } from '@/lib/api';
import { Button, Badge, type BadgeTone } from '@/components/ui';

interface Props {
  issue: SoftwareIssue;
  members: TeamMember[];
  onClose: () => void;
  onUpdated: () => void;
}

const TYPE_CONFIG: Record<IssueType, { label: string; icon: typeof CheckSquare; color: string }> = {
  epic: { label: 'Epic', icon: Zap, color: '#a855f7' },
  story: { label: 'Story', icon: Bookmark, color: '#10b981' },
  task: { label: 'Task', icon: CheckSquare, color: '#0ea5e9' },
  bug: { label: 'Bug', icon: Bug, color: '#ef4444' },
  subtask: { label: 'Sub-task', icon: Layers, color: '#6366f1' },
};

const PRIORITY_TONES: Record<Priority, BadgeTone> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

export default function IssueDetailModal({ issue, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || '');
  const [status, setStatus] = useState<TaskStatus>(issue.status);
  const [priority, setPriority] = useState<Priority>(issue.priority);
  const [issueType, setIssueType] = useState<IssueType>(issue.issue_type);
  const [storyPoints, setStoryPoints] = useState<number | string>(issue.story_points ?? '');
  const [environment, setEnvironment] = useState(issue.environment || 'production');
  const [stepsToReproduce, setStepsToReproduce] = useState(issue.steps_to_reproduce || '');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(issue.acceptance_criteria || '');
  const [resolution, setResolution] = useState(issue.resolution || 'unresolved');
  const [saving, setSaving] = useState(false);

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');

  useEffect(() => {
    let ignore = false;
    getIssueComments(issue.id)
      .then((res) => {
        if (!ignore) setComments(res.data || []);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [issue.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSoftwareIssue(issue.id, {
        title,
        description,
        status,
        priority,
        issue_type: issueType,
        story_points: storyPoints === '' ? null : Number(storyPoints),
        environment,
        steps_to_reproduce: stepsToReproduce,
        acceptance_criteria: acceptanceCriteria,
        resolution: status === 'completed' && resolution === 'unresolved' ? 'fixed' : resolution,
      });
      toast.success('Issue updated');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update issue'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await addIssueComment(issue.id, { content: newComment.trim() });
      setNewComment('');
      const refreshed = await getIssueComments(issue.id);
      setComments(refreshed.data || []);
      toast.success('Comment added');
    } catch (err) {
      toast.error(errMsg(err, 'Failed to post comment'));
    }
  };

  const TypeIcon = TYPE_CONFIG[issueType]?.icon || CheckSquare;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold"
              style={{
                backgroundColor: `${TYPE_CONFIG[issueType]?.color}15`,
                color: TYPE_CONFIG[issueType]?.color,
              }}
            >
              <TypeIcon size={14} />
              {issue.issue_key || `${TYPE_CONFIG[issueType]?.label}-${issue.id}`}
            </span>
            <Badge tone={PRIORITY_TONES[priority]}>{priority.toUpperCase()}</Badge>
            {issue.epic_title && (
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                ⚡ {issue.epic_title}
              </span>
            )}
            {issue.sprint_name && (
              <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-600 dark:text-cyan-400">
                🏃 {issue.sprint_name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-y-auto">
          {/* Main Left Pane */}
          <div className="flex-1 p-6 flex flex-col gap-5 border-r border-[var(--color-border)]">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2 text-base font-semibold text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Tabs for details vs comments */}
            <div className="flex border-b border-[var(--color-border)] gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Specification & Requirements
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`pb-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'comments'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <MessageSquare size={14} />
                Discussion ({comments.length})
              </button>
            </div>

            {activeTab === 'details' ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Context, problem statement, technical summary..."
                    className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {issueType === 'story' && (
                  <div>
                    <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Bookmark size={14} /> Acceptance Criteria (Gherkin / Checklist)
                    </label>
                    <textarea
                      rows={3}
                      value={acceptanceCriteria}
                      onChange={(e) => setAcceptanceCriteria(e.target.value)}
                      placeholder="Given [context] When [action] Then [outcome]..."
                      className="mt-1 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-[var(--color-text-primary)] focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {issueType === 'bug' && (
                  <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <label className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <Bug size={14} /> Steps to Reproduce & Defect Details
                    </label>
                    <textarea
                      rows={3}
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                      placeholder="1. Navigate to /login&#10;2. Submit invalid token&#10;3. Observe crash..."
                      className="w-full rounded-lg border border-red-500/20 bg-[var(--color-bg-card)] p-2.5 text-sm text-[var(--color-text-primary)] focus:border-red-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">Target Environment</label>
                        <select
                          value={environment}
                          onChange={(e) => setEnvironment(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)]"
                        >
                          <option value="production">Production</option>
                          <option value="staging">Staging</option>
                          <option value="qa">QA Testing</option>
                          <option value="dev">Local Dev</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">Resolution</label>
                        <select
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)]"
                        >
                          <option value="unresolved">Unresolved</option>
                          <option value="fixed">Fixed</option>
                          <option value="wont_fix">Won&apos;t Fix</option>
                          <option value="duplicate">Duplicate</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Comments Thread */
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-secondary)] italic text-center py-6">
                      No comments yet. Start the technical discussion below.
                    </p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-xs">
                        <div className="flex items-center justify-between font-semibold text-[var(--color-text-primary)]">
                          <span>{c.author_name}</span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] font-normal">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 mt-auto">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment or mention @teammate..."
                    className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
                  />
                  <Button type="submit" variant="primary" size="sm" leadingIcon={<Send size={14} />}>
                    Post
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Right Sidebar Controls */}
          <div className="w-72 p-6 flex flex-col gap-5 bg-[var(--color-bg-secondary)]/50">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:border-cyan-500"
              >
                <option value="pending">To Do / Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed / Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Issue Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as IssueType)}
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500"
              >
                <option value="story">Story (Feature / User Story)</option>
                <option value="task">Engineering Task</option>
                <option value="bug">Defect / Bug</option>
                <option value="epic">Epic Requirement</option>
                <option value="subtask">Subtask</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent / Blocker</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Story Points (Fibonacci)
              </label>
              <select
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500"
              >
                <option value="">None</option>
                <option value="1">1 pt (Tiny)</option>
                <option value="2">2 pts (Small)</option>
                <option value="3">3 pts (Medium)</option>
                <option value="5">5 pts (Large)</option>
                <option value="8">8 pts (Complex)</option>
                <option value="13">13 pts (Epic-scale)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex flex-col gap-1.5">
              <div><strong>Project:</strong> {issue.project_name || 'Fenixa Core'}</div>
              <div><strong>Assignee:</strong> {issue.assigned_to_name || 'Unassigned'}</div>
              <div><strong>Created:</strong> {new Date(issue.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-3.5 bg-[var(--color-bg-secondary)]">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
