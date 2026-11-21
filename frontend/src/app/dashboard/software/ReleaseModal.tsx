'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Rocket, FileText } from 'lucide-react';
import { createSoftwareRelease, updateSoftwareRelease, errMsg } from '@/lib/api';
import type { SoftwareRelease, ReleaseStatus } from '@/lib/types';
import { Button } from '@/components/ui';

interface Props {
  projectId: number;
  release?: SoftwareRelease | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReleaseModal({ projectId, release, onClose, onSaved }: Props) {
  const [versionName, setVersionName] = useState(release?.version_name || '');
  const [description, setDescription] = useState(release?.description || '');
  const [releaseDate, setReleaseDate] = useState(release?.release_date ? release.release_date.slice(0, 10) : '');
  const [status, setStatus] = useState<ReleaseStatus>(release?.status || 'unreleased');
  const [releaseNotes, setReleaseNotes] = useState(
    release?.release_notes ||
`### What's New in this Release
- Added OAuth2 authentication provider
- Real-time event pipeline optimization
- Security hardening & CSRF mitigation

### Bug Fixes & Patches
- Resolved session token race condition
- Fixed kanban column drag rendering

### Deployment Checklist
- [x] Run database migrations
- [x] Verify environment secrets
- [x] Execute smoke tests`
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) {
      toast.error('Version name is required');
      return;
    }
    setSaving(true);
    try {
      if (release) {
        await updateSoftwareRelease(release.id, {
          version_name: versionName,
          description,
          release_date: releaseDate || null,
          status,
          release_notes: releaseNotes,
        });
        toast.success('Release updated');
      } else {
        await createSoftwareRelease({
          project_id: projectId,
          version_name: versionName,
          description,
          release_date: releaseDate || null,
          release_notes: releaseNotes,
        });
        toast.success('Release created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save release'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Rocket size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                {release ? `Edit Version: ${release.version_name}` : 'Create Software Release / Version'}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Release packaging, changelog notes, and deployment readiness
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Version Tag</label>
              <input
                type="text"
                required
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g. v1.2.0 or 2026.11-RC1"
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text-primary)] focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Release Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReleaseStatus)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:border-emerald-500"
              >
                <option value="unreleased">Unreleased (In Development)</option>
                <option value="released">Released / Deployed to Production</option>
                <option value="archived">Archived / Deprecated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Release Target Date</label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Release Summary</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Major enterprise auth & performance milestone"
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-2 text-xs text-[var(--color-text-primary)] focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5 mb-1">
              <FileText size={14} /> Release Notes & Changelog (Markdown)
            </label>
            <textarea
              rows={8}
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              className="w-full font-mono text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : release ? 'Update Release' : 'Publish Version'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
