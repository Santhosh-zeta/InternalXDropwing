'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Play } from 'lucide-react';
import { createSoftwareSprint, updateSoftwareSprint, errMsg } from '@/lib/api';
import type { SoftwareSprint, SprintStatus } from '@/lib/types';
import { Button } from '@/components/ui';

interface Props {
  projectId: number;
  sprint?: SoftwareSprint | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SprintModal({ projectId, sprint, onClose, onSaved }: Props) {
  const [name, setName] = useState(sprint?.name || '');
  const [goal, setGoal] = useState(sprint?.goal || '');
  const [startDate, setStartDate] = useState(sprint?.start_date ? sprint.start_date.slice(0, 10) : '');
  const [endDate, setEndDate] = useState(sprint?.end_date ? sprint.end_date.slice(0, 10) : '');
  const [status, setStatus] = useState<SprintStatus>(sprint?.status || 'planned');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Sprint name is required');
      return;
    }
    setSaving(true);
    try {
      if (sprint) {
        await updateSoftwareSprint(sprint.id, {
          name,
          goal,
          start_date: startDate || null,
          end_date: endDate || null,
          status,
        });
        toast.success('Sprint updated');
      } else {
        await createSoftwareSprint({
          project_id: projectId,
          name,
          goal,
          start_date: startDate || null,
          end_date: endDate || null,
        });
        toast.success('Sprint created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save sprint'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-400">
              <Play size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {sprint ? `Configure Sprint: ${sprint.name}` : 'Create Agile Sprint'}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Scrum iteration cadence, objectives and timeline
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

        <form onSubmit={handleSubmit} className="flex flex-col p-6 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Sprint Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 14 - OAuth & Core Engine"
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Sprint Goal</label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the key business outcome of this sprint?"
              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-xs text-[var(--color-text-primary)] focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-cyan-500"
              />
            </div>
          </div>

          {sprint && (
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Sprint Lifecycle Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SprintStatus)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:border-cyan-500"
              >
                <option value="planned">Planned (Grooming in Backlog)</option>
                <option value="active">Active (Sprint In Progress)</option>
                <option value="completed">Completed (Closed & Retro)</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : sprint ? 'Update Sprint' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
