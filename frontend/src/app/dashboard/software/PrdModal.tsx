'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Zap, FileText } from 'lucide-react';
import { createSoftwareEpic, updateSoftwareEpic, errMsg } from '@/lib/api';
import type { SoftwareEpic, Priority } from '@/lib/types';
import { Button } from '@/components/ui';

interface Props {
  projectId: number;
  epic?: SoftwareEpic | null;
  onClose: () => void;
  onSaved: () => void;
}

type EpicStatus = 'draft' | 'in_review' | 'approved' | 'in_progress' | 'completed';

export default function PrdModal({ projectId, epic, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(epic?.title || '');
  const [summary, setSummary] = useState(epic?.summary || '');
  const [prdContent, setPrdContent] = useState(
    epic?.prd_content ||
`## 1. Problem Statement & Background
What problem are we solving for Fenixa Solutions users/clients?

## 2. Goals & Success Metrics
- Key Result 1: 
- Key Result 2:

## 3. Scope & User Journeys
### Persona: Developer / Admin / Client
- User Journey Step 1
- User Journey Step 2

## 4. Technical Architecture & Constraints
- Database schema changes:
- API endpoints:
- Security & Permission checks (RBAC):

## 5. Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2`
  );
  const [status, setStatus] = useState<EpicStatus>(epic?.status || 'draft');
  const [priority, setPriority] = useState<Priority>(epic?.priority || 'medium');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (epic) {
        await updateSoftwareEpic(epic.id, {
          title,
          summary,
          prd_content: prdContent,
          status,
          priority,
        });
        toast.success('Requirement / Epic updated');
      } else {
        await createSoftwareEpic({
          project_id: projectId,
          title,
          summary,
          prd_content: prdContent,
          status,
          priority,
        });
        toast.success('Software Requirement / Epic created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save specification'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <Zap size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {epic ? `Edit Epic: ${epic.key}` : 'New Software Requirement / Epic (PRD)'}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Requirements analysis, scope definition & acceptance criteria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Epic / Feature Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Next-Gen Real-time Collaborative Engine"
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text-primary)] focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EpicStatus)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-purple-500"
              >
                <option value="draft">Draft (Under Ideation)</option>
                <option value="in_review">In Review (Architecture / RFC)</option>
                <option value="approved">Approved for Development</option>
                <option value="in_progress">In Active Sprint</option>
                <option value="completed">Completed & Shipped</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-purple-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent / Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Executive Summary</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-line summary for leadership and stakeholders..."
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2 text-xs text-[var(--color-text-primary)] focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5 mb-1">
              <FileText size={14} /> Product Requirement Specification (PRD Markdown)
            </label>
            <textarea
              rows={10}
              value={prdContent}
              onChange={(e) => setPrdContent(e.target.value)}
              className="w-full font-mono text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : epic ? 'Update Specification' : 'Create Requirement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
