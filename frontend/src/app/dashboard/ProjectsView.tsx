'use client';

import { useState } from 'react';
import { Briefcase, Plus, Search } from 'lucide-react';
import { getProjects, getUsers, getVentures } from '@/lib/api';
import { unwrapList, useApi } from '@/lib/useApi';
import type { Project } from '@/lib/types';
import type { User } from '@/lib/constants';
import { AsyncState, Button, EmptyState, Select, Skeleton, SkeletonCard } from '@/components/ui';
import ProjectBoard from './projects/ProjectBoard';
import ProjectForm from './projects/ProjectForm';
import { STATUSES } from './projects/constants';

function BoardSkeleton() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {STATUSES.map((s) => (
        <div key={s.id} className="flex w-[300px] shrink-0 flex-col gap-4 sm:w-[340px]">
          <Skeleton height={44} />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export default function ProjectsView({ currentUser }: { currentUser: User }) {
  const projects = useApi('projects', (s) => unwrapList(getProjects(s)), { toastOnError: 'auto' });
  // Only the form needs people, and only staff who can edit ever open it.
  const canCreate = currentUser.accessLevel <= 4;
  const canDelete = currentUser.accessLevel <= 3;
  const users = useApi(canCreate ? 'projects-users' : null, (s) => unwrapList(getUsers(s)));

  const [editing, setEditing] = useState<Project | null | undefined>(undefined); // undefined = closed, null = new
  const [search, setSearch] = useState('');
  const [venture, setVenture] = useState('all');
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'));

  const all = projects.data ?? [];
  // Global users pick a venture when creating, and may filter by it.
  const venturesApi = useApi(currentUser.accessLevel <= 2 ? 'ventures' : null, (sig) => unwrapList(getVentures(sig)));
  const ventures = venturesApi.data ?? [];

  const needle = search.trim().toLowerCase();
  const visible = all.filter(
    (p) =>
      (venture === 'all' || String(p.venture_id) === venture) &&
      (!needle || p.name.toLowerCase().includes(needle) || (p.description ?? '').toLowerCase().includes(needle)),
  );

  const newButton = (label: string) => (
    <Button variant="primary" leadingIcon={<Plus size={16} strokeWidth={2.5} aria-hidden="true" />} onClick={() => setEditing(null)}>{label}</Button>
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Projects</h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">Deliverables by phase, with their team, milestones and progress.</p>
          </div>
          {canCreate && newButton('New project')}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              aria-label="Filter projects by name or description"
              placeholder="Filter by name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-2.5 pl-10 pr-4 text-[13px] text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-purple-glow)]"
            />
          </div>
          {currentUser.accessLevel <= 2 && ventures.length > 1 && (
            <Select aria-label="Filter projects by venture" value={venture} onChange={(e) => setVenture(e.target.value)} className="h-auto w-auto min-w-44 py-2.5">
              <option value="all">All ventures</option>
              {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          )}
        </div>
      </div>

      <AsyncState loading={projects.loading} error={projects.error} onRetry={projects.refetch} what="projects" skeleton={<BoardSkeleton />}>
        {all.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={22} aria-hidden="true" />}
            title="No projects yet"
            description={canCreate ? 'Projects group tasks, milestones and the team behind a deliverable. Start one and it will appear on this board.' : 'You have not been added to a project yet. A manager can add you to one.'}
            action={canCreate ? newButton('Create the first project') : undefined}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Search size={22} aria-hidden="true" />}
            title="No projects match your filters"
            description="Nothing matches the current search or venture filter."
            action={<Button variant="secondary" onClick={() => { setSearch(''); setVenture('all'); }}>Clear filters</Button>}
          />
        ) : (
          <ProjectBoard projects={visible} today={today} onOpen={setEditing} />
        )}
      </AsyncState>

      {editing !== undefined && (
        <ProjectForm
          key={editing?.id ?? 'new'}
          project={editing}
          users={users.data ?? []}
          ventures={ventures}
          ownVentureId={currentUser.accessLevel <= 2 ? null : (currentUser.venture?.id ?? null)}
          canEdit={canCreate}
          canDelete={canDelete}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); projects.refetch(); }}
        />
      )}
    </div>
  );
}
